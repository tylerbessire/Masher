#!/usr/bin/env bash
set -e

# Start all Masher services, API, and frontend dev server.
cd "$(dirname "$0")"

# launch microservices
./start-services.sh &

# start main FastAPI app
uvicorn api.main:app --port 8080 --reload &
API_PID=$!

# start frontend
cd ui
npm run dev &
UI_PID=$!
cd ..

cleanup() {
  echo "Stopping Masher services..."
  pkill -f 'python.*main.py' 2>/dev/null || true
  kill $API_PID $UI_PID 2>/dev/null || true
}

trap cleanup EXIT

echo "Masher running:"
echo "  API:      http://localhost:8080"
echo "  Frontend: http://localhost:5173"

wait
