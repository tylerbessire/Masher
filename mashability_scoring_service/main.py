import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import numpy as np
import traceback
import sys
import os
from scipy.spatial.distance import cosine

# --- Pydantic Models ---
class AnalysisResult(BaseModel):
    harmonic: Dict
    rhythmic: Dict
    spectral: Dict
    vocal: Dict

class UserWeights(BaseModel):
    harmonic: float = 0.35
    rhythmic: float = 0.35
    spectral: float = 0.15
    vocal: float = 0.15

class ScoringRequest(BaseModel):
    song1_analysis: AnalysisResult
    song2_analysis: AnalysisResult
    user_weights: Optional[UserWeights] = None

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

# --- Scoring Logic ---

def calculate_harmonic_breakdown(h1, h2):
    key_compat = 1.0 if h1['key'] == h2['key'] else 0.5 # Simplified
    chord_sim = 1.0 - abs(h1['chord_complexity'] - h2['chord_complexity'])
    return {
        "score": (key_compat + chord_sim) / 2 * 100,
        "key_compatibility": key_compat,
        "chord_similarity": chord_sim,
    }

def calculate_rhythmic_breakdown(r1, r2):
    tempo_ratio = min(r1['bpm'], r2['bpm']) / max(r1['bpm'], r2['bpm'])
    groove_sim = 1.0 - abs(r1['groove_stability'] - r2['groove_stability'])
    swing_compat = 1.0 - abs(r1['swing_factor'] - r2['swing_factor'])
    beat_conf = (r1['beat_confidence'] + r2['beat_confidence']) / 2

    score = np.average([tempo_ratio, groove_sim, swing_compat, beat_conf], weights=[0.4, 0.3, 0.2, 0.1]) * 100
    return {
        "score": score,
        "tempo_ratio": tempo_ratio,
        "groove_similarity": groove_sim,
        "swing_compatibility": swing_compat,
        "beat_confidence": beat_conf,
    }

def calculate_spectral_breakdown(s1, s2):
    mfcc1 = np.array(s1['mfccs']).mean(axis=1)
    mfcc2 = np.array(s2['mfccs']).mean(axis=1)
    mfcc_sim = 1 - cosine(mfcc1, mfcc2)

    brightness_compat = 1 - abs(s1['brightness'] - s2['brightness']) / max(s1['brightness'], s2['brightness'])
    range_compat = 1 - abs(s1['dynamic_range'] - s2['dynamic_range']) / max(s1['dynamic_range'], s2['dynamic_range'])

    score = np.average([mfcc_sim, brightness_compat, range_compat], weights=[0.5, 0.25, 0.25]) * 100
    return {
        "score": score,
        "mfcc_similarity": mfcc_sim,
        "brightness_compatibility": brightness_compat,
        "dynamic_range_compatibility": range_compat,
    }

def calculate_vocal_breakdown(v1, v2):
    presence1 = v1['vocal_presence']
    presence2 = v2['vocal_presence']
    # Overlap risk is high if both have high presence
    overlap_risk = presence1 * presence2
    # Good for mixing if one has vocals and the other doesn't
    score = (1 - overlap_risk) * 100 if presence1 > 0.5 or presence2 > 0.5 else 50
    return {
        "score": score,
        "vocal_presence_1": presence1,
        "vocal_presence_2": presence2,
        "overlap_risk": overlap_risk,
    }

def calculate_mashability(analysis1: dict, analysis2: dict, weights: dict):
    h_breakdown = calculate_harmonic_breakdown(analysis1['harmonic'], analysis2['harmonic'])
    r_breakdown = calculate_rhythmic_breakdown(analysis1['rhythmic'], analysis2['rhythmic'])
    s_breakdown = calculate_spectral_breakdown(analysis1['spectral'], analysis2['spectral'])
    v_breakdown = calculate_vocal_breakdown(analysis1['vocal'], analysis2['vocal'])

    overall_score = (
        h_breakdown['score'] * weights['harmonic'] +
        r_breakdown['score'] * weights['rhythmic'] +
        s_breakdown['score'] * weights['spectral'] +
        v_breakdown['score'] * weights['vocal']
    )

    return {
        "overall_score": overall_score,
        "dimension_scores": {
            "harmonic": h_breakdown['score'],
            "rhythmic": r_breakdown['score'],
            "spectral": s_breakdown['score'],
            "vocal": v_breakdown['score'],
        },
        "compatibility_breakdown": {
            "harmonic": h_breakdown,
            "rhythmic": r_breakdown,
            "spectral": s_breakdown,
            "vocal": v_breakdown,
        },
        "recommendations": ["Recommendation based on scores..."],
        "warnings": ["Warning based on scores..."],
    }

# --- API Endpoint ---
@app.post("/calculate-mashability")
async def calculate_mashability_endpoint(request: ScoringRequest):
    try:
        weights = request.user_weights.dict() if request.user_weights else UserWeights().dict()
        total_weight = sum(weights.values())
        if total_weight == 0: raise ValueError("Total weight cannot be zero.")
        norm_weights = {k: v / total_weight for k, v in weights.items()}

        result = calculate_mashability(request.song1_analysis.dict(), request.song2_analysis.dict(), norm_weights)
        return result
    except Exception as e:
        print(f"Error in /calculate-mashability: {e}", file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Main execution ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
