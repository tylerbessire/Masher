# Masher: AI-Powered Music Mashup Studio

An AI-powered mashup generation studio. This project uses a microservice architecture for its Python backend and a React frontend.

## Development Setup

This project is set up for local development.

### 1. Prerequisites

Ensure you have the following installed:
- Node.js and npm
- Python 3.9+ and pip
- `ffmpeg` (for audio processing)

### 2. One-Time Setup

Clone the repository and run the setup script:

```bash
git clone <your-repo-url>
cd Masher
npm run setup
```
This will install all Node.js dependencies and all Python dependencies from the various `requirements.txt` files.

### 3. Environment Variables

This project requires several environment variables to be set. Copy the `.env.example` file to `.env` and fill in the required values:

```bash
cp .env.example .env
```

You will need to provide:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: for authentication and storage.
- `ANTHROPIC_API_KEY`: for Claude AI integration.

The Python microservice URLs are pre-configured for local development.

### 4. Running the Development Environment

To start the full stack (Vite frontend and all Python API servers), simply run:

```bash
npm run dev:complete
```

That's it! 🚀 This single command will:
- ✅ Start all Python API servers for analysis, processing, scoring, orchestration, stem separation, and YouTube search.
- ✅ Start the Vite dev server for the frontend, available at `http://localhost:8080`.