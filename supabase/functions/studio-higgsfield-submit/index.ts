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
    const higgsBase = Deno.env.get("HIGGSFIELD_BASE_URL") || "https://platform.higgsfield.ai";

    if (!higgsApiKey || !higgsSecret) {
      return jsonResponse({ error: "Missing Higgsfield credentials" }, 500);
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

    // Determine Higgsfield model and payload
    let modelId: string;
    let payload: Record<string, unknown>;

    if (mediaMode === "video") {
      modelId = "higgsfield-ai/dop/standard";
      payload = {
        prompt,
        image_url: referenceImageUrl ?? undefined,
        duration: videoDuration ?? 5,
        aspect_ratio: aspectRatio,
      };
    } else {
      modelId = "higgsfield-ai/soul/standard";
      payload = {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: "720p",
      };
    }

    // Submit request to Higgsfield
    const higgsRes = await fetch(`${higgsBase}/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${higgsApiKey}:${higgsSecret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!higgsRes.ok) {
      const errText = await higgsRes.text().catch(() => "");
      console.error("Higgsfield submit error:", higgsRes.status, errText);
      return jsonResponse({ error: "Failed to submit to Higgsfield", status: higgsRes.status }, 502);
    }

    const higgsData = await higgsRes.json();

    // Store job record
    const { data: job, error: jobErr } = await auth.supabase
      .from("creative_provider_jobs")
      .insert({
        company_id: companyId,
        creative_id: creativeId,
        provider: "higgsfield",
        request_id: higgsData.request_id,
        status: higgsData.status ?? "queued",
        status_url: higgsData.status_url,
        cancel_url: higgsData.cancel_url,
        request_payload: {
          mediaMode,
          prompt,
          aspectRatio,
          carouselPages,
          referenceImageUrl,
          videoDuration,
          modelId,
        },
        created_by: auth.user.id,
      })
      .select("id")
      .single();

    if (jobErr) {
      console.error("Insert job error:", jobErr);
      return jsonResponse({ error: "Failed to store job" }, 500);
    }

    console.log("studio-higgsfield-submit:success", {
      userId: auth.user.id,
      jobId: job.id,
      requestId: higgsData.request_id,
      mediaMode,
    });

    return jsonResponse({
      ok: true,
      jobId: job.id,
      requestId: higgsData.request_id,
      statusUrl: higgsData.status_url,
    });
  } catch (error) {
    console.error("studio-higgsfield-submit error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
