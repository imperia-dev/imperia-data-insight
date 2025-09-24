import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
  console.log("[send-payment-email] Starting request handler");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[send-payment-email] Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("[send-payment-email] RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured",
          details: "RESEND_API_KEY is missing" 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("[send-payment-email] Resend API key found, length:", resendApiKey.length);
    
    // Initialize Resend with the API key
    const resend = new Resend(resendApiKey);
    
    // Parse request body
    const requestData: PaymentEmailRequest = await req.json();
    console.log("[send-payment-email] Processing payment email request for:", requestData.recipient_email);
    console.log("[send-payment-email] Number of protocols:", requestData.protocol_ids?.length || 0);
    console.log("[send-payment-email] Total amount:", requestData.total_amount);

    // Validate required fields
    if (!requestData.recipient_email) {
      console.error("[send-payment-email] Missing recipient email");
      return new Response(
        JSON.stringify({ error: "Recipient email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Format competence month for display
    const formatCompetenceMonth = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { month: 'numeric', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    // Generate HTML email template
    const protocolsTable = requestData.protocols_data.map(p => `
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px;">${p.protocol_number}</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px;">${formatCompetenceMonth(p.competence_month)}</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; text-align: right;">R$ ${p.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; text-align: center;">${p.product_1_count}</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; text-align: center;">${p.product_2_count}</td>
      </tr>
    `).join('');

    const bankInfo = requestData.company_info ? `
      <div style="margin-top: 30px; padding: 20px; background-color: #f7fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="color: #2d3748; margin-bottom: 15px; font-size: 16px;">Dados para Pagamento</h3>
        <div style="font-size: 14px; line-height: 1.8;">
          <p style="margin: 5px 0;"><strong>Empresa:</strong> ${requestData.company_info.name}</p>
          <p style="margin: 5px 0;"><strong>CNPJ:</strong> ${requestData.company_info.cnpj}</p>
          ${requestData.company_info.bank_name ? `<p style="margin: 5px 0;"><strong>Banco:</strong> ${requestData.company_info.bank_name}</p>` : ''}
          ${requestData.company_info.account_number ? `<p style="margin: 5px 0;"><strong>Conta:</strong> ${requestData.company_info.account_number}</p>` : ''}
          ${requestData.company_info.pix_key ? `<p style="margin: 5px 0;"><strong>Chave PIX:</strong> ${requestData.company_info.pix_key}</p>` : ''}
        </div>
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2d3748; line-height: 1.6; padding: 20px; background-color: #f7fafc;">
        <div style="max-width: 700px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header with logo/branding -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
            <h1 style="color: #1a202c; margin: 0; font-size: 24px;">Imperia Traduções - Sistema de Gestão</h1>
          </div>
          
          <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 20px;">Solicitação de Pagamento</h2>
          
          <div style="margin-bottom: 25px; white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: #4a5568;">${requestData.message}</div>
          
          <h3 style="color: #2d3748; margin-top: 35px; margin-bottom: 20px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Detalhamento dos Protocolos</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <thead>
              <tr style="background-color: #4a5568; color: white;">
                <th style="padding: 12px; border: 1px solid #4a5568; text-align: left; font-size: 14px;">Protocolo</th>
                <th style="padding: 12px; border: 1px solid #4a5568; text-align: left; font-size: 14px;">Competência</th>
                <th style="padding: 12px; border: 1px solid #4a5568; text-align: right; font-size: 14px;">Valor</th>
                <th style="padding: 12px; border: 1px solid #4a5568; text-align: center; font-size: 14px;">Produto 1</th>
                <th style="padding: 12px; border: 1px solid #4a5568; text-align: center; font-size: 14px;">Produto 2</th>
              </tr>
            </thead>
            <tbody>
              ${protocolsTable}
            </tbody>
            <tfoot>
              <tr style="background-color: #edf2f7; font-weight: bold;">
                <td colspan="2" style="padding: 12px; border: 1px solid #e2e8f0; font-size: 14px;">Total Geral</td>
                <td colspan="3" style="padding: 12px; border: 1px solid #e2e8f0; font-size: 16px; text-align: right; color: #2d3748;">R$ ${requestData.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
          
          ${bankInfo}
          
          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center;">
            <p style="margin: 5px 0;">Este é um email automático gerado pelo Sistema de Gestão.</p>
            <p style="margin: 5px 0;">Por favor, não responda a este endereço.</p>
            <p style="margin: 10px 0 0 0;">Em caso de dúvidas, entre em contato através dos canais oficiais.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("[send-payment-email] Sending email via Resend API");
    
    // Use custom domain if verified, otherwise fallback to Resend default
    const fromEmail = "Alex - Imperia Traduções <noreply@appimperiatraducoes.com>";
    const fallbackEmail = "Alex - Imperia Traduções <onboarding@resend.dev>";
    
    console.log("[send-payment-email] From:", fromEmail);
    console.log("[send-payment-email] To:", requestData.recipient_email);
    console.log("[send-payment-email] CC:", requestData.cc_emails?.join(", ") || "none");
    
    // Send email using Resend
    try {
      let emailResponse;
      
      // Try with custom domain first
      try {
        emailResponse = await resend.emails.send({
          from: fromEmail,
          to: [requestData.recipient_email],
          cc: requestData.cc_emails || [],
          subject: requestData.subject,
          html: htmlContent,
        });
      } catch (domainError: any) {
        // If custom domain fails, try with Resend default
        console.log("[send-payment-email] Custom domain failed, trying fallback:", domainError.message);
        
        emailResponse = await resend.emails.send({
          from: fallbackEmail,
          to: [requestData.recipient_email],
          cc: requestData.cc_emails || [],
          subject: requestData.subject,
          html: htmlContent,
        });
      }

      console.log("[send-payment-email] Email API response:", JSON.stringify(emailResponse));
      
      // Check if email was sent successfully
      if (!emailResponse || (emailResponse as any).error) {
        const errorDetails = (emailResponse as any)?.error || "Unknown error";
        console.error("[send-payment-email] Failed to send email:", errorDetails);
        
        return new Response(
          JSON.stringify({ 
            error: "Failed to send email",
            details: errorDetails
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      console.log("[send-payment-email] Email sent successfully, ID:", (emailResponse as any).id);

      // Initialize Supabase client for database updates
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        console.log("[send-payment-email] Updating database records");
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get user from authorization header
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const token = authHeader.replace("Bearer ", "");
          const { data: { user }, error: userError } = await supabase.auth.getUser(token);
          
          if (userError) {
            console.error("[send-payment-email] Error getting user:", userError);
          } else if (user) {
            console.log("[send-payment-email] Creating payment request record for user:", user.id);
            
            // Create payment request record
            const { data: paymentRequest, error: insertError } = await supabase
              .from("payment_requests")
              .insert({
                protocol_ids: requestData.protocol_ids,
                recipient_email: requestData.recipient_email,
                cc_emails: requestData.cc_emails || [],
                subject: requestData.subject,
                message: requestData.message,
                total_amount: requestData.total_amount,
                status: "sent",
                sent_at: new Date().toISOString(),
                created_by: user.id,
              })
              .select()
              .single();

            if (insertError) {
              console.error("[send-payment-email] Error creating payment request:", insertError);
            } else {
              console.log("[send-payment-email] Payment request created, ID:", paymentRequest?.id);
              
              // Update protocols payment requested timestamp
              if (requestData.protocol_ids && requestData.protocol_ids.length > 0) {
                console.log("[send-payment-email] Updating protocols, IDs:", requestData.protocol_ids);
                
                const { error: updateError } = await supabase
                  .from("closing_protocols")
                  .update({
                    payment_requested_at: new Date().toISOString(),
                  })
                  .in("id", requestData.protocol_ids);
                  
                if (updateError) {
                  console.error("[send-payment-email] Error updating protocols:", updateError);
                } else {
                  console.log("[send-payment-email] Protocols updated successfully");
                }
              }
            }
          }
        } else {
          console.log("[send-payment-email] No authorization header, skipping database update");
        }
      } else {
        console.log("[send-payment-email] Supabase credentials not available, skipping database update");
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: emailResponse,
          message: "Email enviado com sucesso"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
      
    } catch (emailError: any) {
      console.error("[send-payment-email] Error calling Resend API:", emailError);
      console.error("[send-payment-email] Error details:", JSON.stringify(emailError));
      
      // Check if it's an API key issue
      if (emailError.message?.includes("API key") || emailError.statusCode === 401) {
        return new Response(
          JSON.stringify({ 
            error: "Invalid API key",
            details: "Please check that the RESEND_API_KEY is valid",
            hint: "Make sure you've added a valid Resend API key and verified your sending domain"
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      throw emailError; // Re-throw to be caught by outer try-catch
    }
    
  } catch (error: any) {
    console.error("[send-payment-email] Unexpected error in function:", error);
    console.error("[send-payment-email] Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);