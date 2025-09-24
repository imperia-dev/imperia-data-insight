import { z } from 'zod';

// File validation
export const fileSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
}).refine((file) => {
  // Max 20MB
  return file.size <= 20 * 1024 * 1024;
}, 'Arquivo deve ter no máximo 20MB');

// Allowed file types for documents
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Allowed image types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Document upload schema
export const documentUploadSchema = z.object({
  file: fileSchema.refine((file) => {
    return ALLOWED_DOCUMENT_TYPES.includes(file.type);
  }, 'Tipo de arquivo não permitido'),
  category: z
    .string()
    .trim()
    .min(1, 'Categoria é obrigatória')
    .max(50, 'Categoria muito longa'),
  description: z
    .string()
    .trim()
    .max(500, 'Descrição muito longa')
    .optional(),
});

// Image upload schema
export const imageUploadSchema = z.object({
  file: fileSchema.refine((file) => {
    return ALLOWED_IMAGE_TYPES.includes(file.type);
  }, 'Apenas imagens são permitidas'),
  alt: z
    .string()
    .trim()
    .min(1, 'Texto alternativo é obrigatório')
    .max(200, 'Texto alternativo muito longo'),
});

// Order schema
export const orderSchema = z.object({
  order_number: z
    .string()
    .trim()
    .min(1, 'Número do pedido é obrigatório')
    .max(50, 'Número do pedido muito longo')
    .regex(/^[A-Z0-9-]+$/, 'Formato inválido'),
  document_count: z
    .number()
    .int('Deve ser um número inteiro')
    .positive('Deve ser positivo')
    .max(9999, 'Valor muito alto'),
  urgent_document_count: z
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo')
    .max(9999, 'Valor muito alto')
    .optional(),
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Data e hora inválidas'),
  account_ID: z
    .string()
    .trim()
    .max(100, 'ID da conta muito longo')
    .optional(),
  service_order_link: z
    .string()
    .trim()
    .url('Link inválido')
    .max(500, 'Link muito longo')
    .optional(),
});

// Pendency schema
export const pendencySchema = z.object({
  c4u_id: z
    .string()
    .trim()
    .min(1, 'ID C4U é obrigatório')
    .max(50, 'ID C4U muito longo'),
  description: z
    .string()
    .trim()
    .min(10, 'Descrição muito curta')
    .max(1000, 'Descrição muito longa'),
  error_type: z
    .string()
    .trim()
    .min(1, 'Tipo de erro é obrigatório')
    .max(100, 'Tipo de erro muito longo'),
  error_document_count: z
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo')
    .max(9999, 'Valor muito alto'),
  treatment: z
    .string()
    .trim()
    .max(1000, 'Tratamento muito longo')
    .optional(),
  old_order_text_id: z
    .string()
    .trim()
    .max(50, 'ID do pedido antigo muito longo')
    .optional(),
});

// Document assignment schema
export const documentAssignmentSchema = z.object({
  document_name: z
    .string()
    .trim()
    .min(1, 'Nome do documento é obrigatório')
    .max(255, 'Nome do documento muito longo'),
  client_name: z
    .string()
    .trim()
    .min(1, 'Nome do cliente é obrigatório')
    .max(255, 'Nome do cliente muito longo'),
  project_name: z
    .string()
    .trim()
    .max(255, 'Nome do projeto muito longo')
    .optional(),
  assigned_to: z
    .string()
    .uuid('ID do usuário inválido')
    .optional(),
  word_count: z
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo')
    .max(999999, 'Valor muito alto')
    .optional(),
  pages: z
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo')
    .max(9999, 'Valor muito alto')
    .optional(),
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Data e hora inválidas')
    .optional(),
  payment_amount: z
    .number()
    .positive('Valor deve ser positivo')
    .max(999999.99, 'Valor muito alto')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notas muito longas')
    .optional(),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type PendencyInput = z.infer<typeof pendencySchema>;
export type DocumentAssignmentInput = z.infer<typeof documentAssignmentSchema>;