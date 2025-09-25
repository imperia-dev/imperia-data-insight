import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendSMSRequest {
  phoneNumber: string;
  message: string;
  userId?: string;
  verificationType: 'password_reset' | 'phone_verification';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') as string;
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') as string;
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { phoneNumber, message, userId, verificationType }: SendSMSRequest = await req.json();

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      console.error('Invalid phone number format:', phoneNumber);
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Rate limiting: Check recent SMS sent to this number
    const { data: recentLogs } = await supabase
      .from('sms_verification_logs')
      .select('*')
      .eq('phone_number', phoneNumber)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .eq('status', 'sent');

    if (recentLogs && recentLogs.length >= 3) {
      console.error('Rate limit exceeded for phone number:', phoneNumber);
      return new Response(
        JSON.stringify({ error: 'Too many SMS requests. Please wait 10 minutes.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', phoneNumber);
    formData.append('From', twilioPhoneNumber);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      
      // Log failed attempt
      await supabase
        .from('sms_verification_logs')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          verification_type: verificationType,
          status: 'failed',
        });

      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: twilioData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful SMS send
    await supabase
      .from('sms_verification_logs')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        verification_type: verificationType,
        status: 'sent',
      });

    console.log('SMS sent successfully to:', phoneNumber);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: twilioData.sid,
        message: 'SMS sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});