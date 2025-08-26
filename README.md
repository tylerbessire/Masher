# Masher: AI-Powered Music Mashup Studio

Masher is a sophisticated, AI-driven music mashup creation studio. It leverages a powerful backend of Python microservices and a dynamic React frontend to allow users to search for songs on YouTube, analyze their musical properties, and receive an AI-generated "masterplan" for creating a professional-quality mashup.

![Masher Screenshot](https://i.imgur.com/your-screenshot.png) <!-- Replace with an actual screenshot URL -->

## Core Features

- **YouTube Integration:** Search for any song on YouTube and download it directly within the app.
- **Advanced Audio Analysis:** Each song undergoes a deep analysis using the Essentia library to extract key, BPM, energy, danceability, and more.
- **AI-Powered Masterplan:** An AI orchestrator (powered by Anthropic's Claude) analyzes two songs and their mashability score to generate a detailed, professional-grade "masterplan" for a mashup.
- **Dynamic UI:** A sleek, responsive interface built with React, Vite, and Tailwind CSS, featuring a drag-and-drop workflow.
- **Microservice Architecture:** The backend is composed of several distinct Python services, each handling a specific task (YouTube search, audio analysis, orchestration, etc.).

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Python, FastAPI, Uvicorn
- **Core Libraries:**
  - `essentia`: For robust audio analysis.
  - `yt-dlp`: For YouTube downloading.
  - `anthropic`: For AI-powered mashup planning.
- **Theming:** `next-themes` for light/dark mode.

## Local Development Setup

### 1. Prerequisites

- Node.js and npm
- Python 3.9+ and pip
- `ffmpeg` (Required for audio processing by `yt-dlp`)

### 2. Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/tylerbessire/Masher.git
cd Masher
npm install
pip install -r requirements.txt # Installs dependencies for all Python services
```

### 3. Environment Variables

The project uses a `.env` file for configuration. Copy the example file and fill in your API keys:

```bash
cp .env.example .env
```

You will need to provide:
- `VITE_ANTHROPIC_API_KEY`: Your API key for the Anthropic (Claude) API.
- `YOUTUBE_API_KEY`: Your API key for the YouTube Data API (for searching).

### 4. Running the Application

To run the entire application (frontend and all backend microservices), use the following command:

```bash
npm run dev:complete
```

This will:
- ✅ Start all Python microservices on their respective ports (7999-8004).
- ✅ Start the Vite frontend development server, available at **http://localhost:8080**.

Alternatively, you can start the frontend and backend services separately:

- **Start just the frontend:** `npm run dev`
- **Start all backend services:** `./start-services.sh`

---
*This project was developed with the assistance of an AI agent.*
