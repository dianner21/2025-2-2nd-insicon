#!/bin/bash
# AI Image Detector - Inference Server Launcher (Linux/Mac)

echo "===================================="
echo "AI Image Detector - Inference Server"
echo "===================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

echo "[1/3] Checking Python version..."
python3 --version

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo ""
    echo "[2/3] Creating virtual environment..."
    python3 -m venv venv

    echo ""
    echo "[3/3] Installing dependencies..."
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo ""
    echo "[2/3] Activating virtual environment..."
    source venv/bin/activate

    echo ""
    echo "[3/3] Dependencies already installed"
fi

echo ""
echo "===================================="
echo "Starting server..."
echo "===================================="
echo ""
echo "Server will be available at:"
echo "  - http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo "===================================="
echo ""

# Run the server
python main.py
