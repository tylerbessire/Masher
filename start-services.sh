#!/bin/bash
cd "$(dirname "$0")"


# Start all Python microservices for the mashup generation system

echo "Starting Python microservices..."

# Kill any existing processes on these ports
echo "Cleaning up existing processes..."
pkill -f "python.*main.py" 2>/dev/null || true
lsof -ti:8000,8001,8002,8003,8004,7999 | xargs kill -9 2>/dev/null || true

sleep 2

# Start each service in the background
echo "Starting Audio Analysis Service (port 8000)..."
(cd audio_analysis_service && python main.py) &
ANALYSIS_PID=$!

echo "Starting Audio Processing Service (port 8001)..."
(cd audio_processing_service && python main.py) &
PROCESSING_PID=$!

echo "Starting Mashability Scoring Service (port 8002)..."
(cd mashability_scoring_service && python main.py) &
SCORING_PID=$!

echo "Starting Mashup Orchestrator Service (port 8003)..."
(cd mashup_orchestrator_service && python main.py) &
ORCHESTRATOR_PID=$!

echo "Starting Stem Separation Service (port 8004)..."
(cd stem_separation_service && python main.py) &
SEPARATION_PID=$!

echo "Starting YouTube Service (port 7999)..."
(cd youtube_service && python main.py) &
YOUTUBE_PID=$!

echo ""
echo "All services started!"
echo "Audio Analysis Service: http://localhost:8000 (PID: $ANALYSIS_PID)"
echo "Audio Processing Service: http://localhost:8001 (PID: $PROCESSING_PID)"
echo "Mashability Scoring Service: http://localhost:8002 (PID: $SCORING_PID)"
echo "Mashup Orchestrator Service: http://localhost:8003 (PID: $ORCHESTRATOR_PID)"
echo "Stem Separation Service: http://localhost:8004 (PID: $SEPARATION_PID)"
echo ""
echo "Services are running in the background."
echo "To stop all services, run: pkill -f 'python.*main.py'"

# Give services time to start
sleep 3

# Test if services are responding
echo "Testing service connectivity..."
curl -s http://localhost:8000/docs > /dev/null && echo "✓ Analysis Service (8000) is responding" || echo "✗ Analysis Service (8000) failed to start"
curl -s http://localhost:8002/docs > /dev/null && echo "✓ Scoring Service (8002) is responding" || echo "✗ Scoring Service (8002) failed to start"
curl -s http://localhost:8003/docs > /dev/null && echo "✓ Orchestrator Service (8003) is responding" || echo "✗ Orchestrator Service (8003) failed to start"

echo ""
echo "Services are ready! You can now test mashup generation."