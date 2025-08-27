from __future__ import annotations

import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List

import numpy as np
import librosa
import pyloudnorm
import essentia
import essentia.standard as es
from importlib import metadata

from schemas.models import Analysis, KeyInfo, Section, ChordSegment, Provenance

_PITCHES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]

_MAJOR_TEMPLATE = np.array([1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0])
_MINOR_TEMPLATE = np.array([1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0])
_DOM7_TEMPLATE = np.array([1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0])

_CAMELot_MAJOR = {
    "C": "8B", "C#": "3B", "D": "10B", "Eb": "5B", "E": "12B", "F": "7B",
    "F#": "2B", "G": "9B", "Ab": "4B", "A": "11B", "Bb": "6B", "B": "1B",
}
_CAMELot_MINOR = {
    "C": "5A", "C#": "12A", "D": "7A", "Eb": "2A", "E": "9A", "F": "4A",
    "F#": "11A", "G": "6A", "Ab": "1A", "A": "8A", "Bb": "3A", "B": "10A",
}


def _camelot(key: str, mode: str) -> str:
    return (_CAMELot_MAJOR if mode == "major" else _CAMELot_MINOR)[key]


def _beatgrid(y: np.ndarray, sr: int) -> List[int]:
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo_l, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
    beat_ms = (librosa.frames_to_time(beat_frames, sr=sr) * 1000).astype(int).tolist()
    return tempo_l, beat_frames, beat_ms, onset_env


def _sections(y: np.ndarray, sr: int) -> List[Section]:
    hop = 512
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop)
    S = librosa.segment.recurrence_matrix(mfcc, mode="affinity", metric="cosine", sym=True)
    gaussian = np.exp(-0.5 * (np.linspace(-1, 1, S.shape[0]) / 0.1) ** 2)
    novelty = np.convolve(np.mean(S, axis=0), gaussian, mode="same")
    peaks = librosa.util.peak_pick(novelty, pre_max=1, post_max=1, pre_avg=32, post_avg=32, delta=0.1, wait=0)
    boundaries = np.concatenate(([0], peaks, [mfcc.shape[1] - 1]))
    labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    sections = []
    for i in range(len(boundaries) - 1):
        start = int(librosa.frames_to_time(boundaries[i], sr=sr, hop_length=hop) * 1000)
        end = int(librosa.frames_to_time(boundaries[i + 1], sr=sr, hop_length=hop) * 1000)
        sections.append(Section(label=labels[i % len(labels)], start_ms=start, end_ms=end))
    return sections


def _chords(y: np.ndarray, sr: int) -> List[ChordSegment]:
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    templates = []
    names = []
    for i, p in enumerate(_PITCHES):
        templates.append(np.roll(_MAJOR_TEMPLATE, i))
        names.append(f"{p}")
        templates.append(np.roll(_MINOR_TEMPLATE, i))
        names.append(f"{p}m")
        templates.append(np.roll(_DOM7_TEMPLATE, i))
        names.append(f"{p}7")
    templates = np.array(templates)
    emission = np.dot(templates, chroma)
    emission = emission / (templates.sum(axis=1, keepdims=True) + 1e-6)
    N = emission.shape[0]
    stay = 0.9
    trans = np.full((N, N), (1 - stay) / (N - 1))
    np.fill_diagonal(trans, stay)
    init = np.full(N, 1.0 / N)
    states = librosa.sequence.viterbi(emission, trans, p_init=init)
    segments: List[ChordSegment] = []
    prev = 0
    for i in range(1, len(states) + 1):
        if i == len(states) or states[i] != states[prev]:
            start = int(librosa.frames_to_time(prev, sr=sr, hop_length=hop) * 1000)
            conf = float(emission[states[prev], prev:i].mean())
            segments.append(ChordSegment(start_ms=start, chord=names[states[prev]], conf=conf))
            prev = i
    return segments


def analyze_track(audio_path: Path | str, track_id: str) -> Analysis:
    audio_path = Path(audio_path)
    y, sr = librosa.load(audio_path, sr=None, mono=True)
    audio_e = essentia.array(y)
    tempo_e, _, _, _, _ = es.RhythmExtractor2013(method="multifeature")(audio_e)
    tempo_l, beat_frames, beat_ms, onset_env = _beatgrid(y, sr)
    tempo = float((tempo_e + tempo_l) / 2)
    tempo_conf = float(1 - abs(tempo_e - tempo_l) / max(tempo_e, tempo_l))
    key, scale, strength = es.KeyExtractor(profileType="krumhansl", hpcpSize=36)(audio_e)
    camelot = _camelot(key, scale)
    beatgrid = beat_ms
    sections = _sections(y, sr)
    chords = _chords(y, sr)
    rms = float(librosa.feature.rms(y=y).mean())
    beat_strength = float(onset_env[beat_frames].mean()) if len(beat_frames) else 0.0
    danceability = float(beat_strength / (onset_env.max() + 1e-6))
    harmonic, _ = librosa.effects.hpss(y)
    vocals_presence = float(np.mean(np.abs(harmonic)) / (np.mean(np.abs(y)) + 1e-6))
    meter = pyloudnorm.Meter(sr)
    loudness = float(meter.integrated_loudness(y))
    key_info = KeyInfo(pitch_class=key, mode=scale)
    analysis = Analysis(
        bpm=tempo,
        tempo_conf=tempo_conf,
        key=key_info,
        key_conf=float(strength),
        beatgrid=beatgrid,
        sections=sections,
        energy=rms,
        danceability=danceability,
        vocals_presence=vocals_presence,
        chord_segments=chords,
    )
    provenance = Provenance(
        tool_versions={
            "essentia": metadata.version("essentia"),
            "librosa": metadata.version("librosa"),
            "pyloudnorm": metadata.version("pyloudnorm"),
        },
        seeds={},
        timestamps={"analyzed": datetime.utcnow()},
        git_sha=subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip(),
    )
    out_dir = Path("/data/analysis") / track_id
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "Analysis.json", "w") as f:
        json.dump(
            {
                "analysis": analysis.model_dump(),
                "provenance": provenance.model_dump(mode="json"),
                "camelot": camelot,
            },
            f,
        )
    return analysis
