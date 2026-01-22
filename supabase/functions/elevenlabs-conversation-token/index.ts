import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["owner", "master", "admin"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const elevenApiKey = Deno.env.get("ELEVENLABS_API_KEY")!;
    const agentId = Deno.env.get("ELEVENLABS_AGENT_ID")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validar JWT (mesmo com verify_jwt=true, isso nos dá o userId com segurança)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (roleError) {
      console.error("Role lookup error:", roleError);
      return new Response(JSON.stringify({ error: "Failed to resolve user role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role = roleRow?.role;
    if (!role || !ALLOWED_ROLES.has(role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Conversational AI token (WebRTC)
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      {
        headers: {
          "xi-api-key": elevenApiKey,
        },
      },
    );

    const elJson = await elRes.json().catch(() => ({}));
    if (!elRes.ok || !elJson?.token) {
      console.error("ElevenLabs token error:", elRes.status, elJson);

      const details = (elJson as any)?.detail;
      const missingPerm = details?.status === "missing_permissions";
      const missingPermMessage = typeof details?.message === "string"
        ? details.message
        : undefined;

      return new Response(
        JSON.stringify({
          error: "Failed to generate ElevenLabs token",
          elevenlabs_status: details?.status ?? elRes.status,
          elevenlabs_message: missingPerm
            ? (missingPermMessage ?? "Missing permissions for ConvAI")
            : (missingPermMessage ?? undefined),
          hint: missingPerm
            ? "Your ElevenLabs API key must include permission convai_write. Update the ElevenLabs connector key (ELEVENLABS_API_KEY)."
            : undefined,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ token: elJson.token }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("elevenlabs-conversation-token error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
