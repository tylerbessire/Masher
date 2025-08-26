import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yt_dlp
import os

app = FastAPI()

# Serve the downloads directory
if not os.path.exists("downloads"):
    os.makedirs("downloads")
app.mount("/downloads", StaticFiles(directory="downloads"), name="downloads")

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


class SearchRequest(BaseModel):
    query: str

class DownloadRequest(BaseModel):
    url: str

@app.post("/search")
async def search_youtube(request: SearchRequest):
    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'default_search': f"ytsearch5", # Search for 5 results
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            search_results = ydl.extract_info(request.query, download=False).get('entries', [])
            results = []
            for item in search_results:
                results.append({
                    "id": item.get("id"),
                    "title": item.get("title"),
                    "url": item.get("webpage_url"),
                    "duration": item.get("duration_string"),
                    "thumbnail": item.get("thumbnail"),
                })
            return {"success": True, "results": results}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/download")
async def download_song(request: DownloadRequest):
    # Ensure the downloads directory exists
    downloads_dir = "downloads"
    if not os.path.exists(downloads_dir):
        os.makedirs(downloads_dir)

    # 1. Get info without downloading to determine the final filename
    try:
        info_opts = {'quiet': True}
        with yt_dlp.YoutubeDL(info_opts) as ydl:
            info = ydl.extract_info(request.url, download=False)
            title = info.get('title', 'untitled')
            # Create a safe filename and ensure it ends with .mp3
            safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c in (' ', '-')]).rstrip()
            final_path = os.path.join(downloads_dir, f"{safe_title}.mp3")

        # 2. Check if the file already exists
        if os.path.exists(final_path):
            audio_url = f"http://localhost:7999/downloads/{os.path.basename(final_path)}"
            return {"success": True, "path": final_path, "url": audio_url, "message": "File already exists"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting video info: {str(e)}")

    # 3. If it doesn't exist, proceed with download and conversion
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(downloads_dir, f"{safe_title}.%(ext)s"),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.extract_info(request.url, download=True)
            audio_url = f"http://localhost:7999/downloads/{os.path.basename(final_path)}"
            return {"success": True, "path": final_path, "url": audio_url}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error during download: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7999)
