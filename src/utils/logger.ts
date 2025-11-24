/**
 * Secure Logger - Remove all sensitive data logging in production
 * Only logs to console in development, sanitizes all sensitive data
 */

const isDevelopment = import.meta.env.DEV;

// List of sensitive keys that should never be logged
const SENSITIVE_KEYS = [
  'password', 'senha', 'token', 'secret', 'api_key', 'apikey',
  'cpf', 'cnpj', 'pix', 'pix_key', 'email', 'phone', 'telefone',
  'credit_card', 'card_number', 'cvv', 'session', 'auth',
  'user_id', 'id', 'access_token', 'refresh_token'
];

/**
 * Sanitizes an object by removing or masking sensitive data
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  if (typeof data === 'string') {
    // Don't log long strings that might contain sensitive data
    return data.length > 100 ? '[REDACTED - Long String]' : data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive information
      if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Safe logger that only works in development and sanitizes sensitive data
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args.map(sanitizeData));
    }
  },

  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(message, error ? sanitizeData(error) : '');
    } else {
      // In production, only log to external service (e.g., Sentry)
      // For now, we'll just silently fail
      // TODO: Implement external error tracking
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args.map(sanitizeData));
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args.map(sanitizeData));
    }
  },

  // Special method for debugging that ONLY works in development
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args.map(sanitizeData));
    }
  }
};

/**
 * Log security events to audit log (always happens, even in production)
 */
export async function logSecurityEvent(
  eventType: string,
  details: any
) {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase.rpc('log_security_event', {
      p_event_type: eventType,
      p_severity: 'info',
      p_details: sanitizeData(details)
    });
  } catch (error) {
    // Silently fail - don't log security logging failures
  }
}
