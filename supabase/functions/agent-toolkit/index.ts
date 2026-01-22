import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["owner", "master", "admin"]);

const requestSchema = z.object({
  tool: z.string().min(1).max(64),
  args: z.record(z.unknown()).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const json = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { tool, args } = parsed.data;
    console.log("agent-toolkit", { tool, userId: user.id, role });

    // Tools iniciais (MVP). Todos retornam apenas agregados/sumários.
    if (tool === "get_orders_summary") {
      const { count: total, error: totalErr } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true });
      if (totalErr) throw totalErr;

      const { count: urgencies, error: urgErr } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("urgency", true);
      if (urgErr) throw urgErr;

      return new Response(
        JSON.stringify({ total_orders: total ?? 0, urgent_orders: urgencies ?? 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (tool === "get_pendencies_summary") {
      const { count: total, error: totalErr } = await supabase
        .from("pendencies")
        .select("id", { count: "exact", head: true });
      if (totalErr) throw totalErr;

      const { count: open, error: openErr } = await supabase
        .from("pendencies")
        .select("id", { count: "exact", head: true })
        .neq("status", "resolved");
      if (openErr) throw openErr;

      return new Response(
        JSON.stringify({ total_pendencies: total ?? 0, open_pendencies: open ?? 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (tool === "whoami") {
      return new Response(JSON.stringify({ user_id: user.id, role }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown tool" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("agent-toolkit error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
