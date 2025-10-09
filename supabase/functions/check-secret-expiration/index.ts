import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Check Secret Expiration Edge Function
 * 
 * Runs periodically to check for expiring secrets and send notifications.
 * Can be triggered manually or via cron job.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for expiring secrets...');

    // Get secrets expiring within 30 days
    const { data: expiringSecrets, error: checkError } = await supabase
      .rpc('check_secret_expiration');

    if (checkError) {
      console.error('Error checking secret expiration:', checkError);
      throw checkError;
    }

    if (!expiringSecrets || expiringSecrets.length === 0) {
      console.log('No expiring secrets found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expiring secrets found',
          checked_at: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiringSecrets.length} expiring secrets`);

    // Get all owner users to notify
    const { data: owners, error: ownersError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'owner');

    if (ownersError) {
      console.error('Error fetching owners:', ownersError);
      throw ownersError;
    }

    // Create notifications for each expiring secret
    const notifications = [];
    
    for (const secret of expiringSecrets) {
      const severity = secret.days_until_expiration <= 7 ? 'critical' : 'warning';
      const message = secret.days_until_expiration <= 0
        ? `Secret ${secret.secret_name} has EXPIRED and needs immediate rotation!`
        : `Secret ${secret.secret_name} will expire in ${secret.days_until_expiration} days`;

      // Create security alert
      for (const owner of owners) {
        const { error: alertError } = await supabase
          .rpc('trigger_security_alert', {
            p_alert_type: 'secret_expiring',
            p_severity: severity,
            p_title: 'Secret Expiration Warning',
            p_message: message,
            p_triggered_by: owner.user_id,
            p_metadata: {
              secret_name: secret.secret_name,
              days_until_expiration: secret.days_until_expiration,
              last_rotation: secret.last_rotation_date,
              rotation_type: secret.rotation_type
            }
          });

        if (alertError) {
          console.error(`Error creating alert for ${secret.secret_name}:`, alertError);
        } else {
          notifications.push({
            secret_name: secret.secret_name,
            notified_user: owner.user_id,
            days_until_expiration: secret.days_until_expiration
          });
        }
      }
    }

    // Send summary email if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && owners.length > 0) {
      // Get owner email
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', owners[0].user_id)
        .single();

      if (ownerProfile?.email) {
        const secretsList = expiringSecrets
          .map(s => `- ${s.secret_name}: ${s.days_until_expiration} days remaining`)
          .join('\n');

        const emailHtml = `
          <h2>Secret Rotation Required</h2>
          <p>The following secrets are expiring soon and need rotation:</p>
          <pre>${secretsList}</pre>
          <p><strong>Action required:</strong> Please rotate these secrets as soon as possible.</p>
          <p>Access your secret management dashboard to rotate secrets.</p>
        `;

        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Security <security@imperiatraducoes.com.br>',
              to: [ownerProfile.email],
              subject: `⚠️ Secret Rotation Alert - ${expiringSecrets.length} secrets expiring`,
              html: emailHtml
            })
          });

          if (!emailResponse.ok) {
            console.error('Failed to send email:', await emailResponse.text());
          } else {
            console.log('Email notification sent successfully');
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiring_secrets_count: expiringSecrets.length,
        notifications_sent: notifications.length,
        details: expiringSecrets,
        checked_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Check secret expiration error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
