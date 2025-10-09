import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Security headers para todas as Edge Functions
 * Implementa CORS restritivo e headers de segurança
 */
export const securityHeaders = {
  'Access-Control-Allow-Origin': 'https://agttqqaampznczkyfvkf.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
};

/**
 * Headers CORS para desenvolvimento (mais permissivos)
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Valida payload usando schema Zod
 * @throws {Error} Se validação falhar
 */
export function validatePayload<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation error: ${messages}`);
    }
    throw error;
  }
}

/**
 * Valida tamanho do payload
 */
export function validatePayloadSize(payload: string, maxSizeMB = 10): void {
  const sizeInMB = new Blob([payload]).size / (1024 * 1024);
  if (sizeInMB > maxSizeMB) {
    throw new Error(`Payload too large: ${sizeInMB.toFixed(2)}MB (max: ${maxSizeMB}MB)`);
  }
}

/**
 * Schema comum para requisições com paginação
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

/**
 * Schema para UUID
 */
export const uuidSchema = z.string().uuid();

/**
 * Schema para email
 */
export const emailSchema = z.string().email().max(255);

/**
 * Sanitiza string removendo caracteres perigosos
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 10000); // Limita tamanho
}

/**
 * Rate limiting simples em memória (usar Redis em produção)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(identifier);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count++;
  return true;
}

/**
 * Limpa rate limits antigos (chamar periodicamente)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}
