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
    const resendApiKey = Deno.env.get('RESEND_API_KEY') as string;
    const projectUrl = 'https://414fc41e-176f-45f7-9f94-7be36a4ca341.lovableproject.com';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { email }: InitiateResetRequest = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number, phone_verified')
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

    // Check if phone number is verified
    if (!profile.phone_number || !profile.phone_verified) {
      return new Response(
        JSON.stringify({ 
          error: 'Phone number not verified. Please contact support for assistance.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Clean up any expired tokens
    await supabase.rpc('cleanup_expired_reset_tokens');

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
          error: 'A reset request is already active. Please check your email and SMS.' 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate tokens
    const emailToken = crypto.randomUUID();
    const { data: smsCodeData } = await supabase.rpc('generate_sms_code');
    const smsCode = smsCodeData || Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create password reset token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: profile.id,
        email_token: emailToken,
        sms_token: smsCode,
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
        subject: 'Recuperação de Senha - Verificação Necessária',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá ${profile.full_name || 'Usuário'},</h2>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>Para continuar, você precisará:</p>
            <ol>
              <li>Clicar no link abaixo para verificar seu email</li>
              <li>Inserir o código de 6 dígitos enviado via SMS</li>
              <li>Criar uma nova senha segura</li>
            </ol>
            <div style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verificar Email e Continuar
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Este link expira em 15 minutos. Se você não solicitou esta recuperação, ignore este email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              Por segurança, nunca compartilhe seus códigos de verificação com ninguém.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Error sending email:', await emailResponse.text());
      throw new Error('Failed to send email');
    }

    // Send SMS with verification code
    const smsMessage = `Seu código de verificação é: ${smsCode}. Válido por 15 minutos.`;
    
    const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: profile.phone_number,
        message: smsMessage,
        userId: profile.id,
        verificationType: 'password_reset',
      }),
    });

    if (!smsResponse.ok) {
      console.error('Error sending SMS:', await smsResponse.text());
      // Don't fail the whole process if SMS fails
    }

    console.log('Password reset initiated for:', email);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Instructions sent to your email and phone.',
        phoneNumber: profile.phone_number.replace(/(\d{2})(\d{5})(\d{4})/, '(**) *****-$3'), // Masked phone
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in initiate-password-reset:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again later.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});