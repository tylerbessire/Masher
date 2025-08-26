const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const separationApiUrl = Deno.env.get('SEPARATION_API_URL'); // Assuming this new env var
    if (!separationApiUrl) {
        throw new Error('SEPARATION_API_URL environment variable is not set.');
    }

    // Forward the request to the Python stem separation service
    const response = await fetch(`${separationApiUrl}/separate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'bypass-tunnel-reminder': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Stem separation failed: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in stem-separation proxy:', error.message);
    return new Response(JSON.stringify({
      error: 'Failed to separate stems',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
