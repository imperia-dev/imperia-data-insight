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
  return { ok: true as const, supabase, user: userData.user };
}

const bodySchema = z.object({ jobId: z.string().uuid() });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const higgsApiKey = Deno.env.get("HIGGSFIELD_API_KEY");
    const higgsSecret = Deno.env.get("HIGGSFIELD_API_SECRET");
    if (!higgsApiKey || !higgsSecret) {
      return jsonResponse({ error: "Missing Higgsfield credentials" }, 500);
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid body", details: parsed.error.flatten() }, 400);
    }
    const { jobId } = parsed.data;

    // Fetch job
    const { data: job, error: jobErr } = await auth.supabase
      .from("creative_provider_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return jsonResponse({ error: "Job not found" }, 404);
    }

    // Check company membership
    const { data: member } = await auth.supabase
      .from("company_memberships")
      .select("id")
      .eq("company_id", job.company_id)
      .eq("user_id", auth.user.id)
      .limit(1)
      .maybeSingle();

    // Also allow owners/masters
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

    // If already completed, return cached
    if (job.status === "completed" || job.status === "failed") {
      return jsonResponse({ status: job.status, result: job.result_payload, error: job.error_message });
    }

    // Poll Higgsfield status
    const statusUrl = job.status_url;
    if (!statusUrl) {
      return jsonResponse({ error: "No status_url available" }, 500);
    }

    const pollRes = await fetch(statusUrl, {
      headers: {
        Authorization: `Key ${higgsApiKey}:${higgsSecret}`,
        Accept: "application/json",
      },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text().catch(() => "");
      console.error("Higgsfield poll error:", pollRes.status, errText);
      return jsonResponse({ error: "Failed to poll Higgsfield", status: pollRes.status }, 502);
    }

    const pollData = await pollRes.json();
    const newStatus = pollData.status ?? job.status;

    // Update job record
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed") {
      updates.result_payload = pollData;
    } else if (newStatus === "failed") {
      updates.error_message = pollData.error ?? "Unknown error";
    }

    await auth.supabase.from("creative_provider_jobs").update(updates).eq("id", job.id);

    // If completed, download media and store in Supabase Storage
    if (newStatus === "completed") {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const adminClient = createClient(supabaseUrl, serviceKey!, { auth: { persistSession: false } });

      const reqPayload = job.request_payload as Record<string, unknown>;
      const mediaMode = reqPayload.mediaMode as string;
      const isVideo = mediaMode === "video";
      const bucket = isVideo ? "creative-videos" : "creative-images";

      const mediaUrls: Array<{ url: string; position: number }> = [];

      if (isVideo && pollData.video?.url) {
        mediaUrls.push({ url: pollData.video.url, position: 1 });
      } else if (Array.isArray(pollData.images)) {
        (pollData.images as Array<{ url: string }>).forEach((img, idx) => {
          mediaUrls.push({ url: img.url, position: idx + 1 });
        });
      }

      for (const m of mediaUrls) {
        try {
          const mediaRes = await fetch(m.url);
          if (!mediaRes.ok) continue;
          const blob = await mediaRes.blob();
          const ext = isVideo ? "mp4" : "jpg";
          const fileName = `${job.company_id}/${job.creative_id}/${job.id}_${m.position}.${ext}`;

          const { error: uploadErr } = await adminClient.storage.from(bucket).upload(fileName, blob, {
            contentType: isVideo ? "video/mp4" : "image/jpeg",
            upsert: true,
          });

          if (uploadErr) {
            console.error("Upload error:", uploadErr);
            continue;
          }

          // Insert creative_media row
          await adminClient.from("creative_media").insert({
            creative_id: job.creative_id,
            company_id: job.company_id,
            media_type: isVideo ? "video" : "image",
            position: m.position,
            storage_bucket: bucket,
            storage_path: fileName,
            metadata: { source_url: m.url },
          });
        } catch (dlErr) {
          console.error("Download/upload error:", dlErr);
        }
      }
    }

    console.log("studio-higgsfield-poll:success", { jobId, status: newStatus });

    return jsonResponse({ status: newStatus, result: pollData });
  } catch (error) {
    console.error("studio-higgsfield-poll error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
