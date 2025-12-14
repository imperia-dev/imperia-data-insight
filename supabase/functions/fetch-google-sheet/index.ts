import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const sheetId = Deno.env.get('GOOGLE_SHEET_ID');
    
    if (!sheetId) {
      console.error('GOOGLE_SHEET_ID secret not configured');
      return new Response(
        JSON.stringify({ error: 'Google Sheet ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for optional gid parameter
    let gid = '533199022'; // Default gid
    try {
      const body = await req.json();
      if (body.gid) {
        gid = body.gid;
      }
    } catch {
      // No body or invalid JSON, use default gid
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    
    console.log('Fetching Google Sheet data');

    const response = await fetch(sheetUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch sheet:', response.status);
      return new Response(
        JSON.stringify({ error: `Failed to fetch sheet: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const csvText = await response.text();
    
    console.log('Successfully fetched sheet data, length:', csvText.length);

    return new Response(
      JSON.stringify({ csv: csvText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-google-sheet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
