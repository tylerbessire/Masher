import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback
import sys
import os
from dotenv import load_dotenv
# import supabase

# Load environment variables from .env file
load_dotenv()
import tempfile
import requests
import torch
import torchaudio
from demucs.pretrained import get_model
from demucs.apply import apply_model
import soundfile as sf

# --- Pydantic Models ---
class SeparationRequest(BaseModel):
    audio_url: str
    job_id: str # To associate stems with a mashup job

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

# --- Supabase Client ---
# SUPABASE_URL = os.environ.get("SUPABASE_URL")
# SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
# supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Stem Separation Logic ---
def separate_stems(audio_bytes: bytes, job_id: str):
    print(f"Starting stem separation for job {job_id}...")

    # 1. Load audio tensor
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    with tempfile.NamedTemporaryFile(suffix=".wav") as temp_in_f:
        temp_in_f.write(audio_bytes)
        temp_in_f.seek(0)
        wav, sr = torchaudio.load(temp_in_f.name)
        wav = wav.to(device)

    # 2. Apply Demucs model
    model = get_model("htdemucs").to(device)
    model.eval()
    with torch.no_grad():
        # Demucs expects a batch dimension
        stems = apply_model(model, wav[None], split=True, overlap=0.25)[0]

    stem_names = ["drums", "bass", "other", "vocals"]
    stem_paths = {}

    # 3. Save each stem and upload to storage
    for i, name in enumerate(stem_names):
        print(f"Processing stem: {name}")
        stem_audio = stems[i].cpu().numpy().T

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_out_f:
            sf.write(temp_out_f.name, stem_audio, sr, subtype="PCM_16")
            temp_filepath = temp_out_f.name

        storage_path = f"stems/{job_id}/{name}.wav"
        # with open(temp_filepath, "rb") as f:
        #     supabase_client.storage.from_('mashups').upload(
        #         path=storage_path,
        #         file=f,
        #         file_options={"content-type": "audio/wav", "upsert": "true"}
        #     )
        os.unlink(temp_filepath)
        stem_paths[name] = storage_path
        print(f"Uploaded {name} to {storage_path}")

    return stem_paths

# --- API Endpoint ---
@app.post("/separate")
async def separate_endpoint(request: SeparationRequest):
    try:
        # Download the audio file from the provided URL
        response = requests.get(request.audio_url)
        response.raise_for_status()
        audio_bytes = response.content

        # Run separation
        stem_storage_paths = separate_stems(audio_bytes, request.job_id)

        return {
            "success": True,
            "job_id": request.job_id,
            "stems": stem_storage_paths
        }
    except Exception as e:
        print(f"Error during stem separation: {e}", file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to separate stems: {str(e)}")

# --- Main execution ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8004))

    uvicorn.run(app, host="0.0.0.0", port=port)
