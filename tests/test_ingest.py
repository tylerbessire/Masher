import hashlib
from pathlib import Path

import pytest
import yt_dlp

from services.ingest.ingest import NotFoundError, YouTubeIngestor


class DummyYDL:
    def __init__(self, params):
        self.params = params

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        pass

    def extract_info(self, url, download=True):
        Path(self.params["outtmpl"]).write_bytes(b"data")
        return {"title": "t", "uploader": "u", "duration": 1}


class FailingYDL(DummyYDL):
    def extract_info(self, url, download=True):
        raise yt_dlp.utils.DownloadError("404 Not Found")


def test_download_checksum_and_redownload(tmp_path, monkeypatch):
    monkeypatch.setattr(yt_dlp, "YoutubeDL", DummyYDL)
    ing = YouTubeIngestor(out_dir=tmp_path, retries=1)
    meta1 = ing.download("track1", "http://yt")
    meta2 = ing.download("track2", "http://yt")
    expected = hashlib.sha256(b"data").hexdigest()
    assert meta1["checksum"] == meta2["checksum"] == expected


def test_404_raises_typed_error(tmp_path, monkeypatch):
    monkeypatch.setattr(yt_dlp, "YoutubeDL", FailingYDL)
    ing = YouTubeIngestor(out_dir=tmp_path, retries=1)
    with pytest.raises(NotFoundError):
        ing.download("track1", "http://yt")
