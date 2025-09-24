// Security headers middleware configuration
export const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// Content Security Policy configuration
export const getCSP = (nonce?: string) => {
  const supabaseUrl = 'https://agttqqaampznczkyfvkf.supabase.co';
  const allowedDomains = [
    'https://imperia-suite.lovable.app',
    'https://id-preview--414fc41e-176f-45f7-9f94-7be36a4ca341.lovable.app',
    'http://localhost:8080',
    'http://localhost:5173'
  ];

  const directives = {
    'default-src': ["'self'"],
    'script-src': nonce ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"] : ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"], // Required for Tailwind
    'img-src': ["'self'", 'data:', 'blob:', supabaseUrl],
    'connect-src': ["'self'", supabaseUrl, ...allowedDomains],
    'font-src': ["'self'", 'data:'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"]
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};

// Rate limiting configuration
export const rateLimitConfig = {
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60 // 60 requests per minute
  },
  auth: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 requests per minute for auth endpoints
  },
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 5 // 5 uploads per minute
  }
};