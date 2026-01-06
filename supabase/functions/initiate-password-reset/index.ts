import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitiateResetRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const resendApiKey = Deno.env.get('RESEND_API_KEY') as string;
    const projectUrl = 'https://ops.imperiatraducoes.com.br';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { email }: InitiateResetRequest = await req.json();
    
    // Extract first IP from x-forwarded-for (can contain multiple IPs)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor 
      ? forwardedFor.split(',')[0].trim() 
      : req.headers.get('cf-connecting-ip') || null;

    console.log('Password reset requested for:', email);

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.log('User not found for email:', email);
      // Return success even if user doesn't exist (security best practice)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, you will receive reset instructions.' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Clean up any expired tokens
    try {
      await supabase.rpc('cleanup_expired_reset_tokens');
    } catch (e) {
      console.log('cleanup_expired_reset_tokens not available, skipping');
    }

    // Check for existing active token
    const { data: existingToken } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('user_id', profile.id)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    // If there is already an active token, resend the email using the same token
    // (prevents unnecessary token spam and avoids user-facing 429 errors)
    if (existingToken?.email_token) {
      const resetLink = `${projectUrl}/reset-password?token=${existingToken.email_token}`;

      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured');
        throw new Error('Email service not configured');
      }

      const resend = new Resend(resendApiKey);
      const fromEmail = "Imperia Traduções <noreply@appimperiatraducoes.com>";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e293b; margin: 0;">Impéria Traduções</h1>
          </div>
          <h2 style="color: #334155;">Olá ${profile.full_name || 'Usuário'},</h2>
          <p style="color: #475569; line-height: 1.6;">Você já possui uma solicitação de redefinição ativa.</p>
          <p style="color: #475569; line-height: 1.6;">Segue novamente o link para redefinir sua senha:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetLink}" style="background-color: #1e293b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
              Redefinir Senha
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Se você não solicitou esta recuperação, ignore este email.</p>
        </div>
      `;

      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: 'Recuperação de Senha - Impéria Traduções',
        html,
      });

      if (!emailResult || (emailResult as any).error) {
        console.error('Error resending email via Resend:', JSON.stringify(emailResult));
        throw new Error('Failed to send email');
      }

      console.log('Password reset email re-sent to:', email);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Já existe uma solicitação ativa. Reenviamos o email com o link de recuperação.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate email token
    const emailToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // NOTE: password_reset_tokens.sms_token is NOT NULL in DB.
    // For email-only flow we store a placeholder and mark sms_verified=true.
    const smsTokenPlaceholder = Math.floor(100000 + Math.random() * 900000).toString();

    // Create password reset token (email-only flow)
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        email_token: emailToken,
        sms_token: smsTokenPlaceholder,
        sms_verified: true,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
      });

    if (tokenError) {
      console.error('Error creating reset token:', tokenError);
      throw tokenError;
    }

    // Send email with reset link (Resend)
    const resetLink = `${projectUrl}/reset-password?token=${emailToken}`;

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = "Imperia Traduções <noreply@appimperiatraducoes.com>";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e293b; margin: 0;">Impéria Traduções</h1>
        </div>
        <h2 style="color: #334155;">Olá ${profile.full_name || 'Usuário'},</h2>
        <p style="color: #475569; line-height: 1.6;">Recebemos uma solicitação para redefinir sua senha.</p>
        <p style="color: #475569; line-height: 1.6;">Clique no botão abaixo para criar uma nova senha:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #1e293b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
            Redefinir Senha
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Este link expira em <strong>30 minutos</strong>.</p>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Se você não solicitou esta recuperação, ignore este email. Sua senha permanecerá inalterada.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Por segurança, nunca compartilhe links de recuperação com ninguém.</p>
      </div>
    `;

    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Recuperação de Senha - Impéria Traduções',
      html,
    });

    if (!emailResult || (emailResult as any).error) {
      console.error('Error sending email via Resend:', JSON.stringify(emailResult));
      throw new Error('Failed to send email');
    }

    console.log('Password reset email sent to:', email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Instruções de recuperação enviadas para seu email.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in initiate-password-reset:', error);
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro. Tente novamente mais tarde.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
