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
    const { songs, analysisData } = await req.json();
    
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Prepare detailed context for the AI, using the rich data from our new analysis function
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
You are Syncrasis, an AI DJ and legendary mashup artist. Your task is to create a detailed, professional production plan for a mashup of the provided songs. Deliver this plan as a single, valid JSON object, without any additional commentary or markdown.

Here is the deep musical analysis of the tracks:
${songsContext}

Based on this rich data, create the architectural blueprint for a 2-3 minute masterpiece. Your plan must follow this JSON structure precisely:

{
  "title": "Your evocative, unforgettable title",
  "artistCredits": "Artist A vs. Artist B",
  "concept": "Your 1-2 sentence story or theme. Make it compelling.",
  "genre": "A plausible genre for the mashup (e.g., 'Progressive House', 'Synthwave Pop')",
  "emotionalArc": {
    "description": "Describe the emotional journey, e.g., 'Starts melancholic, builds to a euphoric climax, and resolves with a sense of hope.'",
    "curve": [
      {"time": "0%", "intensity": 0.2, "mood": "Introspective"},
      {"time": "25%", "intensity": 0.5, "mood": "Building Tension"},
      {"time": "50%", "intensity": 0.8, "mood": "Energetic Peak"},
      {"time": "75%", "intensity": 1.0, "mood": "Euphoric Climax"},
      {"time": "100%", "intensity": 0.3, "mood": "Reflective Outro"}
    ]
  },
  "problemsAndSolutions": [
    {
      "problem": "The keys of the two songs are harmonically distant.",
      "solution": "Pitch-shift the vocals of Song 2 up by 2 semitones to match Song 1's key of C Major. The instrumental stems will be adjusted to fit the new harmony."
    },
    {
      "problem": "The tempos have a significant difference (110 vs 128 BPM).",
      "solution": "Use Song 2's 128 BPM as the target. Time-stretch Song 1 using a high-quality algorithm, preserving vocal formants, to match this tempo."
    }
  ],
  "global": {
    "targetBPM": 128,
    "targetKey": "A Minor"
  },
  "timeline": [
    {
      "time_start": "0:00",
      "duration_seconds": 20,
      "description": "The Spark - An atmospheric intro that sets the mood.",
      "layers": [
        { "songId": "song_id_1", "stem": "ambience", "volume_db": -5, "effect": "long reverb" },
        { "songId": "song_id_2", "stem": "drums", "volume_db": -8, "filter": "low-pass 200Hz, building up" }
      ]
    }
  ],
  "quickSuggestions": [
    "Make it more energetic and danceable.",
    "Emphasize the bass and drums more.",
    "Create a slower, more emotional bridge section.",
    "Add more vocal harmonies and ad-libs.",
    "Make the transitions between sections smoother and more creative.",
    "Introduce a surprising element from a third genre."
  ]
}

Key Directives:
- **Use the Data**: Your decisions for target BPM, key, and arrangement must be justified by the provided analysis data.
- **Emotional Arc**: The timeline must reflect the journey described in 'emotionalArc'.
- **Problem Solving**: Identify at least one potential harmonic or rhythmic clash from the data and propose a specific, professional solution in 'problemsAndSolutions'.
- **Genre Coherence**: The 'genre' should be a creative but logical fusion based on the source tracks.
- **Quick Suggestions**: Provide 6 varied, creative, and actionable suggestions for how the user could iterate on this plan.
- **Be Specific**: In the timeline layers, be precise about which stems to use and why.

This is your canvas. Paint a masterpiece. Create a mashup that feels inevitable, like the songs were always meant to be together. The JSON is your score. Write it.
`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229', // Using a model known for strong JSON output
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

    // Attempt to parse the JSON response
    let mashupPlan;
    try {
      mashupPlan = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse JSON from Claude's response:", rawText);
      throw new Error("AI returned a malformed creative plan. Could not parse JSON.");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...mashupPlan
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in claude-mashup-director:', error.message);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get creative direction', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});