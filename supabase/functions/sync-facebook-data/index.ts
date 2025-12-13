import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { sanitizeInput } from "../_shared/sanitization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const facebookToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN');

    console.log('Starting Facebook sync - Token configured:', !!facebookToken);

    if (!facebookToken) {
      console.log('Facebook access token not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Facebook access token not configured',
          message: 'Please configure your Facebook access token in the settings'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const { accountId, dateFrom, dateTo } = await req.json();

    if (!accountId || accountId === 'test') {
      console.log('Invalid or test account ID provided:', accountId);
      return new Response(
        JSON.stringify({ error: 'Please provide a valid Facebook Account ID (e.g., act_123456789)' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Syncing Facebook data for account ${accountId} from ${dateFrom} to ${dateTo}`);

    // Fetch account data
    const accountUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=name,currency&access_token=${facebookToken}`;
    const accountResponse = await fetch(accountUrl);
    const accountData = await accountResponse.json();

    if (accountData.error) {
      throw new Error(accountData.error.message);
    }

    // Store or update account
    const { error: accountError } = await supabase
      .from('facebook_accounts')
      .upsert({
        account_id: accountId,
        account_name: sanitizeInput(accountData.name),
        currency: accountData.currency,
        timezone: null // timezone field removed from API request
      }, {
        onConflict: 'account_id'
      });

    if (accountError) throw accountError;

    // Fetch campaigns
    const campaignsUrl = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,objective,start_time,stop_time,created_time&access_token=${facebookToken}`;
    const campaignsResponse = await fetch(campaignsUrl);
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.data) {
      for (const campaign of campaignsData.data) {
        // Get account UUID
        const { data: accountRecord } = await supabase
          .from('facebook_accounts')
          .select('id')
          .eq('account_id', accountId)
          .single();

        // Store campaign
        const { data: campaignRecord, error: campaignError } = await supabase
          .from('facebook_campaigns')
          .upsert({
            campaign_id: campaign.id,
            campaign_name: sanitizeInput(campaign.name),
            status: campaign.status,
            objective: campaign.objective,
            start_time: campaign.start_time,
            stop_time: campaign.stop_time,
            created_time: campaign.created_time,
            account_id: accountRecord?.id
          }, {
            onConflict: 'campaign_id'
          })
          .select()
          .single();

        if (campaignError) throw campaignError;

        // Fetch ad sets for this campaign
        const adSetsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/adsets?fields=id,name,status,daily_budget,lifetime_budget,bid_amount,targeting&access_token=${facebookToken}`;
        const adSetsResponse = await fetch(adSetsUrl);
        const adSetsData = await adSetsResponse.json();

        if (adSetsData.data) {
          for (const adSet of adSetsData.data) {
            // Store ad set
            const { data: adSetRecord, error: adSetError } = await supabase
              .from('facebook_ad_sets')
              .upsert({
                adset_id: adSet.id,
                adset_name: sanitizeInput(adSet.name),
                status: adSet.status,
                daily_budget: adSet.daily_budget,
                lifetime_budget: adSet.lifetime_budget,
                bid_amount: adSet.bid_amount,
                targeting: adSet.targeting,
                campaign_id: campaignRecord.id
              }, {
                onConflict: 'adset_id'
              })
              .select()
              .single();

            if (adSetError) throw adSetError;

            // Fetch ads for this ad set
            const adsUrl = `https://graph.facebook.com/v18.0/${adSet.id}/ads?fields=id,name,status,creative&access_token=${facebookToken}`;
            const adsResponse = await fetch(adsUrl);
            const adsData = await adsResponse.json();

            if (adsData.data) {
              for (const ad of adsData.data) {
                // Store ad
                await supabase
                  .from('facebook_ads')
                  .upsert({
                    ad_id: ad.id,
                    ad_name: sanitizeInput(ad.name),
                    status: ad.status,
                    creative: ad.creative,
                    adset_id: adSetRecord.id
                  }, {
                    onConflict: 'ad_id'
                  });
              }
            }
          }
        }
      }
    }

    // Fetch metrics (insights)
    const insightsParams = new URLSearchParams({
      access_token: facebookToken,
      fields: 'impressions,reach,frequency,clicks,spend,cpc,cpm,ctr,conversions,conversion_values,cost_per_conversion,video_views,engagement',
      level: 'ad',
      time_increment: '1',
      time_range: JSON.stringify({
        since: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        until: dateTo || new Date().toISOString().split('T')[0]
      })
    });

    const insightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?${insightsParams}`;
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();

    if (insightsData.data) {
      for (const insight of insightsData.data) {
        const date = insight.date_start;
        
        // Store metrics
        await supabase
          .from('facebook_metrics')
          .upsert({
            date,
            impressions: parseInt(insight.impressions || 0),
            reach: parseInt(insight.reach || 0),
            frequency: parseFloat(insight.frequency || 0),
            clicks: parseInt(insight.clicks || 0),
            spend: parseFloat(insight.spend || 0),
            cpc: parseFloat(insight.cpc || 0),
            cpm: parseFloat(insight.cpm || 0),
            ctr: parseFloat(insight.ctr || 0),
            conversions: parseInt(insight.conversions || 0),
            conversion_value: parseFloat(insight.conversion_values || 0),
            cost_per_conversion: parseFloat(insight.cost_per_conversion || 0),
            video_views: parseInt(insight.video_views || 0),
            engagement: parseInt(insight.engagement || 0)
          }, {
            onConflict: 'date,account_id'
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Facebook data synced successfully',
        campaigns: campaignsData.data?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing Facebook data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});