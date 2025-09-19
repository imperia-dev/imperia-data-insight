import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentEmailRequest {
  recipient_email: string;
  cc_emails?: string[];
  subject: string;
  protocol_ids: string[];
  protocols_data: Array<{
    protocol_number: string;
    competence_month: string;
    total_value: number;
    product_1_count: number;
    product_2_count: number;
  }>;
  total_amount: number;
  message: string;
  company_info?: {
    name: string;
    cnpj: string;
    bank_name?: string;
    account_number?: string;
    pix_key?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: PaymentEmailRequest = await req.json();
    console.log("Processing payment email request:", requestData);

    // Generate HTML email template
    const protocolsTable = requestData.protocols_data.map(p => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">${p.protocol_number}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">${p.competence_month}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">R$ ${p.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">${p.product_1_count}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">${p.product_2_count}</td>
      </tr>
    `).join('');

    const bankInfo = requestData.company_info ? `
      <div style="margin-top: 30px; padding: 20px; background-color: #f7fafc; border-radius: 8px;">
        <h3 style="color: #2d3748; margin-bottom: 15px;">Dados para Pagamento</h3>
        <p><strong>Empresa:</strong> ${requestData.company_info.name}</p>
        <p><strong>CNPJ:</strong> ${requestData.company_info.cnpj}</p>
        ${requestData.company_info.bank_name ? `<p><strong>Banco:</strong> ${requestData.company_info.bank_name}</p>` : ''}
        ${requestData.company_info.account_number ? `<p><strong>Conta:</strong> ${requestData.company_info.account_number}</p>` : ''}
        ${requestData.company_info.pix_key ? `<p><strong>Chave PIX:</strong> ${requestData.company_info.pix_key}</p>` : ''}
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2d3748; line-height: 1.6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #2d3748; margin-bottom: 20px;">Solicitação de Pagamento</h2>
          
          <div style="margin-bottom: 20px; white-space: pre-wrap;">${requestData.message}</div>
          
          <h3 style="color: #2d3748; margin-top: 30px; margin-bottom: 15px;">Detalhamento dos Protocolos</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #edf2f7;">
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Protocolo</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Competência</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Valor</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Produto 1</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left;">Produto 2</th>
              </tr>
            </thead>
            <tbody>
              ${protocolsTable}
            </tbody>
            <tfoot>
              <tr style="background-color: #edf2f7; font-weight: bold;">
                <td colspan="2" style="padding: 8px; border: 1px solid #e2e8f0;">Total</td>
                <td colspan="3" style="padding: 8px; border: 1px solid #e2e8f0;">R$ ${requestData.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
          
          ${bankInfo}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096;">
            <p>Este é um email automático. Por favor, não responda a este endereço.</p>
            <p>Em caso de dúvidas, entre em contato através dos canais oficiais.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Sistema de Gestão <onboarding@resend.dev>",
      to: [requestData.recipient_email],
      cc: requestData.cc_emails,
      subject: requestData.subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update payment request status in database
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Create payment request record
        const { data: paymentRequest, error } = await supabase
          .from("payment_requests")
          .insert({
            protocol_ids: requestData.protocol_ids,
            recipient_email: requestData.recipient_email,
            cc_emails: requestData.cc_emails,
            subject: requestData.subject,
            message: requestData.message,
            total_amount: requestData.total_amount,
            status: "sent",
            sent_at: new Date().toISOString(),
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating payment request:", error);
        } else {
          console.log("Payment request created:", paymentRequest);
          
          // Update protocols status
          const { error: updateError } = await supabase
            .from("closing_protocols")
            .update({
              payment_status: "sent",
              payment_requested_at: new Date().toISOString(),
            })
            .in("id", requestData.protocol_ids);
            
          if (updateError) {
            console.error("Error updating protocols:", updateError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-payment-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);