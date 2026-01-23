import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["owner", "master", "admin"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAuthAndRole(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      ok: false as const,
      response: jsonResponse({ error: "Missing Authorization header" }, 401),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    console.error("Auth error:", userError);
    return {
      ok: false as const,
      response: jsonResponse({ error: "Invalid authentication" }, 401),
    };
  }

  const user = userData.user;
  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (roleError) {
    console.error("Role lookup error:", roleError);
    return {
      ok: false as const,
      response: jsonResponse({ error: "Failed to resolve user role" }, 500),
    };
  }

  const role = roleRow?.role;
  if (!role || !ALLOWED_ROLES.has(role)) {
    return {
      ok: false as const,
      response: jsonResponse({ error: "Forbidden" }, 403),
    };
  }

  return { ok: true as const, supabase, user, role };
}

const bodySchema = z.object({
  companyId: z.string().uuid(),
  objective: z.string().min(3).max(500),
  campaignTheme: z.string().max(500).nullable().optional(),
  cta: z.string().min(2).max(200),
  format: z.string().min(2).max(50).default("feed"),
  quantity: z.number().int().min(1).max(20),
});

type CreativeDraft = {
  headline: string;
  subheadline?: string;
  bullets: string[];
  caption: string;
  hashtags: string[];
  rationale?: string;
};

function safeExtractJsonArray(text: string): unknown {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuthAndRole(req);
    if (!auth.ok) return auth.response;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return jsonResponse({ error: "Missing OPENAI_API_KEY secret" }, 500);

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }

    const { companyId, objective, campaignTheme, cta, format, quantity } = parsed.data;

    // 1) Create generation row
    const { data: gen, error: genErr } = await auth.supabase
      .from("generations")
      .insert({
        company_id: companyId,
        user_id: auth.user.id,
        objective,
        campaign_theme: campaignTheme ?? null,
        cta,
        format,
        quantity_requested: quantity,
        status: "generating",
      })
      .select("*")
      .single();

    if (genErr) {
      console.error("Insert generation error:", genErr);
      return jsonResponse({ error: "Failed to create generation" }, 500);
    }

    console.log("studio-generate-text:start", {
      userId: auth.user.id,
      role: auth.role,
      companyId,
      generationId: gen.id,
      quantity,
      format,
    });

    // 2) Generate drafts
    const system =
      "Você é um estrategista de marketing e copywriter. Gere ideias e textos para criativos de Instagram. Seja direto, em PT-BR, sem promessas ilegais. Retorne SOMENTE JSON válido.";

    const userPrompt =
      `Crie ${quantity} variações de criativos para Instagram no formato '${format}'.\n` +
      `Objetivo: ${objective}\n` +
      (campaignTheme ? `Tema: ${campaignTheme}\n` : "") +
      `CTA: ${cta}\n\n` +
      "Responda com um array JSON de objetos, cada objeto com as chaves:\n" +
      "headline (string), subheadline (string opcional), bullets (array de 3 a 5 strings), caption (string), hashtags (array de 5 a 12 strings), rationale (string opcional).";

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 1400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      console.error("OpenAI error", openaiRes.status, errText);
      await auth.supabase
        .from("generations")
        .update({ status: "failed", error_message: `OpenAI error ${openaiRes.status}` })
        .eq("id", gen.id);
      return jsonResponse({ error: "Falha ao gerar textos", status: openaiRes.status }, 502);
    }

    const payload = await openaiRes.json();
    const content = payload?.choices?.[0]?.message?.content ?? "";

    const maybeJson = (() => {
      try {
        return JSON.parse(content);
      } catch {
        return safeExtractJsonArray(content);
      }
    })();

    if (!Array.isArray(maybeJson)) {
      console.error("Invalid AI output", { content });
      await auth.supabase
        .from("generations")
        .update({ status: "failed", error_message: "Invalid AI output" })
        .eq("id", gen.id);
      return jsonResponse({ error: "Saída inválida do gerador" }, 500);
    }

    const drafts: CreativeDraft[] = maybeJson
      .slice(0, quantity)
      .map((it: any) => ({
        headline: String(it?.headline ?? "").slice(0, 200),
        subheadline: it?.subheadline ? String(it.subheadline).slice(0, 300) : undefined,
        bullets: Array.isArray(it?.bullets) ? it.bullets.map((b: any) => String(b)).slice(0, 6) : [],
        caption: String(it?.caption ?? "").slice(0, 5000),
        hashtags: Array.isArray(it?.hashtags)
          ? it.hashtags
              .map((h: any) => String(h))
              .filter((h: string) => h.trim().length > 0)
              .slice(0, 20)
          : [],
        rationale: it?.rationale ? String(it.rationale).slice(0, 1000) : undefined,
      }))
      .filter((d) => d.headline.trim().length > 0 && d.caption.trim().length > 0);

    if (drafts.length === 0) {
      await auth.supabase
        .from("generations")
        .update({ status: "failed", error_message: "Empty AI output" })
        .eq("id", gen.id);
      return jsonResponse({ error: "Gerador retornou vazio" }, 500);
    }

    // 3) Insert creatives
    const creativesToInsert = drafts.map((d) => ({
      company_id: companyId,
      generation_id: gen.id,
      concept_headline: d.headline,
      concept_subheadline: d.subheadline ?? null,
      concept_bullets: d.bullets,
      caption: d.caption,
      hashtags: d.hashtags,
      rationale: d.rationale ?? null,
      status: "generated" as const,
      version: 1,
    }));

    const { data: insertedCreatives, error: insErr } = await auth.supabase
      .from("creatives")
      .insert(creativesToInsert)
      .select("id");

    if (insErr) {
      console.error("Insert creatives error:", insErr);
      await auth.supabase
        .from("generations")
        .update({ status: "failed", error_message: "Failed to insert creatives" })
        .eq("id", gen.id);
      return jsonResponse({ error: "Falha ao salvar criativos" }, 500);
    }

    await auth.supabase.from("generations").update({ status: "completed" }).eq("id", gen.id);

    console.log("studio-generate-text:done", {
      generationId: gen.id,
      creativesCreated: insertedCreatives?.length ?? 0,
    });

    return jsonResponse({
      ok: true,
      generationId: gen.id,
      creativesCreated: insertedCreatives?.length ?? 0,
    });
  } catch (error) {
    console.error("studio-generate-text error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
