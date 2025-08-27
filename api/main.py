from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Any
from uuid import uuid4

app = FastAPI(title="Masher API")
app.state.tracks = {}
app.state.pairs = {}

class TrackCreate(BaseModel):
  url: str = Field(..., example="https://example.com/foo.mp3")

class Track(BaseModel):
  id: str
  url: str

@app.post('/tracks:from_url', response_model=Track, status_code=201)
def tracks_from_url(payload: TrackCreate) -> Track:
  tid = str(uuid4())
  track = Track(id=tid, url=payload.url)
  app.state.tracks[tid] = track
  return track

@app.get('/tracks/{track_id}', response_model=Track)
def get_track(track_id: str) -> Track:
  if track_id not in app.state.tracks:
    raise HTTPException(status_code=404, detail="track_not_found")
  return app.state.tracks[track_id]

class PairCreate(BaseModel):
  a: str
  b: str

class Pair(BaseModel):
  id: str
  a: str
  b: str

@app.post('/pairs', response_model=Pair, status_code=201)
def create_pair(payload: PairCreate) -> Pair:
  tracks = app.state.tracks
  pairs = app.state.pairs
  if payload.a not in tracks or payload.b not in tracks:
    raise HTTPException(status_code=400, detail="unknown_track")
  pid = str(uuid4())
  pair = Pair(id=pid, a=payload.a, b=payload.b)
  pairs[pid] = pair
  return pair

@app.post('/analyze/{track_id}')
def analyze(track_id: str) -> Dict[str, str]:
  if track_id not in app.state.tracks:
    raise HTTPException(status_code=404, detail="track_not_found")
  return {"status": "ok", "track_id": track_id}

@app.post('/plan/{pair_id}')
def plan(pair_id: str) -> Dict[str, str]:
  if pair_id not in app.state.pairs:
    raise HTTPException(status_code=404, detail="pair_not_found")
  return {"status": "ok", "pair_id": pair_id}

@app.post('/render/{pair_id}')
def render(pair_id: str) -> Dict[str, str]:
  if pair_id not in app.state.pairs:
    raise HTTPException(status_code=404, detail="pair_not_found")
  return {"status": "ok", "pair_id": pair_id}

class PatchOps(BaseModel):
  ops: List[dict]

@app.post('/plan/{pair_id}/patch')
def patch_plan(pair_id: str, payload: PatchOps) -> Dict[str, Any]:
  if pair_id not in app.state.pairs:
    raise HTTPException(status_code=404, detail="pair_not_found")
  return {"status": "patched", "ops": len(payload.ops), "pair_id": pair_id}

jobs: List[dict] = []

@app.get('/jobs')
def list_jobs() -> List[dict]:
  return jobs
