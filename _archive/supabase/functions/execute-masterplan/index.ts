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

    const processingApiUrl = Deno.env.get('PROCESSING_API_URL');
    if (!processingApiUrl) {
        throw new Error('PROCESSING_API_URL environment variable is not set.');
    }

    // Forward the request to the Python processing service
    const response = await fetch(`${processingApiUrl}/execute-masterplan`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'bypass-tunnel-reminder': 'true'
      },
      body: JSON.stringify(body)
    });

    // Crucially, return the streaming response directly
    return new Response(response.body, {
        status: response.status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
        }
    });

  } catch (error) {
    console.error('Error in execute-masterplan proxy:', error.message);
    return new Response(JSON.stringify({
      error: 'Failed to execute masterplan',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
