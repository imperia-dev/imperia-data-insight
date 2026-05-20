import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHARS_PER_PAGE = Number(Deno.env.get("DOCX_CHARS_PER_PAGE") || "1800") || 1800;

// OCR via Gemini (Lovable AI Gateway). Returns extracted text, or null on failure.
async function ocrViaGemini(buf: Uint8Array, mime: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + CHUNK) as unknown as number[]);
  }
  const b64 = btoa(bin);
  const dataUrl = `data:${mime};base64,${b64}`;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Transcreva todo o texto visível deste documento/imagem. Apenas o texto, sem comentários." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
      }),
    });
    if (!resp.ok) {
      console.error("Gemini OCR failed:", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const json = await resp.json();
    const text = json.choices?.[0]?.message?.content || "";
    return typeof text === "string" ? text : null;
  } catch (e) {
    console.error("Gemini OCR exception:", e);
    return null;
  }
}

// Read Word's `Pages` field from docx's docProps/app.xml using jszip.
async function readDocxPagesField(buf: Uint8Array): Promise<number | null> {
  try {
    const JSZipMod = await import("npm:jszip@3.10.1");
    const JSZip = (JSZipMod as any).default ?? JSZipMod;
    const zip = await JSZip.loadAsync(buf);
    const entry = zip.file("docProps/app.xml");
    if (!entry) return null;
    const xml = await entry.async("string");
    const m = xml.match(/<Pages>(\d+)<\/Pages>/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  } catch (e) {
    console.error("readDocxPagesField error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { file_id } = await req.json();
    if (!file_id) return new Response(JSON.stringify({ error: "file_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: fileRow, error: fErr } = await supabase
      .from("trial_order_files")
      .select("id, storage_path, original_filename, mime_type, order_id, trial_orders!inner(customer_id, trial_customers!inner(user_id))")
      .eq("id", file_id)
      .maybeSingle();
    if (fErr || !fileRow) throw new Error("file not found");
    const ownerUserId = (fileRow as any).trial_orders.trial_customers.user_id;
    if (ownerUserId !== userData.user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: blob, error: dlErr } = await supabase.storage.from("trial-uploads").download(fileRow.storage_path);
    if (dlErr || !blob) throw new Error("download failed");
    const buf = new Uint8Array(await blob.arrayBuffer());

    let pages = 0;
    let characters = 0;
    let analysis_error: string | null = null;
    let ocr_used = false;
    const name = (fileRow.original_filename || "").toLowerCase();
    const ext = name.split(".").pop() || "";

    try {
      if (ext === "pdf") {
        const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
        const r = await pdfParse(buf);
        pages = r.numpages || 1;
        characters = (r.text || "").length;

        // PDF escaneado: sem texto extraível → fallback OCR via Gemini (suporta PDF nativamente).
        if (characters === 0 && pages > 0) {
          const ocrText = await ocrViaGemini(buf, "application/pdf");
          if (ocrText && ocrText.length > 0) {
            characters = ocrText.length;
            ocr_used = true;
          } else {
            analysis_error = "PDF escaneado: OCR não retornou texto.";
          }
        }
      } else if (ext === "docx") {
        const mammoth = await import("npm:mammoth@1.6.0");
        const r = await mammoth.extractRawText({ buffer: buf });
        characters = (r.value || "").length;

        // Tenta usar contagem real do Word (docProps/app.xml). Fallback: estimativa.
        const realPages = await readDocxPagesField(buf);
        if (realPages && realPages > 0) {
          pages = realPages;
        } else {
          pages = Math.max(1, Math.ceil(characters / CHARS_PER_PAGE));
        }
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("npm:xlsx@0.18.5");
        const wb = XLSX.read(buf, { type: "array" });
        pages = wb.SheetNames.length;
        characters = wb.SheetNames.reduce((sum, sn) => {
          const sheet = wb.Sheets[sn];
          return sum + (XLSX.utils.sheet_to_csv(sheet) || "").length;
        }, 0);
      } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
        pages = 1;
        const ocrText = await ocrViaGemini(buf, fileRow.mime_type || `image/${ext}`);
        if (ocrText === null) {
          throw new Error("OCR indisponível (falha na chamada ao Gemini).");
        }
        characters = ocrText.length;
        ocr_used = true;
        if (characters === 0) {
          throw new Error("OCR retornou vazio para esta imagem.");
        }
      } else if (ext === "doc") {
        throw new Error("Formato .doc legado não suportado. Envie em .docx ou .pdf.");
      } else {
        throw new Error("Formato não suportado");
      }
    } catch (e) {
      analysis_error = (e as Error).message;
    }

    await supabase.from("trial_order_files").update({
      pages,
      characters,
      analysis_status: analysis_error ? "failed" : "done",
      analysis_error,
    }).eq("id", file_id);

    // Recompute order totals
    const { data: allFiles } = await supabase.from("trial_order_files").select("pages, characters").eq("order_id", fileRow.order_id);
    const totals = (allFiles || []).reduce((a, f) => ({ d: a.d + 1, p: a.p + (f.pages || 0), c: a.c + (f.characters || 0) }), { d: 0, p: 0, c: 0 });
    await supabase.from("trial_orders").update({ total_documents: totals.d, total_pages: totals.p, total_characters: totals.c }).eq("id", fileRow.order_id);

    return new Response(JSON.stringify({ ok: !analysis_error, pages, characters, ocr_used, error: analysis_error }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
