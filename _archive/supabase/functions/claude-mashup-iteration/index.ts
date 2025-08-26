const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mashupPlan, userFeedback, songs, analysisData } = await req.json();

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const songsContext = songs.map((song: any, index: number) => {
      const analysis = analysisData?.[index]?.spectralFeatures || {};
      const keyInfo = analysis.key || {};
      const beatGrid = analysis.beat_grid || {};
      const rhythm = analysis.rhythm || {};
      const spectral = analysis.spectral_balance || {};
      const roughness = analysis.roughness || {};

      return `
Song ${index + 1} (id: "${song.song_id}"): "${song.name}" by ${song.artist}"
- **Key**: ${keyInfo.name} (${keyInfo.camelot}) with confidence ${keyInfo.confidence?.toFixed(2)}. Tuning is off by ${keyInfo.cents_off?.toFixed(1)} cents.
- **Tempo**: ${beatGrid.bpm?.toFixed(1)} BPM with confidence ${beatGrid.bpm_confidence?.toFixed(2)}.
- **Rhythm**: Pulse clarity is ${rhythm.pulse_clarity?.toFixed(3)}, complexity is ${rhythm.rhythmic_complexity?.toFixed(3)}.
- **Spectral Balance**: Low/Mid/High content: ${spectral.low_freq_content?.toFixed(3)} / ${spectral.mid_freq_content?.toFixed(3)} / ${spectral.high_freq_content?.toFixed(3)}.
- **Timbre**: Brightness is ${analysis.brightness?.toFixed(3)}, estimated psychoacoustic roughness is ${roughness.estimated_roughness?.toFixed(3)}.
- **Energy**: Overall energy level is ${analysis.energy?.toFixed(3)}.
      `.trim();
    }).join('\n\n');

    const prompt = `
You are a world-class professional mashup artist and DJ, acting as an AI music production engine. Your task is to revise an existing mashup production plan based on user feedback.

The final output MUST be a single, valid JSON object, identical in structure to the original plan. Do not include any text, markdown, or formatting outside of the JSON object itself.

Here is the musical analysis of the source tracks:
${songsContext}

Here is the original mashup production plan:
${JSON.stringify(mashupPlan, null, 2)}

The user has provided the following feedback for revision:
"${userFeedback}"

Based on this feedback, revise the production plan. Modify the 'title', 'concept', 'global' settings, and 'timeline' as needed to incorporate the user's suggestions. Ensure the new plan is creative, musically coherent, and directly addresses the feedback.

The songId for each layer in the timeline must match one of the song IDs provided in the analysis.

Produce the revised and complete JSON production plan now.
`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorBody}`);
    }

    const responseData = await response.json();
    const rawText = responseData.content[0].text;

    let newMashupPlan;
    try {
      newMashupPlan = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse JSON from Claude's response:", rawText);
      throw new Error("AI returned a malformed creative plan. Could not parse JSON.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...newMashupPlan
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in claude-mashup-iteration:', error.message);
    return new Response(
      JSON.stringify({
        error: 'Failed to get revised creative direction',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
