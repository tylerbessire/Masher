import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict
import traceback
import sys
import os
from dotenv import load_dotenv
# import supabase

# Load environment variables from .env file
load_dotenv()
import tempfile
import numpy as np
import asyncio
import json
import requests

# Add current directory to Python path
sys.path.append(os.path.dirname(__file__))

# Import helper modules
from audio_ops import load_wav, save_wav, pitch_shift_semitones, stretch_to_grid_piecewise, apply_gain_db, apply_replay_gain
from transitions import s_curve_xfade
from align import plan_shifts

# --- Pydantic Models ---
class Masterplan(BaseModel):
    timeline: List[Dict]
    global_settings: Dict = {}

class SongInfo(BaseModel):
    song_id: str
    storage_path: str
    analysis: Dict

class RenderRequest(BaseModel):
    masterplan: Masterplan
    songs: List[SongInfo]
    job_id: str

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

# --- Supabase & API Clients ---
# SUPABASE_URL = os.environ.get("SUPABASE_URL")
# SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
# supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

# def invoke_supabase_function(function_name, payload):
#     # This is used to call other functions like the new stem separator
#     function_url = f"{SUPABASE_URL}/functions/v1/{function_name}"
#     headers = {'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json'}
#     response = requests.post(function_url, data=json.dumps(payload), headers=headers)
#     response.raise_for_status()
#     return response.json()

# --- Audio Processing Logic ---
async def render_mashup_streamer(plan: Dict, songs: List[Dict], job_id: str):
    sr = 44100
    total_steps = len(songs) + len(plan.get('timeline', [])) + 2
    current_step = 0

    def progress_update(message, step_increment=1):
        nonlocal current_step
        current_step += step_increment
        progress = int((current_step / total_steps) * 100)
        return f"data: {json.dumps({'progress': progress, 'message': message})}\n\n"

    try:
        # 1. Load audio for all songs
        tracks_data = {}
        for song in songs:
            song_id = song['song_id']
            yield progress_update(f"Loading audio for {song_id}...", 1)

            audio_path = song.get('storage_path')
            if not audio_path or not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file for {song_id} not found at {audio_path}")

            y, _ = load_wav(audio_path, sr=sr)
            tracks_data[song_id] = {"stems": {"mix": y}, "analysis": song.get('analysis', {})}
            await asyncio.sleep(0.1)

        # 2. Render each section
        master_track = np.array([], dtype=np.float32)
        for i, section in enumerate(plan.get('timeline', [])):
            yield progress_update(f"Rendering section {i+1}: {section.get('description', '')}", 1)

            section_len_samples = int(section.get('duration_sec', 10) * sr)
            section_audio = np.zeros((2, section_len_samples), dtype=np.float32) # Stereo

            for layer in section.get('layers', []):
                song_id = layer['songId']
                stem_name = layer.get('stem', 'mix')

                y = tracks_data.get(song_id, {}).get('stems', {}).get(stem_name)
                if y is None:
                    raise ValueError(f"Stem {stem_name} not found for {song_id}")

                start_sec = layer.get('start_sec', 0)
                start_sample = int(start_sec * sr)
                end_sample = start_sample + section_len_samples
                segment = y[:, start_sample:end_sample]

                # Apply effects, pitch, volume, etc.
                # This logic would be much more detailed in a full implementation
                if 'volume_db' in layer:
                    segment = apply_gain_db(segment, layer['volume_db'])

                if segment.shape[1] < section_audio.shape[1]:
                    segment = np.pad(segment, ((0,0), (0, section_audio.shape[1] - segment.shape[1])))

                section_audio += segment

            if master_track.shape[0] == 0:
                master_track = section_audio
            else:
                master_track = s_curve_xfade(master_track, section_audio, sr, bars=2, bpm=120)

            await asyncio.sleep(0.1)

        # 3. Final mastering
        yield progress_update("Applying mastering effects...", 1)
        master_track = apply_replay_gain(master_track, sr)

        # 4. Upload final file
        yield progress_update("Uploading final mashup...", 1)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_f:
            save_wav(temp_f.name, master_track, sr)
            temp_filepath = temp_f.name

        storage_path = f"generated/{job_id}.wav"
        # with open(temp_filepath, "rb") as f:
        #     supabase_client.storage.from_('mashups').upload(
        #         path=storage_path, file=f, file_options={"content-type": "audio/wav", "upsert": "true"}
        #     )
        os.unlink(temp_filepath)

        yield f"data: {json.dumps({'progress': 100, 'message': 'Complete!', 'storage_path': storage_path})}\n\n"

    except Exception as e:
        error_message = f"Error during rendering: {str(e)}"
        print(error_message, file=sys.stderr)
        traceback.print_exc()
        yield f"data: {json.dumps({'error': error_message})}\n\n"


# --- API Endpoint ---
@app.post("/execute-masterplan")
async def execute_masterplan_endpoint(request: RenderRequest):
    return StreamingResponse(
        render_mashup_streamer(request.masterplan.dict(), request.songs, request.job_id),
        media_type="text/event-stream"
    )

# --- Main execution ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

