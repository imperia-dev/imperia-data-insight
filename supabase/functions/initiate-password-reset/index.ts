import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

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
    const projectUrl = 'https://414fc41e-176f-45f7-9f94-7be36a4ca341.lovableproject.com';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { email }: InitiateResetRequest = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;

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

    if (existingToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Uma solicitação de recuperação já está ativa. Verifique seu email.' 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate email token
    const emailToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create password reset token (email-only flow, no SMS required)
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        email_token: emailToken,
        sms_token: null, // No SMS required
        sms_verified: true, // Skip SMS verification
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
      });

    if (tokenError) {
      console.error('Error creating reset token:', tokenError);
      throw tokenError;
    }

    // Send email with reset link
    const resetLink = `${projectUrl}/reset-password?token=${emailToken}`;
    
    // Send email via send-payment-email function (existing function that uses Resend)
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Recuperação de Senha - Impéria Traduções',
        html: `
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
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              Este link expira em <strong>30 minutos</strong>.
            </p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
              Se você não solicitou esta recuperação, ignore este email. Sua senha permanecerá inalterada.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
              Por segurança, nunca compartilhe links de recuperação com ninguém.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Error sending email:', errorText);
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
