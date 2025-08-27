import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yt_dlp
import os
import re
from urllib.parse import quote

# --- Configuration ---
DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# --- Pydantic Models ---
class DownloadRequest(BaseModel):
    url: str

# --- FastAPI App ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Caching and Download Logic ---
def sanitize_filename(title):
    """Remove special characters for a clean filename."""
    return re.sub(r'[\\/*?:\"<>|]', "", title)

@app.post("/download")
async def download_audio(request: DownloadRequest):
    try:
        # Get video info to build a safe filename
        with yt_dlp.YoutubeDL({"proxy": "", "nocheckcertificate": True}) as ydl:
            info = ydl.extract_info(request.url, download=False)
            title = info.get("title", "youtube_audio")
            safe_title = sanitize_filename(title)

        # Check if the file already exists (simple cache)
        for ext in [".mp3", ".m4a", ".webm"]:
            cached_file = os.path.join(DOWNLOAD_DIR, f"{safe_title}{ext}")
            if os.path.exists(cached_file):
                encoded = quote(cached_file.replace("\\", "/"))
                return {
                    "success": True,
                    "url": f"http://localhost:7999/{encoded}",
                    "message": "Served from cache",
                }

        # If not cached, download it
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(DOWNLOAD_DIR, f"{safe_title}.%(ext)s"),
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
            "proxy": "",
            "nocheckcertificate": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(request.url, download=True)
            download_info = info.get("requested_downloads", [info])[0]
            filepath = (
                download_info.get("filepath")
                or download_info.get("filename")
                or download_info.get("_filename")
            )
            if filepath is None:
                raise HTTPException(status_code=500, detail="yt-dlp did not return a download path")
            base, _ = os.path.splitext(filepath)
            final_path = f"{base}.mp3"

        if not os.path.exists(final_path):
            raise HTTPException(status_code=500, detail="Download finished, but the output file was not found.")

        encoded = quote(final_path.replace("\\", "/"))
        return {
            "success": True,
            "url": f"http://localhost:7999/{encoded}",
            "message": "Downloaded successfully",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Static File Serving ---
# This allows the frontend to access the downloaded files
app.mount(f"/{DOWNLOAD_DIR}", StaticFiles(directory=DOWNLOAD_DIR), name="downloads")

# --- Search Endpoint (remains the same) ---
class SearchRequest(BaseModel):
    query: str

@app.post("/search")
async def search_youtube(request: SearchRequest):
    try:
        with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
            results = ydl.extract_info(f"ytsearch5:{request.query}", download=False)["entries"]

        processed_results = [
            {
                "id": r["id"],
                "title": r["title"],
                "url": r["webpage_url"],
                "duration": r.get("duration_string", "N/A"),
                "thumbnail": r["thumbnail"],
            }
            for r in results
        ]

        return {"success": True, "results": processed_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Main execution ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7999)
