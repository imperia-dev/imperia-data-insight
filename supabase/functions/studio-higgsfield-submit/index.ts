import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["owner", "master", "admin", "editor"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function safeReadText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function normalizeHiggsBase(raw?: string | null) {
  // Docs: https://platform.higgsfield.ai
  return (raw || "https://platform.higgsfield.ai").trim().replace(/\/+$/, "");
}

function waitUntil(promise: Promise<unknown>) {
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(promise);
  // Fallback: fire-and-forget (still may be cut short by runtime)
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

  // Check app role (owner/master bypass) or company membership role
  const { data: appRoleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .order("role", { ascending: true })
    .limit(1)
    .maybeSingle();

  const appRole = appRoleRow?.role;

  return { ok: true as const, supabase, user, appRole };
}

const bodySchema = z.object({
  companyId: z.string().uuid(),
  creativeId: z.string().uuid(),
  mediaMode: z.enum(["image", "carousel", "video"]),
  prompt: z.string().min(3).max(2000),
  aspectRatio: z.enum(["1:1", "4:5", "9:16"]).default("4:5"),
  carouselPages: z.number().int().min(2).max(10).optional(),
  referenceImageUrl: z.string().url().optional(),
  videoDuration: z.number().int().min(3).max(15).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuthAndRole(req);
    if (!auth.ok) return auth.response;

    const higgsApiKey = Deno.env.get("HIGGSFIELD_API_KEY");
    const higgsSecret = Deno.env.get("HIGGSFIELD_API_SECRET");
    const higgsBase = normalizeHiggsBase(Deno.env.get("HIGGSFIELD_BASE_URL"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!higgsApiKey || !higgsSecret) {
      return jsonResponse({ error: "Missing Higgsfield credentials" }, 500);
    }

    if (!serviceKey) {
      return jsonResponse({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }

    const { companyId, creativeId, mediaMode, prompt, aspectRatio, carouselPages, referenceImageUrl, videoDuration } = parsed.data;

    // Check company membership or app role bypass
    const hasAccess =
      auth.appRole === "owner" || auth.appRole === "master"
        ? true
        : (
            await auth.supabase
              .from("company_memberships")
              .select("role")
              .eq("company_id", companyId)
              .eq("user_id", auth.user.id)
              .limit(1)
              .maybeSingle()
          ).data !== null;

    if (!hasAccess) {
      return jsonResponse({ error: "Forbidden: not a member of this company" }, 403);
    }

    // Create job immediately so the UI never gets stuck waiting for Higgsfield.
    const tempRequestId = `pending:${crypto.randomUUID()}`;
    const { data: job, error: jobErr } = await auth.supabase
      .from("creative_provider_jobs")
      .insert({
        company_id: companyId,
        creative_id: creativeId,
        provider: "higgsfield",
        request_id: tempRequestId,
        status: "queued",
        status_url: null,
        cancel_url: null,
        request_payload: {
          mediaMode,
          prompt,
          aspectRatio,
          carouselPages,
          referenceImageUrl,
          videoDuration,
        },
        created_by: auth.user.id,
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      console.error("Insert job error:", jobErr);
      return jsonResponse({ error: "Failed to store job" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Determine REST payload (docs.higgsfield.ai)
    // Docs: POST https://platform.higgsfield.ai/{model_id}
    // Using soul/standard for image, carousel, and (temporarily) video per user confirmation.
    const modelId = "higgsfield-ai/soul/standard";
    const higgsUrl = `${higgsBase}/${modelId}`;

    const payload: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      resolution: "720p",
    };

    // Higgsfield docs don't specify extra params for video/carousel beyond prompt/aspect_ratio/resolution,
    // but we keep the existing intent for carousel/video when possible.
    if (mediaMode === "carousel") payload.num_images = carouselPages ?? 3;
    if (mediaMode === "video") {
      payload.duration = videoDuration ?? 5;
      if (referenceImageUrl) payload.image_url = referenceImageUrl;
    }

    waitUntil(
      (async () => {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 25_000);
        try {
          const higgsRes = await fetch(higgsUrl, {
            method: "POST",
            headers: {
              // Docs: Authorization: Key {api_key_id}:{api_key_secret}
              Authorization: `Key ${higgsApiKey}:${higgsSecret}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (!higgsRes.ok) {
            const errText = await safeReadText(higgsRes);
            console.error("Higgsfield submit error:", { status: higgsRes.status, url: higgsUrl, response: errText, modelId });
            await adminClient
              .from("creative_provider_jobs")
              .update({ status: "failed", error_message: `Higgsfield error ${higgsRes.status}: ${errText?.slice?.(0, 400) ?? errText}` })
              .eq("id", job.id);
            return;
          }

          const higgsData = await higgsRes.json().catch(() => ({}));
          // Docs response: { status, request_id, status_url, cancel_url }
          const requestId = (higgsData?.request_id ?? higgsData?.requestId ?? higgsData?.id) as string | undefined;
          const statusUrl = (higgsData?.status_url as string | undefined) ?? undefined;
          const cancelUrl = (higgsData?.cancel_url as string | undefined) ?? undefined;
          const status = (higgsData?.status ?? "queued") as string;

          if (!requestId) {
            console.error("Higgsfield submit unexpected response:", { url: higgsUrl, higgsData });
            await adminClient
              .from("creative_provider_jobs")
              .update({ status: "failed", error_message: "Higgsfield response missing request id" })
              .eq("id", job.id);
            return;
          }

          await adminClient
            .from("creative_provider_jobs")
            .update({ request_id: requestId, status_url: statusUrl ?? null, cancel_url: cancelUrl ?? null, status })
            .eq("id", job.id);

          console.log("studio-higgsfield-submit:accepted", { jobId: job.id, requestId, mediaMode, modelId });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("Higgsfield submit exception:", { msg, jobId: job.id, url: higgsUrl, modelId });
          await adminClient
            .from("creative_provider_jobs")
            .update({ status: "failed", error_message: msg.includes("aborted") ? "Higgsfield timeout" : msg })
            .eq("id", job.id);
        } finally {
          clearTimeout(t);
        }
      })(),
    );

    // Return immediately
    return jsonResponse({ ok: true, jobId: job.id });
  } catch (error) {
    console.error("studio-higgsfield-submit error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
