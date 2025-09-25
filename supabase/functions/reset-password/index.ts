import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  userId: string;
  emailToken: string;
  newPassword: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { userId, emailToken, newPassword }: ResetPasswordRequest = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null;

    // Get and verify the reset token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('email_token', emailToken)
      .eq('used', false)
      .eq('email_verified', true)
      .eq('sms_verified', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !resetToken) {
      console.error('Token not found or not fully verified:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or incomplete verification' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate IP address if available
    if (resetToken.ip_address && ipAddress && resetToken.ip_address !== ipAddress) {
      console.warn('IP address mismatch for password reset:', {
        original: resetToken.ip_address,
        current: ipAddress,
      });
      // Log suspicious activity but don't block the reset
      await supabase.rpc('log_security_event', {
        p_event_type: 'password_reset_ip_mismatch',
        p_severity: 'warning',
        p_details: {
          user_id: userId,
          original_ip: resetToken.ip_address,
          current_ip: ipAddress,
        },
      });
    }

    // Check if password is compromised
    const checkPwnedResponse = await fetch(`${supabaseUrl}/functions/v1/check-pwned-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const pwnedData = await checkPwnedResponse.json();
    
    if (pwnedData.isPwned) {
      return new Response(
        JSON.stringify({ 
          error: 'This password has been found in data breaches. Please choose a different password.',
          isPwned: true,
          occurrences: pwnedData.occurrences,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      throw updateError;
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id);

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Send confirmation email
    if (profile) {
      await fetch(`${supabaseUrl}/functions/v1/send-payment-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: profile.email,
          subject: 'Senha alterada com sucesso',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Olá ${profile.full_name || 'Usuário'},</h2>
              <p>Sua senha foi alterada com sucesso.</p>
              <p>Se você não realizou esta alteração, entre em contato imediatamente com o suporte.</p>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Data da alteração: ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          `,
        }),
      });
    }

    // Log the password reset
    await supabase.rpc('log_security_event', {
      p_event_type: 'password_reset_completed',
      p_severity: 'info',
      p_details: {
        user_id: userId,
        reset_method: 'email_sms_verification',
      },
    });

    console.log('Password reset completed for user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in reset-password:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to reset password' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});