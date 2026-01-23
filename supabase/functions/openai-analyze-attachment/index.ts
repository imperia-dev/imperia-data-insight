import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["owner", "master", "admin"]);

const metaSchema = z.object({
  mode: z.enum(["auto", "text", "image", "document"]).default("auto"),
  note: z.string().max(2000).optional(),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toBase64(bytes: Uint8Array): string {
  // Deno has btoa but it expects a binary string. Convert in chunks to avoid stack issues.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function requireAuthAndRole(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false as const, response: jsonResponse({ error: "Missing Authorization header" }, 401) };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    console.error("Auth error:", userError);
    return { ok: false as const, response: jsonResponse({ error: "Invalid authentication" }, 401) };
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
    return { ok: false as const, response: jsonResponse({ error: "Failed to resolve user role" }, 500) };
  }

  const role = roleRow?.role;
  if (!role || !ALLOWED_ROLES.has(role)) {
    return { ok: false as const, response: jsonResponse({ error: "Forbidden" }, 403) };
  }

  return { ok: true as const, supabase, user, role };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuthAndRole(req);
    if (!auth.ok) return auth.response;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "Missing OPENAI_API_KEY secret" }, 500);
    }

    // Expect multipart/form-data: file? + text? + meta(json)
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return jsonResponse({ error: "Expected multipart/form-data" }, 400);
    }

    const form = await req.formData();
    const file = form.get("file");
    const text = (form.get("text") as string | null) ?? "";
    const metaRaw = (form.get("meta") as string | null) ?? "{}";

    const metaParsed = metaSchema.safeParse(JSON.parse(metaRaw));
    if (!metaParsed.success) {
      return jsonResponse({ error: "Invalid meta", details: metaParsed.error.flatten() }, 400);
    }

    const { mode, note } = metaParsed.data;

    const hasFile = file instanceof File;
    const hasText = typeof text === "string" && text.trim().length > 0;

    if (!hasFile && !hasText) {
      return jsonResponse({ error: "Provide 'file' or 'text'" }, 400);
    }

    const system =
      "Você é um analista. Extraia e resuma o conteúdo do anexo de forma objetiva, com: (1) resumo em 5 bullets, (2) dados/valores relevantes, (3) próximos passos sugeridos. Não invente; se faltar algo, diga que não está visível.";

    const userPrefix = note?.trim()
      ? `Contexto adicional do usuário: ${note.trim()}`
      : "";

    let userContent: any;

    if (hasFile) {
      const f = file as File;
      const mime = f.type || "application/octet-stream";
      const bytes = new Uint8Array(await f.arrayBuffer());

      // Hard limit to keep costs predictable (10MB)
      if (bytes.byteLength > 10 * 1024 * 1024) {
        return jsonResponse({ error: "Arquivo muito grande (máx 10MB)" }, 400);
      }

      const isImage = mime.startsWith("image/");
      const effectiveMode = mode === "auto" ? (isImage ? "image" : "document") : mode;

      if (effectiveMode === "image") {
        if (!isImage) {
          return jsonResponse({ error: `Modo 'image' requer um arquivo de imagem. Recebido: ${mime}` }, 400);
        }
        const b64 = toBase64(bytes);
        const dataUrl = `data:${mime};base64,${b64}`;

        userContent = [
          {
            type: "text",
            text:
              `${userPrefix}\nAnalise a imagem anexada e produza um resumo estruturado em PT-BR.`,
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ];
      } else {
        // Document/text fallback: try to decode as text; if not possible, request user to provide text.
        let decoded = "";
        try {
          decoded = new TextDecoder().decode(bytes);
        } catch {
          decoded = "";
        }

        if (!decoded || decoded.trim().length < 10) {
          return jsonResponse({
            error:
              "Não consegui extrair texto desse arquivo automaticamente. Tente: (1) colar o texto no campo, ou (2) enviar uma imagem do conteúdo.",
          }, 400);
        }

        const clipped = decoded.slice(0, 20000); // safety cap
        userContent = `${userPrefix}\nConteúdo do documento (recortado):\n${clipped}`;
      }
    } else {
      const clipped = text.trim().slice(0, 20000);
      userContent = `${userPrefix}\nTexto fornecido (recortado):\n${clipped}`;
    }

    console.log("openai-analyze-attachment", {
      userId: auth.user.id,
      role: auth.role,
      mode,
      hasFile,
      hasText,
    });

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      console.error("OpenAI error", openaiRes.status, errText);
      return jsonResponse({ error: "Falha ao analisar o anexo", status: openaiRes.status }, 502);
    }

    const payload = await openaiRes.json();
    const summary = payload?.choices?.[0]?.message?.content ?? "";

    return jsonResponse({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error("openai-analyze-attachment error:", error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
