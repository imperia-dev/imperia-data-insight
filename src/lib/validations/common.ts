import { z } from 'zod';
import DOMPurify from 'dompurify';

// URL validation
export const urlSchema = z
  .string()
  .trim()
  .url('URL inválida')
  .max(2048, 'URL muito longa')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL deve usar protocolo HTTP ou HTTPS');

// Safe HTML validation (sanitizes HTML)
export const safeHtmlSchema = z
  .string()
  .transform((html) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });
  });

// UUID validation
export const uuidSchema = z
  .string()
  .trim()
  .uuid('ID inválido');

// Date validation
export const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Data inválida');

// Datetime validation
export const datetimeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Data e hora devem estar no formato ISO')
  .refine((datetime) => {
    const parsed = new Date(datetime);
    return !isNaN(parsed.getTime());
  }, 'Data e hora inválidas');

// Pagination schema
export const paginationSchema = z.object({
  page: z
    .number()
    .int('Página deve ser um número inteiro')
    .positive('Página deve ser positiva')
    .default(1),
  limit: z
    .number()
    .int('Limite deve ser um número inteiro')
    .positive('Limite deve ser positivo')
    .max(100, 'Limite máximo de 100 itens')
    .default(20),
  sortBy: z
    .string()
    .trim()
    .max(50, 'Campo de ordenação muito longo')
    .optional(),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
});

// Search schema
export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Busca deve ter no mínimo 2 caracteres')
    .max(100, 'Busca muito longa')
    .transform((query) => {
      // Remove special characters that could break search
      return query.replace(/[<>'"]/g, '');
    }),
  filters: z
    .record(z.string(), z.any())
    .optional(),
});

// ID array schema (for bulk operations)
export const idArraySchema = z
  .array(uuidSchema)
  .min(1, 'Pelo menos um ID deve ser fornecido')
  .max(100, 'Máximo de 100 IDs por operação');

// Export CSV schema
export const exportCsvSchema = z.object({
  fields: z
    .array(z.string().trim().max(50))
    .min(1, 'Pelo menos um campo deve ser selecionado')
    .max(50, 'Máximo de 50 campos'),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
});

// SQL injection prevention helper
export const sanitizeSqlIdentifier = (identifier: string): string => {
  // Remove any character that's not alphanumeric or underscore
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
};

// XSS prevention helper
export const sanitizeUserInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type ExportCsvInput = z.infer<typeof exportCsvSchema>;