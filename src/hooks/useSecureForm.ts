import { useForm, UseFormProps, FieldValues, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { sanitizeInput } from '@/lib/validations/sanitized';

/**
 * Hook para formulários seguros com sanitização automática.
 * 
 * Este hook estende react-hook-form com:
 * - Validação Zod obrigatória
 * - Sanitização automática de campos de texto no submit
 * - Logging de tentativas de injeção (apenas em desenvolvimento)
 * - Tratamento padronizado de erros
 * 
 * @example
 * ```tsx
 * const formSchema = z.object({
 *   name: sanitizedNameSchema,
 *   description: sanitizedDescriptionSchema,
 * });
 * 
 * const { form, handleSecureSubmit } = useSecureForm({
 *   schema: formSchema,
 *   defaultValues: { name: '', description: '' },
 *   onSubmit: async (data) => {
 *     // data já está sanitizado
 *     await saveToDatabase(data);
 *   },
 * });
 * ```
 */

interface UseSecureFormProps<T extends FieldValues, S extends z.ZodSchema<T>> {
  schema: S;
  defaultValues?: UseFormProps<T>['defaultValues'];
  onSubmit: (data: z.infer<S>) => Promise<void> | void;
  onError?: (error: Error) => void;
}

interface UseSecureFormReturn<T extends FieldValues> {
  form: UseFormReturn<T>;
  handleSecureSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
}

// Patterns that might indicate injection attempts
const INJECTION_PATTERNS = [
  /['";--]/g,                    // SQL injection characters
  /<script[^>]*>/gi,             // XSS script tags
  /javascript:/gi,               // JavaScript protocol
  /on\w+\s*=/gi,                 // Event handlers
  /\$\{.*\}/g,                   // Template literals
  /\{\{.*\}\}/g,                 // Template injection
];

function detectInjectionAttempt(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

function logPotentialInjection(fieldName: string, value: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[SECURITY] Potential injection attempt detected in field "${fieldName}":`, 
      value.substring(0, 100) + (value.length > 100 ? '...' : '')
    );
  }
}

function sanitizeFormData<T extends FieldValues>(data: T): T {
  const sanitized = { ...data };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // Detect potential injection before sanitizing
      if (detectInjectionAttempt(value)) {
        logPotentialInjection(key, value);
      }
      // Sanitize the value
      (sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      // Sanitize string arrays
      (sanitized as Record<string, unknown>)[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      (sanitized as Record<string, unknown>)[key] = sanitizeFormData(value as FieldValues);
    }
  }
  
  return sanitized;
}

export function useSecureForm<T extends FieldValues, S extends z.ZodSchema<T>>({
  schema,
  defaultValues,
  onSubmit,
  onError,
}: UseSecureFormProps<T, S>): UseSecureFormReturn<T> {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSecureSubmit = async (e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();
    
    try {
      // Validate with Zod schema (which already includes sanitization transforms)
      const isValid = await form.trigger();
      
      if (!isValid) {
        const firstError = Object.values(form.formState.errors)[0];
        if (firstError?.message && typeof firstError.message === 'string') {
          toast.error(firstError.message);
        }
        return;
      }
      
      // Get form values and apply additional sanitization layer
      const values = form.getValues();
      const sanitizedData = sanitizeFormData(values);
      
      // Execute the submit handler
      await onSubmit(sanitizedData as z.infer<S>);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Erro ao processar formulário');
      
      if (onError) {
        onError(err);
      } else {
        toast.error(err.message || 'Erro ao processar formulário');
      }
      
      if (import.meta.env.DEV) {
        console.error('[FORM ERROR]', err);
      }
    }
  };

  return {
    form,
    handleSecureSubmit,
    isSubmitting: form.formState.isSubmitting,
  };
}

/**
 * Utility to create a secure form schema with common sanitized fields
 */
export function createSecureSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

/**
 * Pre-configured field schemas for common use cases
 */
export { 
  sanitizedTextSchema,
  sanitizedNameSchema,
  sanitizedDescriptionSchema,
  sanitizedDescriptionRequiredSchema,
  sanitizedRichTextSchema,
  sanitizedTitleSchema,
  sanitizedOptionalMessageSchema,
  sanitizedDocumentRefSchema,
  sanitizedSubcategorySchema,
} from '@/lib/validations/sanitized';
