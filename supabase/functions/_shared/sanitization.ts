/**
 * Sanitization utilities for Edge Functions (Deno runtime)
 * Since DOMPurify doesn't work in Deno, we use regex-based sanitization
 */

/**
 * Remove all HTML tags from text, keeping only content
 */
export function stripHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags and content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove style tags and content
    .replace(/<[^>]+>/g, '')                           // Remove all remaining HTML tags
    .replace(/&nbsp;/g, ' ')                           // Replace &nbsp; with space
    .replace(/&lt;/g, '<')                             // Decode &lt;
    .replace(/&gt;/g, '>')                             // Decode &gt;
    .replace(/&amp;/g, '&')                            // Decode &amp;
    .replace(/&quot;/g, '"')                           // Decode &quot;
    .replace(/&#39;/g, "'")                            // Decode &#39;
    .replace(/\s+/g, ' ')                              // Normalize whitespace
    .trim();
}

/**
 * Sanitize a string by removing potentially dangerous content
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return stripHtml(input);
}

/**
 * Sanitize an email address (basic validation + sanitization)
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';
  // Remove HTML and trim
  const cleaned = stripHtml(email).toLowerCase();
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : '';
}

/**
 * Sanitize a phone number (keep only digits and basic formatting)
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  // Remove everything except digits, spaces, hyphens, parentheses, and plus
  return phone.replace(/[^\d\s\-\(\)\+]/g, '').trim();
}

/**
 * Sanitize object values recursively
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldsToSanitize: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fieldsToSanitize) {
    if (typeof result[field] === 'string') {
      result[field] = sanitizeInput(result[field]) as T[keyof T];
    }
  }
  
  return result;
}
