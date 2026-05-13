import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { requireRole } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  recipient_email: string;
  recipient_name: string;
  status: "approved" | "rejected";
  reason?: string;
}

const FROM = "Império Traduções <noreply@ops.imperiatraducoes.com.br>";
const PORTAL_URL = "https://ops.imperiatraducoes.com.br/portal/login";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireRole(req, ["owner", "master"]);
    if (!auth.ok) return auth.response;

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.recipient_email || !body?.status || !body?.recipient_name) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(apiKey);

    const subject = body.status === "approved"
      ? "Seu acesso ao Portal Trial foi aprovado"
      : "Atualização sobre sua solicitação de acesso";

    const html = body.status === "approved"
      ? `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h2 style="margin:0 0 16px">Olá, ${escapeHtml(body.recipient_name)}!</h2>
          <p>Seu cadastro no Portal Trial da Império Traduções foi <strong>aprovado</strong>.</p>
          <p>Você já pode acessar a plataforma e cadastrar pedidos de tradução de teste.</p>
          <p style="margin:24px 0">
            <a href="${PORTAL_URL}" style="background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">
              Acessar o Portal
            </a>
          </p>
          <p style="color:#666;font-size:13px">Se você não esperava este e-mail, ignore esta mensagem.</p>
        </div>`
      : `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h2 style="margin:0 0 16px">Olá, ${escapeHtml(body.recipient_name)}!</h2>
          <p>Agradecemos seu interesse no Portal Trial da Império Traduções.</p>
          <p>Após análise, <strong>não foi possível aprovar seu cadastro neste momento</strong>.</p>
          ${body.reason ? `<p><strong>Motivo:</strong> ${escapeHtml(body.reason)}</p>` : ""}
          <p>Se acredita que se trata de um engano ou quiser mais informações, entre em contato com nossa equipe.</p>
        </div>`;

    const result = await resend.emails.send({
      from: FROM,
      to: [body.recipient_email],
      subject,
      html,
    });

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("[send-trial-status-email] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
