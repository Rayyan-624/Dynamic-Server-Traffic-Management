#!/bin/bash

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     🧠  AI-POWERED LOAD BALANCER SYSTEM                   ║"
echo "║          Software Engineering Project                     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "✗ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "✗ Error: Python 3 is not installed"
    echo "Please install Python from https://www.python.org/"
    exit 1
fi

echo "✓ Node.js detected"
echo "✓ Python detected"
echo ""

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    echo "✓ Node.js packages installed"
    echo ""
fi

# Install Python dependencies if needed
if [ ! -d "service/venv" ]; then
    echo "📦 Setting up Python virtual environment..."
    cd service
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo "✓ Python packages installed"
    echo ""
fi

echo "════════════════════════════════════════════════════════════"
echo "🚀 Starting Services..."
echo "════════════════════════════════════════════════════════════"
echo ""

# Start Load Balancer in background
echo "[1/2] Starting Load Balancer (Port 3000)..."
npm start &
LOAD_BALANCER_PID=$!
sleep 3

# Start AI Service in background
echo "[2/2] Starting AI Service (Port 5000)..."
cd service
source venv/bin/activate
python app.py &
AI_SERVICE_PID=$!
cd ..
sleep 2

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✓ All services started successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Dashboard:  http://localhost:3000"
echo "📈 Analytics:  http://localhost:3000/dashboard.html"
echo ""
echo "To run traffic simulation:"
echo "   npm run traffic"
echo ""
echo "To stop all services: Ctrl+C"
echo ""

# Wait for both processes
wait $LOAD_BALANCER_PID $AI_SERVICE_PID
