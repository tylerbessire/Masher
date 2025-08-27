from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal

from pydantic import BaseModel, ConfigDict, HttpUrl, Field


class Track(BaseModel):
    """Metadata and storage info for an acquired track."""

    id: str
    title: str
    artist: str
    source_url: HttpUrl
    storage_uri: str
    duration_sec: float
    loudness_lufs: float
    sample_rate: int
    channels: int

    model_config = ConfigDict(extra="forbid")


PitchClass = Literal[
    "C",
    "C#",
    "D",
    "Eb",
    "E",
    "F",
    "F#",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
]


class KeyInfo(BaseModel):
    pitch_class: PitchClass
    mode: Literal["major", "minor"]

    model_config = ConfigDict(extra="forbid")


class Section(BaseModel):
    label: str
    start_ms: int
    end_ms: int

    model_config = ConfigDict(extra="forbid")


class ChordSegment(BaseModel):
    start_ms: int
    chord: str
    conf: float

    model_config = ConfigDict(extra="forbid")


class Analysis(BaseModel):
    bpm: float
    tempo_conf: float
    key: KeyInfo
    key_conf: float
    beatgrid: List[int]
    sections: List[Section]
    energy: float
    danceability: float
    vocals_presence: float
    chord_segments: List[ChordSegment]

    model_config = ConfigDict(extra="forbid")


class Alignment(BaseModel):
    offset_ms: int
    stretch_cents: float

    model_config = ConfigDict(extra="forbid")


class KeyStrategy(BaseModel):
    pitch_shift_semitones: float

    model_config = ConfigDict(extra="forbid")


class DuckingSettings(BaseModel):
    enabled: bool
    threshold_db: float
    ratio: float

    model_config = ConfigDict(extra="forbid")


class EqBand(BaseModel):
    frequency_hz: float
    gain_db: float
    q: float

    model_config = ConfigDict(extra="forbid")


class EqSettings(BaseModel):
    bands: List[EqBand] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")


class CompSettings(BaseModel):
    threshold_db: float
    ratio: float
    attack_ms: float
    release_ms: float

    model_config = ConfigDict(extra="forbid")


class FxSettings(BaseModel):
    ducking: DuckingSettings
    eq: EqSettings
    comp: CompSettings

    model_config = ConfigDict(extra="forbid")


class MashPlan(BaseModel):
    pair_id: str
    alignment: Alignment
    key_strategy: KeyStrategy
    stems_strategy: str
    structure_map: str
    fx: FxSettings

    model_config = ConfigDict(extra="forbid")


class Provenance(BaseModel):
    tool_versions: Dict[str, str]
    seeds: Dict[str, int]
    timestamps: Dict[str, datetime]
    git_sha: str

    model_config = ConfigDict(extra="forbid")


class RenderJob(BaseModel):
    id: str
    pair_id: str
    mash_plan: MashPlan
    output_uri: str
    provenance: Provenance
    status: Literal["pending", "running", "completed", "failed"]

    model_config = ConfigDict(extra="forbid")
