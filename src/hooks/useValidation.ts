import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';

interface ValidationResult<T> {
  data: T | null;
  errors: Record<string, string>;
  isValid: boolean;
}

export function useValidation<T extends z.ZodSchema>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validate = (data: unknown): ValidationResult<z.infer<T>> => {
    try {
      const validatedData = schema.parse(data);
      setErrors({});
      return {
        data: validatedData,
        errors: {},
        isValid: true,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!fieldErrors[path]) {
            fieldErrors[path] = err.message;
          }
        });
        
        setErrors(fieldErrors);
        
        // Show first error in toast
        const firstError = error.errors[0];
        if (firstError) {
          toast.error(firstError.message);
        }
        
        return {
          data: null,
          errors: fieldErrors,
          isValid: false,
        };
      }
      
      // Non-validation error
      console.error('Unexpected validation error:', error);
      toast.error('Erro inesperado na validação');
      
      return {
        data: null,
        errors: { general: 'Erro inesperado' },
        isValid: false,
      };
    }
  };
  
  const validateField = (fieldName: string, value: unknown): string | null => {
    try {
      // Try to validate just this field
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape as Record<string, z.ZodSchema>;
        const fieldSchema = shape[fieldName];
        if (fieldSchema) {
          fieldSchema.parse(value);
        }
      }
      
      // Clear error for this field
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Campo inválido';
        
        // Update error for this field
        setErrors((prev) => ({
          ...prev,
          [fieldName]: errorMessage,
        }));
        
        return errorMessage;
      }
      
      return 'Erro de validação';
    }
  };
  
  const clearErrors = () => {
    setErrors({});
  };
  
  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };
  
  return {
    validate,
    validateField,
    errors,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
  };
}