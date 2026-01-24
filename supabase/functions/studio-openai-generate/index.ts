import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAuth(req: Request) {
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
    return { ok: false as const, response: jsonResponse({ error: "Invalid authentication" }, 401) };
  }
  return { ok: true as const, supabase, user: userData.user, authHeader };
}

// Size mapping per aspect ratio for DALL-E 3
// DALL-E 3 only supports: 1024x1024, 1024x1792, 1792x1024
const SIZE_MAP: Record<string, "1024x1024" | "1024x1792" | "1792x1024"> = {
  "1:1": "1024x1024",
  "3:4": "1024x1792",  // portrait
  "4:3": "1792x1024",  // landscape
  "9:16": "1024x1792", // vertical/reels
  "16:9": "1792x1024", // horizontal
};

console.log("studio-openai-generate: module loaded");

// Brand context schema
const brandContextSchema = z.object({
  companyName: z.string().optional(),
  palette: z.array(z.string()).optional(),
  knowledgeBase: z.array(z.object({
    source_type: z.string(),
    content: z.string(),
    source_url: z.string().nullable().optional(),
  })).optional(),
}).optional();

const bodySchema = z.object({
  companyId: z.string().uuid(),
  creativeId: z.string().uuid(),
  mediaMode: z.enum(["image", "carousel"]), // video not supported via DALL-E
  prompt: z.string().min(3).max(2000),
  aspectRatio: z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]).default("3:4"),
  carouselPages: z.number().int().min(2).max(10).optional(),
  brandContext: brandContextSchema,
});

// Log function start
console.log("studio-openai-generate: function started");

// Build enriched prompt with brand context
function buildEnrichedPrompt(
  basePrompt: string,
  brandContext?: {
    companyName?: string;
    palette?: string[];
    knowledgeBase?: Array<{ source_type: string; content: string; source_url?: string | null }>;
  }
): string {
  if (!brandContext) return basePrompt;

  const parts: string[] = [];

  // Add company name context
  if (brandContext.companyName) {
    parts.push(`Brand: ${brandContext.companyName}.`);
  }

  // Add color palette context
  if (brandContext.palette && brandContext.palette.length > 0) {
    parts.push(`Brand colors (HEX): ${brandContext.palette.join(", ")}. Use these colors prominently in the design.`);
  }

  // Add knowledge base context
  if (brandContext.knowledgeBase && brandContext.knowledgeBase.length > 0) {
    const contextPieces: string[] = [];
    for (const kb of brandContext.knowledgeBase) {
      if (kb.source_type === "brand_kit_summary") {
        contextPieces.push(`Brand identity: ${kb.content}`);
      } else if (kb.source_type === "website") {
        contextPieces.push(`Website info: ${kb.content}`);
      } else if (kb.source_type === "competitor_inspiration") {
        contextPieces.push(`Style inspiration: ${kb.content}`);
      }
    }
    if (contextPieces.length > 0) {
      parts.push(contextPieces.join(" | "));
    }
  }

  // Combine context with base prompt
  if (parts.length > 0) {
    const contextStr = parts.join(" ");
    return `[BRAND CONTEXT: ${contextStr}]\n\n${basePrompt}`;
  }

  return basePrompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return jsonResponse({ error: "Missing OPENAI_API_KEY" }, 500);
    }

    const rawBody = await req.json().catch(() => ({}));
    console.log("studio-openai-generate: received body", JSON.stringify(rawBody));

    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      console.error("studio-openai-generate: validation failed", parsed.error.flatten());
      return jsonResponse({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }

    const { companyId, creativeId, mediaMode, prompt, aspectRatio, carouselPages, brandContext } = parsed.data;
    console.log("studio-openai-generate: validated params", { companyId, creativeId, mediaMode, aspectRatio, hasBrandContext: !!brandContext });

    // Build enriched prompt with brand context
    const enrichedPrompt = buildEnrichedPrompt(prompt, brandContext);
    console.log("studio-openai-generate: enriched prompt length", enrichedPrompt.length);

    // Verify company membership
    const { data: member } = await auth.supabase
      .from("company_memberships")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", auth.user.id)
      .limit(1)
      .maybeSingle();

    const { data: appRoleRow } = await auth.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member && appRoleRow?.role !== "owner" && appRoleRow?.role !== "master") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Determine size
    const size = SIZE_MAP[aspectRatio] || "1024x1024";
    const imageCount = mediaMode === "carousel" ? Math.min(carouselPages ?? 3, 10) : 1;

    // Create job record
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const requestId = crypto.randomUUID();
    const { data: job, error: jobErr } = await adminClient
      .from("creative_provider_jobs")
      .insert({
        company_id: companyId,
        creative_id: creativeId,
        created_by: auth.user.id,
        provider: "openai",
        request_id: requestId,
        request_payload: { mediaMode, prompt, enrichedPrompt, aspectRatio, imageCount, brandContext },
        status: "in_progress",
      })
      .select("id")
      .single();

    if (jobErr || !job) {
      console.error("Failed to create job:", jobErr);
      return jsonResponse({ error: "Failed to create job record" }, 500);
    }

    const jobId = job.id;

    // Generate images using DALL-E 3
    const generatedUrls: string[] = [];
    let lastError: string | null = null;

    for (let i = 0; i < imageCount; i++) {
      try {
        const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: enrichedPrompt, // Use enriched prompt
            n: 1,
            size: size,
            quality: "standard",
            response_format: "url",
          }),
        });

        if (!dalleResponse.ok) {
          const errText = await dalleResponse.text();
          console.error("DALL-E error:", dalleResponse.status, errText);
          lastError = `DALL-E API error: ${dalleResponse.status}`;
          continue;
        }

        const dalleData = await dalleResponse.json();
        const imageUrl = dalleData.data?.[0]?.url;
        if (imageUrl) {
          generatedUrls.push(imageUrl);
        }
      } catch (err) {
        console.error("DALL-E request error:", err);
        lastError = err instanceof Error ? err.message : "Unknown error";
      }
    }

    if (generatedUrls.length === 0) {
      await adminClient
        .from("creative_provider_jobs")
        .update({ status: "failed", error_message: lastError || "No images generated" })
        .eq("id", jobId);
      return jsonResponse({ error: "Failed to generate images", details: lastError }, 500);
    }

    // Download images and save to storage
    const bucket = "creative-images";
    const savedMedia: Array<{ position: number; path: string }> = [];

    for (let i = 0; i < generatedUrls.length; i++) {
      const url = generatedUrls[i];
      try {
        const imgRes = await fetch(url);
        if (!imgRes.ok) continue;
        const blob = await imgRes.blob();
        const fileName = `${companyId}/${creativeId}/${jobId}_${i + 1}.png`;

        const { error: uploadErr } = await adminClient.storage.from(bucket).upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

        if (uploadErr) {
          console.error("Upload error:", uploadErr);
          continue;
        }

        // Insert creative_media row
        await adminClient.from("creative_media").insert({
          creative_id: creativeId,
          company_id: companyId,
          media_type: "image",
          position: i + 1,
          storage_bucket: bucket,
          storage_path: fileName,
          metadata: { source_url: url, provider: "openai" },
        });

        savedMedia.push({ position: i + 1, path: fileName });
      } catch (dlErr) {
        console.error("Download/upload error:", dlErr);
      }
    }

    // Update job as completed
    await adminClient
      .from("creative_provider_jobs")
      .update({
        status: savedMedia.length > 0 ? "completed" : "failed",
        result_payload: { generatedUrls, savedMedia },
        error_message: savedMedia.length === 0 ? "Failed to save images" : null,
      })
      .eq("id", jobId);

    console.log("studio-openai-generate:success", { jobId, imagesGenerated: generatedUrls.length, imagesSaved: savedMedia.length });

    return jsonResponse({
      jobId,
      status: savedMedia.length > 0 ? "completed" : "failed",
      imagesGenerated: generatedUrls.length,
      imagesSaved: savedMedia.length,
    });
  } catch (error) {
    console.error("studio-openai-generate error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
