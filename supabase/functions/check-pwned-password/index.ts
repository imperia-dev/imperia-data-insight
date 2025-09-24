import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for pwned password hashes (TTL: 1 hour)
const cache = new Map<string, { count: number; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

async function sha1Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function checkPwnedPassword(password: string): Promise<{ isPwned: boolean; count: number }> {
  try {
    // Generate SHA-1 hash of the password
    const hash = await sha1Hash(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    // Check cache first
    const cacheKey = `pwned_${hash}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { isPwned: cached.count > 0, count: cached.count };
    }
    
    // Query Have I Been Pwned API using k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'Imperia-Security-Check',
        'Add-Padding': 'true', // Add padding to responses for additional privacy
      },
    });
    
    if (!response.ok) {
      console.error('HIBP API error:', response.status);
      // In case of API error, we don't block the user
      return { isPwned: false, count: 0 };
    }
    
    const text = await response.text();
    const hashes = text.split('\r\n');
    
    // Search for our hash suffix in the response
    for (const hashLine of hashes) {
      const [hashSuffix, count] = hashLine.split(':');
      if (hashSuffix === suffix) {
        const occurrences = parseInt(count, 10);
        // Cache the result
        cache.set(cacheKey, { count: occurrences, timestamp: Date.now() });
        return { isPwned: true, count: occurrences };
      }
    }
    
    // Password not found in breach database
    cache.set(cacheKey, { count: 0, timestamp: Date.now() });
    return { isPwned: false, count: 0 };
  } catch (error) {
    console.error('Error checking pwned password:', error);
    // Don't block user on error
    return { isPwned: false, count: 0 };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    
    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Check if password has been pwned
    const result = await checkPwnedPassword(password);
    
    // Log the check (without the actual password)
    console.log('Password check performed:', {
      isPwned: result.isPwned,
      count: result.count,
      timestamp: new Date().toISOString(),
    });
    
    return new Response(
      JSON.stringify({
        isPwned: result.isPwned,
        count: result.count,
        message: result.isPwned 
          ? `Esta senha foi encontrada ${result.count.toLocaleString()} vezes em vazamentos de dados. Por favor, escolha uma senha diferente.`
          : 'Senha segura - não encontrada em vazamentos conhecidos.',
        severity: result.isPwned ? (result.count > 1000 ? 'critical' : 'warning') : 'safe',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Check pwned password error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});