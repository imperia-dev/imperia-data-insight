import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ZApiMessageRequest {
  phone: string;
  message: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!UAZAPI_BASE_URL || !UAZAPI_TOKEN) {
      console.error("uazapiGO credentials not configured");
      return new Response(
        JSON.stringify({ error: "uazapiGO credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, message }: ZApiMessageRequest = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize phone number - remove all non-numeric characters
    const sanitizedPhone = phone.replace(/\D/g, "");
    
    // Validate Brazilian phone format (should start with 55 and have 12-13 digits)
    if (!sanitizedPhone.startsWith("55") || sanitizedPhone.length < 12 || sanitizedPhone.length > 13) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid phone format. Use Brazilian format: 5511999999999",
          details: "Phone must start with 55 (country code) followed by DDD and number"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentMessages } = await supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("table_name", "zapi_messages")
      .eq("operation", "send")
      .gte("created_at", oneHourAgo);

    if (recentMessages && recentMessages >= 20) {
      console.warn(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 20 messages per hour." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send message via uazapiGO
    const uazapiUrl = `${UAZAPI_BASE_URL}/send/text`;
    
    console.log(`Sending uazapiGO message to ${sanitizedPhone.substring(0, 4)}****`);

    const uazapiResponse = await fetch(uazapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "token": UAZAPI_TOKEN,
      },
      body: JSON.stringify({
        number: sanitizedPhone,
        text: message,
      }),
    });

    const uazapiResult = await uazapiResponse.json();

    // Log the attempt
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      table_name: "zapi_messages",
      operation: uazapiResponse.ok ? "send" : "send_failed",
      record_id: uazapiResult.messageId || null,
      accessed_fields: ["phone_masked", "message_length"],
    });

    if (!uazapiResponse.ok) {
      console.error("uazapiGO error response:", uazapiResult);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send message via uazapiGO",
          details: uazapiResult.message || "Unknown error"
        }),
        { status: uazapiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`uazapiGO message sent successfully. MessageId: ${uazapiResult.messageId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: uazapiResult.messageId,
        message: "Message sent successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-zapi-message:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
