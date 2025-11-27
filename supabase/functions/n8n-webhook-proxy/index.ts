import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { translationOrderId, AccountId } = await req.json();
    
    console.log('n8n-webhook-proxy - Recebido:', { translationOrderId, AccountId });

    // Call n8n webhook (server-to-server - no CORS issues)
    const n8nResponse = await fetch(
      "https://automations.lytech.global/webhook/45450e61-deeb-429e-b803-7c4419e6c138",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translationOrderId, AccountId }),
      }
    );
    
    const responseText = await n8nResponse.text();
    console.log('n8n-webhook-proxy - Status:', n8nResponse.status);
    console.log('n8n-webhook-proxy - Resposta:', responseText);
    
    // Try to parse JSON, fallback to raw text
    let data = {};
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }
    }
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: n8nResponse.status,
    });
  } catch (error) {
    console.error('n8n-webhook-proxy - Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
