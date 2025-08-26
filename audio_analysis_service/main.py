import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
import traceback
import sys
import os
import numpy as np
import essentia.standard as es

# --- Pydantic Models for API ---
class AnalysisRequest(BaseModel):
    audioData: str  # base64 encoded audio string
    songId: str

# --- FastAPI App Initialization ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Stable and Robust Audio Analysis Logic ---
def run_stable_analysis(file_path: str):
    """
    Uses Essentia's robust, built-in MusicExtractor and correctly accesses the results.
    This is the final, stable version.
    """
    try:
        extractor = es.MusicExtractor()
        features = extractor(file_path)

        # Correctly access data from the Essentia Pool using dictionary-style keys
        # Provide default values for keys that might be missing
        analysis_result = {
            "version": "4.1-essentia-correct-access",
            "metadata": {
                "genre_tags": features['metadata.tags.genre'] if 'metadata.tags.genre' in features else ['unknown'],
            },
            "rhythmic": {
                "bpm": features['rhythm.bpm'] if 'rhythm.bpm' in features else 120.0,
                "beat_confidence": features['rhythm.beats_confidence'] if 'rhythm.beats_confidence' in features else 0.0,
            },
            "harmonic": {
                "key": features['tonal.key_key'] if 'tonal.key_key' in features else 'C',
                "scale": features['tonal.key_scale'] if 'tonal.key_scale' in features else 'major',
                "key_confidence": features['tonal.key_strength'] if 'tonal.key_strength' in features else 0.0,
            },
            "vocal": {
                "vocal_presence": features['voice_instrumental.voice_ratio'] if 'voice_instrumental.voice_ratio' in features else 0.5,
            },
            "spectral": {
                "brightness": np.mean(features['spectral.centroid']) if 'spectral.centroid' in features else 0.0,
            }
        }
        return analysis_result
    except Exception as e:
        print(f"CRITICAL: Essentia MusicExtractor failed: {e}", file=sys.stderr)
        traceback.print_exc()
        raise e

# --- API Endpoints ---
@app.post("/analyze")
async def analyze_endpoint(request: AnalysisRequest):
    temp_file_path = f"/tmp/{request.songId}.mp3"
    try:
        audio_bytes = base64.b64decode(request.audioData)
        with open(temp_file_path, "wb") as f:
            f.write(audio_bytes)
        
        analysis_results = run_stable_analysis(temp_file_path)
        
        return {"success": True, "songId": request.songId, "analysis": analysis_results}
    except Exception as e:
        print(f"Error in analyze_endpoint: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# --- Main execution ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)