import hashlib
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import yt_dlp


class DownloadError(Exception):
    """Base error for download failures."""


class NotFoundError(DownloadError):
    """Raised when the video cannot be found (404 or removed)."""


def sanitize_filename(name: str) -> str:
    """Return a filesystem-safe version of ``name``."""
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


class YouTubeIngestor:
    """Download audio from YouTube with resilient settings."""

    def __init__(self, out_dir: Path = Path("/data/raw"), retries: int = 3, backoff: float = 1.5):
        self.out_dir = out_dir
        self.retries = retries
        self.backoff = backoff
        self.out_dir.mkdir(parents=True, exist_ok=True)

    def _progress_hook(self, d: Dict[str, Any]) -> None:
        # Hook for progress updates; could be extended to log/emit metrics
        return None

    def download(self, track_id: str, url: str) -> Dict[str, Any]:
        """Download ``url`` as ``track_id`` and return metadata including checksum."""
        safe_id = sanitize_filename(track_id)
        dest = self.out_dir / f"{safe_id}.m4a"
        ydl_opts: Dict[str, Any] = {
            "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
            "outtmpl": str(dest),
            "progress_hooks": [self._progress_hook],
            "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "m4a"}],
            "retries": self.retries,
            "fragment_retries": self.retries,
            "ignoreerrors": False,
            "noplaylist": True,
            "geo_bypass": True,
            "nocheckcertificate": True,
            "overwrites": False,
            "continuedl": True,
        }

        attempt = 0
        while True:
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                checksum = sha256(dest)
                metadata = {
                    "id": track_id,
                    "title": info.get("title"),
                    "artist": info.get("artist") or info.get("uploader"),
                    "source_url": url,
                    "storage_uri": str(dest),
                    "duration_sec": info.get("duration"),
                    "checksum": checksum,
                }
                return metadata
            except yt_dlp.utils.DownloadError as e:  # type: ignore[attr-defined]
                msg = str(e)
                if "404" in msg or "not available" in msg:
                    raise NotFoundError(msg) from e
                attempt += 1
                if attempt >= self.retries:
                    raise DownloadError(msg) from e
                time.sleep(self.backoff * attempt)
