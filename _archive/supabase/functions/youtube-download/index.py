import os
import json
import uuid
import tempfile
from flask import Flask, request, jsonify
import supabase
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

STORAGE_BUCKET = 'mashups'

@app.route('/', methods=['POST'])
def handle_request():
    try:
        data = request.get_json()
        youtube_url = data.get('url')
        song_title = data.get('title', 'Untitled_Song')

        if not youtube_url:
            return jsonify({"error": "A 'url' parameter is required."}), 400

        with tempfile.TemporaryDirectory() as temp_dir:
            unique_id = str(uuid.uuid4())
            safe_title = "".join(c for c in song_title if c.isalnum() or c in (' ', '_')).rstrip()
            temp_filename = f"{unique_id}_{safe_title}.mp3"
            temp_filepath = os.path.join(temp_dir, temp_filename)

            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': temp_filepath,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])

            with open(temp_filepath, 'rb') as f:
                audio_content = f.read()

            storage_path = f"youtube-downloads/{temp_filename}"

            supabase_client.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=audio_content,
                file_options={"content-type": "audio/mpeg", "upsert": "true"}
            )

            return jsonify({
                "success": True,
                "storage_path": storage_path
            })

    except Exception as e:
        print(f"An unexpected error occurred: {str(e)}")
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
