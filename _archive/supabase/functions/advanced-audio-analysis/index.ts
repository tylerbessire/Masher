const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpectralAnalysisRequest {
  audioData: string; // base64 encoded audio
  songId: string;
}

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioData, songId }: SpectralAnalysisRequest = await req.json();

    if (!audioData || !songId) {
      return new Response(
        JSON.stringify({ error: 'Audio data and song ID are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const pythonApiUrl = Deno.env.get('ANALYSIS_API_URL');
    if (!pythonApiUrl) {
        throw new Error('ANALYSIS_API_URL environment variable is not set.');
    }

    console.log(`Forwarding spectral analysis for song ${songId} to Python API...`);

    const response = await fetch(`${pythonApiUrl}/analyze`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0',
            'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({ audioData, songId }), // Pass songId as well
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Python API error: ${errorBody}`);
        throw new Error(`Analysis failed: Python API returned status ${response.status}`);
    }

    const analysisResult = await response.json();

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in advanced-audio-analysis function:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process spectral analysis',
        details: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
