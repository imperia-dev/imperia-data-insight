import { z } from 'zod';

// CPF validation
export const cpfSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
  .transform((val) => val.replace(/\D/g, ''));

// CNPJ validation
export const cnpjSchema = z
  .string()
  .trim()
  .regex(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido')
  .transform((val) => val.replace(/\D/g, ''));

// PIX key validation
export const pixKeySchema = z
  .string()
  .trim()
  .min(1, 'Chave PIX é obrigatória')
  .max(77, 'Chave PIX inválida')
  .refine((val) => {
    // Email PIX
    if (val.includes('@')) {
      return z.string().email().safeParse(val).success;
    }
    // Phone PIX
    if (/^\+?\d{10,15}$/.test(val.replace(/\D/g, ''))) {
      return true;
    }
    // CPF/CNPJ PIX
    if (/^\d{11}$/.test(val.replace(/\D/g, '')) || /^\d{14}$/.test(val.replace(/\D/g, ''))) {
      return true;
    }
    // Random key (UUID format)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
      return true;
    }
    return false;
  }, 'Formato de chave PIX inválido');

// Phone validation
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+55\s?)?(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/, 'Telefone inválido')
  .transform((val) => val.replace(/\D/g, ''));

// Amount validation
export const amountSchema = z
  .number()
  .positive('Valor deve ser positivo')
  .max(999999999.99, 'Valor muito alto')
  .refine((val) => {
    const decimals = val.toString().split('.')[1];
    return !decimals || decimals.length <= 2;
  }, 'Máximo de 2 casas decimais');

// Service provider cost schema
export const serviceProviderCostSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome é obrigatório')
    .max(255, 'Nome muito longo'),
  email: z
    .string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  cpf: cpfSchema.optional(),
  cnpj: cnpjSchema.optional(),
  phone: phoneSchema.optional(),
  pix_key: pixKeySchema,
  type: z.enum(['PJ', 'PF'], {
    errorMap: () => ({ message: 'Tipo deve ser PJ ou PF' }),
  }),
  competence: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
  amount: amountSchema,
  invoice_number: z
    .string()
    .trim()
    .max(50, 'Número da nota muito longo')
    .optional(),
  days_worked: z
    .number()
    .int('Deve ser um número inteiro')
    .min(0, 'Não pode ser negativo')
    .max(31, 'Máximo de 31 dias')
    .optional(),
}).refine((data) => {
  // Pelo menos CPF ou CNPJ deve ser fornecido
  return !!(data.cpf || data.cnpj);
}, {
  message: 'CPF ou CNPJ é obrigatório',
  path: ['cpf'],
});

// Company cost schema
export const companyCostSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  amount: amountSchema,
  category: z
    .string()
    .trim()
    .min(1, 'Categoria é obrigatória')
    .max(100, 'Categoria muito longa'),
  sub_category: z
    .string()
    .trim()
    .max(100, 'Subcategoria muito longa')
    .optional(),
  description: z
    .string()
    .trim()
    .min(3, 'Descrição muito curta')
    .max(500, 'Descrição muito longa'),
  observations: z
    .string()
    .trim()
    .max(1000, 'Observações muito longas')
    .optional(),
});

// Financial entry schema
export const financialEntrySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  type: z.enum(['revenue', 'expense', 'tax'], {
    errorMap: () => ({ message: 'Tipo inválido' }),
  }),
  category: z
    .string()
    .trim()
    .min(1, 'Categoria é obrigatória')
    .max(100, 'Categoria muito longa'),
  subcategory: z
    .string()
    .trim()
    .max(100, 'Subcategoria muito longa')
    .optional(),
  description: z
    .string()
    .trim()
    .min(3, 'Descrição muito curta')
    .max(500, 'Descrição muito longa'),
  amount: amountSchema,
  tax_amount: amountSchema.optional(),
  payment_method: z
    .string()
    .trim()
    .max(50, 'Método de pagamento muito longo')
    .optional(),
  document_ref: z
    .string()
    .trim()
    .max(100, 'Referência do documento muito longa')
    .optional(),
});

export type ServiceProviderCostInput = z.infer<typeof serviceProviderCostSchema>;
export type CompanyCostInput = z.infer<typeof companyCostSchema>;
export type FinancialEntryInput = z.infer<typeof financialEntrySchema>;