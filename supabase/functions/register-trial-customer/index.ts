import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  full_name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(255).toLowerCase(),
  phone: z.string().trim().min(8).max(30),
  company: z.string().trim().max(120).optional().nullable(),
  cpf_cnpj: z.string().trim().max(20).optional().nullable(),
  password: z.string().min(8).max(72),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    const data = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Block if already a trial customer for this email
    const { data: existing } = await admin
      .from("trial_customers")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Já existe um cadastro com este e-mail." }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Create auth user (auto-confirm so they can log in after approval without verification email)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, source: "trial_portal" },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message || "Falha ao criar conta";
      const status = msg.toLowerCase().includes("already") ? 409 : 400;
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = created.user.id;

    const { error: insertErr } = await admin.from("trial_customers").insert({
      user_id: userId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      company: data.company || null,
      cpf_cnpj: data.cpf_cnpj || null,
    });

    if (insertErr) {
      // Rollback auth user to keep state consistent
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("[register-trial-customer]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
