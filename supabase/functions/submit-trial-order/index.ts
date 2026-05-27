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
      .select("id, status, customer_id, trial_customers!inner(user_id, full_name, email, trial_doc_limit, trial_pages_per_doc_limit, trial_pages_limit, trial_single_doc_pages_limit)")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) throw new Error("order not found");
    const tc: any = (order as any).trial_customers;
    if (tc.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (order.status !== "draft") throw new Error("Pedido já enviado");

    const docLimit: number = tc.trial_doc_limit ?? 10;
    const multiDocPageLimit: number = tc.trial_pages_per_doc_limit ?? 3;
    const pagesLimit: number = tc.trial_pages_limit ?? 30;
    const singleDocPageLimit: number = tc.trial_single_doc_pages_limit ?? 30;

    const { data: files } = await supabase
      .from("trial_order_files")
      .select("id, pages, original_filename, kind")
      .eq("order_id", order_id);
    if (!files || files.length === 0) throw new Error("Adicione ao menos um arquivo");

    const sourceFiles = files.filter((f: any) => (f.kind ?? "source") === "source");

    // Already submitted docs/pages (excluding current draft)
    const { data: usedRows } = await supabase
      .from("trial_order_files")
      .select("pages, trial_orders!inner(status, customer_id)")
      .eq("trial_orders.customer_id", order.customer_id)
      .eq("kind", "source");
    const submitted = (usedRows ?? []).filter((r: any) => {
      const st = r.trial_orders?.status;
      return st && st !== "draft" && st !== "cancelled";
    });
    const docsUsed = submitted.length;
    const pagesUsed = submitted.reduce((s: number, r: any) => s + (r.pages ?? 0), 0);

    const docsAfter = docsUsed + sourceFiles.length;
    const pagesAfter = pagesUsed + sourceFiles.reduce((s: number, f: any) => s + (f.pages ?? 0), 0);

    // Total documents cap
    if (docsAfter > docLimit) {
      return new Response(
        JSON.stringify({
          error: "trial_doc_limit_exceeded",
          message: `Você atingiria ${docsAfter} de ${docLimit} documentos do trial. Remova ${docsAfter - docLimit} arquivo(s) e tente novamente.`,
          details: { docs_used: docsUsed, docs_in_order: sourceFiles.length, docs_limit: docLimit },
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Total pages cap
    if (pagesAfter > pagesLimit) {
      return new Response(
        JSON.stringify({
          error: "trial_total_pages_exceeded",
          message: `Você atingiria ${pagesAfter} de ${pagesLimit} páginas no total do trial. Reduza o volume e tente novamente.`,
          details: { pages_used: pagesUsed, pages_in_order: pagesAfter - pagesUsed, pages_limit: pagesLimit },
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Per-document page cap (conditional on total docs)
    const perDocCap = docsAfter <= 1 ? singleDocPageLimit : multiDocPageLimit;
    const overLimit = sourceFiles.filter((f: any) => (f.pages ?? 0) > perDocCap);
    if (overLimit.length > 0) {
      const msg = docsAfter <= 1
        ? `Como um único documento, o limite é ${singleDocPageLimit} páginas. Acima do limite: ${overLimit.map((f: any) => f.original_filename).join(", ")}`
        : `Quando há mais de um documento, cada um pode ter no máximo ${multiDocPageLimit} páginas (ou envie um único documento de até ${singleDocPageLimit} páginas). Acima do limite: ${overLimit.map((f: any) => f.original_filename).join(", ")}`;
      return new Response(
        JSON.stringify({
          error: "trial_page_limit_exceeded",
          message: msg,
          details: { per_doc_limit: perDocCap, docs_after: docsAfter, files: overLimit.map((f: any) => ({ name: f.original_filename, pages: f.pages })) },
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
          body: JSON.stringify({ event: "trial_order_submitted", order_id, customer: { user_id: tc.user_id, full_name: tc.full_name, email: tc.email } }),
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
