# Masher: AI‑Powered Music Mashup Studio (Technical Vision)

> This README is a **blueprint** for engineers and orchestration AIs (e.g., Gemini, Claude) to implement Masher end‑to‑end. It specifies pipeline stages, service boundaries, data contracts, Claude’s system prompt, and the DAW+chat interaction model (ClauDOW™).

---

## Visual Overview

![Masher Home](assets/masher-home.png)
![YouTube Search](assets/youtube-search.png)
![Stem Separation](assets/stems.png)
![Analysis Dashboard](assets/analysis.png)
![AI Masterplan](assets/masterplan.png)
![DAW + ClauDOW](assets/daw-chat.png)

> **Note:** Replace placeholders under `assets/` with real screenshots.

---

## Development Setup

1. **Install Python deps**
   ```bash
   pip install -r requirements.txt
   ```
2. **Install Node deps**
   ```bash
   npm install
   ```
3. **Run the full stack**
   ```bash
   ./start-app.sh
   ```

This script launches background services, the FastAPI app on <http://localhost:8080>, and the React dev server on <http://localhost:5173>. Hit `Ctrl+C` to stop everything.

### Testing

```bash
PYTHONPATH=. pytest -q
npm test
```

---

## 0) Product Goals

1. **Zero-to-draft:** From two YouTube URLs to a first-pass mashup automatically.
2. **AI as engineer + human ear:** Claude produces a detailed masterplan, renders a draft, and iterates like a producer.
3. **Interactive DAW in browser (ClauDOW™):** Users (and Claude) can edit *to the millisecond* with reversible operations.
4. **Deterministic + reproducible:** Every render + edit is captured as structured ops; projects replay exactly across machines.

---

## 1) End‑to‑End Pipeline

```text
[YouTube Search] → [Download] → [Stem Separation] → [Advanced Analysis]
→ [Mashability Score] → [Claude Masterplan] → [Auto Render]
→ [DAW (ClauDOW) + Chat Iteration] → [Export]
```

### Stage A — Acquisition

* **Service:** `svc-ytdlp` (FastAPI)
* **Input:** Query or YouTube URL
* **Ops:** Search → select → download best audio (m4a/webm) → transcode to 44.1 kHz WAV
* **Output:** `TrackAsset` (see Data Contracts)

### Stage B — Stem Separation

* **Service:** `svc-stems` (Demucs/UVR)
* **Input:** WAV
* **Ops:** Split into stems: `vocals, drums, bass, guitar, keys, other`
* **Output:** `StemAsset[]`

### Stage C — Advanced Analysis

* **Service:** `svc-analysis` (Essentia + Librosa)
* **Features (per stem + full mix):** BPM, key+mode+cent, tuning offset, beat grid, sections, energy/loudness, spectral centroid/rolloff, chroma, MFCC
* **Output:** `AnalysisReport`

### Stage D — Mashability

* **Service:** `svc-compat`
* **Input:** Two `AnalysisReport`s
* **Ops:** Compute tempo delta, harmonic distance (semitones + Camelot), beat alignment, spectral overlap
* **Output:** `CompatReport` + recommended `transformations`

### Stage E — Masterplan (Claude)

* **Service:** `svc-orchestrator` (Claude API)
* **Input:** Track/Stem assets + `AnalysisReport`s + `CompatReport`
* **Output:** `MashupPlan` (timeline, transforms, FX, arrangement narrative)

### Stage F — Auto Render

* **Service:** `svc-render` (Librosa/Sox; future WASM/ffmpeg hybrid)
* **Ops:** Apply time‑stretch, pitch‑shift, cuts, fades, crossfades, per‑clip FX
* **Output:** Draft mix WAV + `ProjectState`

### Stage G — DAW + ClauDOW™

* **Frontend:** React/TS + WebAudio + WASM DSP
* **Capabilities:** Multi‑track timeline, waveform, spectrogram, clip ops (cut/move/slide/dup/reverse), per‑clip key/BPM, FX chains
* **Chat:** Claude executes DAW actions, explains changes, supports undo/redo, and can propose alternates.

---

## 2) Service Architecture (reference)

| Service            | Port | Responsibilities              |
| ------------------ | ---: | ----------------------------- |
| `svc-ytdlp`        | 7999 | Search, download, transcode   |
| `svc-stems`        | 8000 | Demucs/UVR GPU split          |
| `svc-analysis`     | 8001 | Essentia + Librosa features   |
| `svc-compat`       | 8002 | Compatibility scoring         |
| `svc-orchestrator` | 8003 | Claude masterplan + iteration |
| `svc-render`       | 8004 | Deterministic renderer        |

> All services emit structured events over SSE/WebSocket for progress.

---

## 3) Data Contracts (TypeScript types)

```ts
// Core file assets
export type TrackAsset = {
  id: string;               // content hash (sha256 of PCM)
  title: string;
  source: { type: 'youtube'; url: string; videoId: string } | { type: 'upload' };
  wavPath: string;          // normalized 44.1 kHz stereo WAV
  durationSec: number;
};

export type StemKind = 'vocals'|'drums'|'bass'|'guitar'|'keys'|'other';
export type StemAsset = {
  id: string; trackId: string; kind: StemKind; wavPath: string; gainDb: number;
};

export type BeatGrid = { bpm: number; confidence: number; doubleTime: boolean; gridMs: number[] };
export type KeyInfo = { key: string; mode: 'major'|'minor'; cents: number; confidence: number };
export type Section = { label: 'intro'|'verse'|'chorus'|'bridge'|'solo'|'outro'|'unknown'; startSec: number; endSec: number };

export type AnalysisReport = {
  trackId: string;
  stems: Record<StemKind, { rms: number; spectralCentroid: number; chromaMean: number[] }>;
  full: {
    beat: BeatGrid; key: KeyInfo; loudness: number; spectralRolloff: number; mfccMean: number[];
    sections: Section[];
  };
};

export type CompatReport = {
  tempoDelta: number; harmonicDistanceSemitones: number; camelot: 'same'|'relative'|'fifth'|'adjacent'|'clashy';
  beatAlignment: number; spectralOverlap: number; readiness: number;
  recommendations: { timeStretchA?: number; timeStretchB?: number; pitchShiftA?: number; pitchShiftB?: number };
};

export type Transform =
  | { op: 'time_stretch'; clipId: string; rate: number }
  | { op: 'pitch_shift'; clipId: string; semitones: number }
  | { op: 'gain'; clipId: string; db: number }
  | { op: 'cut'; clipId: string; atMs: number }
  | { op: 'slice'; clipId: string; startMs: number; endMs: number }
  | { op: 'move'; clipId: string; deltaMs: number }
  | { op: 'xfade'; aClipId: string; bClipId: string; durationMs: number }
  | { op: 'reverse'; clipId: string }
  | { op: 'fx'; clipId: string; kind: 'eq'|'reverb'|'delay'|'distortion'; params: Record<string,number> };

export type Clip = { id: string; stemId: string; startMs: number; endMs: number; trackLane: number; transforms: Transform[] };
export type Timeline = { sampleRate: 44100|48000; lanes: number; clips: Clip[] };

export type MashupPlan = {
  narrative: string;                         // e.g., Kill Mr DJ prank vs epic ballad
  global: { targetBpm: number; targetKey?: string };
  timeline: Timeline;                        // initial arrangement
  post: { limiter: boolean; headroomDb: number };
  notes: string[];                           // rationale for each major decision
};

export type ProjectState = {
  projectId: string;
  tracks: TrackAsset[];
  stems: StemAsset[];
  analysis: Record<string, AnalysisReport>;  // by trackId
  plan: MashupPlan;
  history: Transform[];                      // ordered, for exact replay & undo
};
```

---

## 4) API Surface (minimal)

```http
POST /api/search?q=QUERY → { results: {title, videoId, channel}[] }
POST /api/download { videoId } → TrackAsset
POST /api/stems { trackId } → StemAsset[]
POST /api/analyze { trackId } → AnalysisReport
POST /api/compat { trackIdA, trackIdB } → CompatReport
POST /api/masterplan { trackIdA, trackIdB } → MashupPlan
POST /api/render { plan, stems } → { wavPath, projectState }
GET  /api/project/:id → ProjectState
POST /api/project/:id/ops { Transform[] } → { projectState }
```

Events (SSE/WebSocket): `download.progress`, `stems.progress`, `render.progress`, `project.updated`.

---

## 5) Claude Orchestrator — System Prompt (authoritative)

```
ROLE: Professional mashup artist + mix engineer + editor
GOAL: Deliver a compelling first-draft mashup automatically, then iterate with the user in ClauDOW™ with millisecond precision.

PRINCIPLES:
1) Narrative first: choose an angle (e.g., trickster vs. tragic hero). Document it.
2) Respect the science: use provided BPM/key/sections; normalize double/half-time.
3) Embrace contrast: clashes can be features; explain when you intentionally keep them.
4) Determinism: every edit must be an explicit Transform op; avoid freehand changes.
5) Latency: prefer fewer, larger ops; batch edits when possible.

PROCESS:
A) Read AnalysisReports + CompatReport → set targetBpm/targetKey.
B) Build Timeline: choose stems, bars, and entry/exit points; propose FX where needed.
C) Output MashupPlan JSON (no prose interleaved). Then emit a short rationale.
D) Call /api/render. On success, push project to DAW and announce decisions.
E) During chat: interpret user intent → produce Transform ops (only). Explain changes succinctly.

GUARDRAILS:
- Never invent assets. Only reference known clip/stem IDs.
- Never flatten without saving Transform history.
- If analysis is low-confidence, state assumptions and produce two alternate plans.
```

### Few‑shot (DAW iteration)

**User:** “Nudge the vocals back 120ms and lower guitars 2 dB in the chorus.”

**Claude (ops):**

```json
[
  {"op":"move","clipId":"vox_12","deltaMs":-120},
  {"op":"gain","clipId":"gtr_44","db":-2}
]
```

**Claude (explain):** "Shifted vocals −120ms for tighter consonants on the downbeat; pulled guitars −2 dB to clear space."

---

## 6) Renderer Notes

* **Time‑stretch / pitch‑shift:** phase‑vocoding w/ transient preservation; formant‑aware for vocals when available.
* **Crossfades:** equal‑power default; linear for percussive overlaps.
* **Limiter:** soft‑clip w/ −0.8 dBFS ceiling by default; configurable in `plan.post`.
* **Reproducibility:** seed all stochastic paths; hash assets and bake into \`projec
