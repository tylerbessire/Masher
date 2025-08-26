const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { song1_analysis, song2_analysis, user_weights } = await req.json();

    if (!song1_analysis || !song2_analysis) {
      return new Response(JSON.stringify({
        error: 'Both song analyses are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const scoringApiUrl = Deno.env.get('SCORING_API_URL');
    if (!scoringApiUrl) {
        throw new Error('SCORING_API_URL environment variable is not set.');
    }

    // Forward to the Python scoring service
    const response = await fetch(`${scoringApiUrl}/calculate-mashability`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'bypass-tunnel-reminder': 'true'
      },
      body: JSON.stringify({
        song1_analysis,
        song2_analysis,
        user_weights
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mashability calculation failed: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      mashability: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Mashability scoring error:', error);
    return new Response(JSON.stringify({
      error: 'Mashability scoring failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
