import { z } from 'zod';
import DOMPurify from 'dompurify';

/**
 * Schemas de validação com sanitização integrada para prevenir XSS e injeção de código.
 * Usar estes schemas em todos os formulários que aceitam entrada de texto do usuário.
 */

// Helper para remover TODO HTML de texto simples
const stripAllHtml = (text: string): string => {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).trim();
};

// Helper para sanitizar HTML permitindo apenas formatação básica
const sanitizeRichText = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'style'],
  });
};

/**
 * Schema para texto simples - remove TODO HTML
 * Uso: campos de texto curtos como nomes, títulos, etc.
 */
export const sanitizedTextSchema = z
  .string()
  .trim()
  .transform(stripAllHtml);

/**
 * Schema para nomes próprios - permite acentos, remove HTML
 * Uso: nomes de pessoas, empresas, etc.
 */
export const sanitizedNameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter no mínimo 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')
  .transform(stripAllHtml)
  .refine(
    (name) => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(name),
    'Nome contém caracteres inválidos'
  );

/**
 * Schema para descrições longas - remove HTML perigoso
 * Uso: campos de descrição, observações, etc.
 */
export const sanitizedDescriptionSchema = z
  .string()
  .trim()
  .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
  .transform(stripAllHtml);

/**
 * Schema para descrições com tamanho mínimo
 * Uso: campos que requerem descrição mínima
 */
export const sanitizedDescriptionRequiredSchema = z
  .string()
  .trim()
  .min(10, 'Descrição deve ter no mínimo 10 caracteres')
  .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
  .transform(stripAllHtml);

/**
 * Schema para conteúdo rico - permite HTML básico de formatação
 * Uso: editores de texto rico, conteúdo com formatação
 */
export const sanitizedRichTextSchema = z
  .string()
  .trim()
  .min(10, 'Conteúdo deve ter no mínimo 10 caracteres')
  .max(10000, 'Conteúdo deve ter no máximo 10000 caracteres')
  .transform(sanitizeRichText);

/**
 * Schema para títulos - texto simples com limite de tamanho
 * Uso: títulos de avisos, posts, etc.
 */
export const sanitizedTitleSchema = z
  .string()
  .trim()
  .min(3, 'Título deve ter no mínimo 3 caracteres')
  .max(200, 'Título deve ter no máximo 200 caracteres')
  .transform(stripAllHtml);

/**
 * Schema para mensagens opcionais - sanitiza se presente
 * Uso: campos de mensagem, comentários opcionais
 */
export const sanitizedOptionalMessageSchema = z
  .string()
  .trim()
  .max(2000, 'Mensagem deve ter no máximo 2000 caracteres')
  .transform(stripAllHtml)
  .optional()
  .or(z.literal(''));

/**
 * Schema para referências de documentos
 * Uso: números de NF, protocolos, recibos
 */
export const sanitizedDocumentRefSchema = z
  .string()
  .trim()
  .max(100, 'Referência deve ter no máximo 100 caracteres')
  .transform(stripAllHtml)
  .optional()
  .or(z.literal(''));

/**
 * Schema para subcategorias
 * Uso: campos de subcategoria em formulários
 */
export const sanitizedSubcategorySchema = z
  .string()
  .trim()
  .max(100, 'Subcategoria deve ter no máximo 100 caracteres')
  .transform(stripAllHtml)
  .optional()
  .or(z.literal(''));

/**
 * Função utilitária para sanitizar input antes de enviar ao banco
 * Uso direto quando não usar schema de validação
 */
export function sanitizeInput(input: string): string {
  return stripAllHtml(input);
}

/**
 * Função utilitária para sanitizar rich text
 */
export function sanitizeRichTextInput(input: string): string {
  return sanitizeRichText(input);
}

// Tipos exportados
export type SanitizedText = z.infer<typeof sanitizedTextSchema>;
export type SanitizedName = z.infer<typeof sanitizedNameSchema>;
export type SanitizedDescription = z.infer<typeof sanitizedDescriptionSchema>;
export type SanitizedRichText = z.infer<typeof sanitizedRichTextSchema>;
export type SanitizedTitle = z.infer<typeof sanitizedTitleSchema>;
