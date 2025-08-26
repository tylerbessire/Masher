import uvicorn
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import traceback
import sys
import os
import httpx
import json

# --- Pydantic Models ---
class OrchestrationRequest(BaseModel):
    song1_analysis: Dict
    song2_analysis: Dict
    mashability_score: Dict
    user_preferences: Dict = {}

# --- FastAPI App ---
app = FastAPI()

# Set up CORS
origins = [
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Claude "Kill_mR_DJ" Logic ---
async def create_masterplan(request: OrchestrationRequest, anthropic_api_key: str):
    if not anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY not provided")

    # Helper to create a concise summary of song analysis
    def summarize_analysis(song_title, analysis):
        try:
            summary = {
                "title": song_title,
                "bpm": analysis.get("rhythmic", {}).get("bpm"),
                "key": f"{analysis.get('harmonic', {}).get('key')} {analysis.get('harmonic', {}).get('scale')}",
                "genres": analysis.get("metadata", {}).get("genre_tags", []),
                "moods": analysis.get("mood", {}).get("mood_tags", []),
                "instruments": analysis.get("instrumental", {}).get("instrument_tags", [])
            }
            return summary
        except Exception:
            return analysis # Fallback to raw dump if summarization fails

    # Create concise summaries
    song1_summary = summarize_analysis("Song 1", request.song1_analysis)
    song2_summary = summarize_analysis("Song 2", request.song2_analysis)

    context = f"""
# Song 1 Summary
{json.dumps(song1_summary, indent=2)}

# Song 2 Summary
{json.dumps(song2_summary, indent=2)}

# Mashability Score
{json.dumps(request.mashability_score, indent=2)}
    """

    prompt = f"""
You are Kill_mR_DJ, a legendary AI music producer. Your task is to create a professional-grade mashup masterplan based on the provided data. The output must be a single, valid JSON object, with no conversational text or markdown formatting.

DATA:
{context}

INSTRUCTIONS:
Create a "masterplan" with the following structure. Be incredibly detailed.

{{
  "creative_vision": "A 2-3 sentence, highly evocative description of the mashup's story and feel.",
  "masterplan": {{
    "title": "A memorable title.",
    "artistCredits": "Artist A vs. Artist B",
    "global": {{
      "targetBPM": {request.mashability_score.get('average_bpm', 120)},
      "targetKey": "{request.mashability_score.get('compatible_keys', ['C Major'])[0]}"
    }},
    "timeline": [
      {{
        "time_start_sec": 0,
        "duration_sec": 20,
        "description": "Intro: Start with an element from one song, then bring in a complementary element from the other.",
        "energy_level": 0.2,
        "layers": [
          {{ "songId": "song1", "stem": "vocals", "volume_db": -6, "effects": ["reverb", "delay"] }},
          {{ "songId": "song2", "stem": "other", "volume_db": -10, "effects": ["high-pass-filter-800hz"] }}
        ]
      }}
    ],
    "problems_and_solutions": [
      {{
        "problem": "Identify a potential clash between the two songs.",
        "solution": "Propose a specific studio production technique to solve the problem (e.g., sidechain compression, EQ carving)."
      }}
    ]
  }}
}}
"""
    
    request_payload = {
        'model': 'claude-3-opus-20240229',
        'max_tokens': 4096,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.5,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': anthropic_api_key,
                    'anthropic-version': '2023-06-01',
                },
                json=request_payload,
                timeout=120,
            )
        response.raise_for_status()
        response_data = response.json()
        raw_text = response_data['content'][0]['text']

        # Find the start of the JSON object
        json_start_index = raw_text.find('{')
        if json_start_index == -1:
            raise ValueError("No JSON object found in the Anthropic response.")
        
        # Extract and parse the JSON
        json_str = raw_text[json_start_index:]
        return json.loads(json_str)

    except httpx.HTTPStatusError as e:
        print(f"HTTP Error from Anthropic: {e.response.status_code}")
        print("Anthropic Response Body:", e.response.text)
        raise e
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print("Raw text that failed to parse:", raw_text)
        raise ValueError("Failed to parse JSON from Anthropic's response.")

# --- API Endpoint ---
@app.post("/create-masterplan")
async def orchestrator_endpoint(request: OrchestrationRequest, authorization: Optional[str] = Header(None)):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")
        
        api_key = authorization.split(" ")[1]
        masterplan_response = await create_masterplan(request, api_key)
        return masterplan_response
    except Exception as e:
        print(f"Error during masterplan creation: {e}", file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create masterplan: {str(e)}")

# --- Main execution ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
