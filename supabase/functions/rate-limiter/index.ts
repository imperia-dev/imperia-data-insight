import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configuration
const RATE_LIMITS = {
  '/auth/login': { max: 10, windowMs: 60000 }, // 10 requests per minute
  '/auth/signup': { max: 5, windowMs: 60000 }, // 5 requests per minute
  '/api/*': { max: 60, windowMs: 60000 }, // 60 requests per minute
  '/upload/*': { max: 5, windowMs: 60000 }, // 5 uploads per minute
  'default': { max: 100, windowMs: 60000 } // 100 requests per minute default
};

// In-memory store for rate limiting (consider using Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

function getRateLimitConfig(path: string) {
  // Check for exact match first
  if (RATE_LIMITS[path as keyof typeof RATE_LIMITS]) {
    return RATE_LIMITS[path as keyof typeof RATE_LIMITS];
  }
  
  // Check for wildcard patterns
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      if (regex.test(path)) {
        return config;
      }
    }
  }
  
  return RATE_LIMITS.default;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Get user ID from authorization header if available
    const authorization = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authorization) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const token = authorization.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    
    // Create rate limit key (IP + path or userId + path)
    const rateLimitKey = userId ? `${userId}:${path}` : `${clientIp}:${path}`;
    const config = getRateLimitConfig(path);
    const now = Date.now();
    
    // Check rate limit
    let entry = rateLimitStore.get(rateLimitKey);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + config.windowMs
      };
      rateLimitStore.set(rateLimitKey, entry);
    } else {
      // Increment count
      entry.count++;
      
      // Check if limit exceeded
      if (entry.count > config.max) {
        // Log rate limit violation
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase.from('security_events').insert({
          event_type: 'rate_limit_exceeded',
          severity: 'warning',
          user_id: userId,
          ip_address: clientIp,
          details: {
            path,
            limit: config.max,
            window_ms: config.windowMs,
            attempts: entry.count
          }
        });
        
        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            retry_after: Math.ceil((entry.resetTime - now) / 1000)
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000)),
              'X-RateLimit-Limit': String(config.max),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(entry.resetTime)
            }
          }
        );
      }
    }
    
    // Return rate limit headers with success
    return new Response(
      JSON.stringify({
        success: true,
        rate_limit: {
          limit: config.max,
          remaining: config.max - entry.count,
          reset: entry.resetTime
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': String(config.max - entry.count),
          'X-RateLimit-Reset': String(entry.resetTime)
        }
      }
    );
  } catch (error) {
    console.error('Rate limiter error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});