import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { order_id, notes } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: order } = await supabase
      .from("trial_orders")
      .select("id, status, customer_id, trial_customers!inner(user_id, full_name, email)")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) throw new Error("order not found");
    if ((order as any).trial_customers.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (order.status !== "draft") throw new Error("Pedido já enviado");

    const { data: files } = await supabase.from("trial_order_files").select("id").eq("order_id", order_id);
    if (!files || files.length === 0) throw new Error("Adicione ao menos um arquivo");

    await supabase.from("trial_orders").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      notes: typeof notes === "string" ? notes.slice(0, 1000) : null,
    }).eq("id", order_id);

    // Fire webhook (best effort)
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}) },
          body: JSON.stringify({ event: "trial_order_submitted", order_id, customer: (order as any).trial_customers }),
        });
      } catch (e) {
        console.error("webhook failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
