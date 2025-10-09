import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit configuration (max requests, window in seconds)
const RATE_LIMITS: Record<string, { max: number; windowSeconds: number }> = {
  '/auth/login': { max: 10, windowSeconds: 60 },
  '/auth/signup': { max: 5, windowSeconds: 60 },
  '/api/*': { max: 60, windowSeconds: 60 },
  '/upload/*': { max: 5, windowSeconds: 60 },
  'default': { max: 100, windowSeconds: 60 }
};

function getRateLimitConfig(path: string) {
  if (RATE_LIMITS[path]) {
    return RATE_LIMITS[path];
  }
  
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname;
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const authorization = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authorization) {
      const token = authorization.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    
    const identifier = userId || clientIp;
    const config = getRateLimitConfig(path);
    
    // Usar função do banco para verificar rate limit
    const { data, error } = await supabase.rpc('check_rate_limit_v2', {
      p_identifier: identifier,
      p_endpoint: path,
      p_max_requests: config.max,
      p_window_seconds: config.windowSeconds
    });

    if (error) {
      console.error('Rate limit check error:', error);
      throw error;
    }

    const result = data as {
      allowed: boolean;
      remaining: number;
      reset_at: string;
      reason?: string;
      blocked_until?: string;
    };

    if (!result.allowed) {
      // Log violação
      await supabase.from('security_events').insert({
        event_type: 'rate_limit_exceeded',
        severity: 'warning',
        user_id: userId,
        ip_address: clientIp,
        details: {
          path,
          limit: config.max,
          window_seconds: config.windowSeconds,
          reason: result.reason
        }
      });

      const retryAfter = result.blocked_until 
        ? Math.ceil((new Date(result.blocked_until).getTime() - Date.now()) / 1000)
        : config.windowSeconds;

      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retry_after: retryAfter,
          reason: result.reason
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset_at
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        rate_limit: {
          limit: config.max,
          remaining: result.remaining,
          reset_at: result.reset_at
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': result.reset_at
        }
      }
    );
  } catch (error) {
    console.error('Rate limiter error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});