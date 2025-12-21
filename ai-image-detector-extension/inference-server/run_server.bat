@echo off
REM AI Image Detector - Inference Server Launcher (Windows)

echo ====================================
echo AI Image Detector - Inference Server
echo ====================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo [1/3] Checking Python version...
python --version

REM Check if virtual environment exists
if not exist "venv" (
    echo.
    echo [2/3] Creating virtual environment...
    python -m venv venv

    echo.
    echo [3/3] Installing dependencies...
    call venv\Scripts\activate.bat
    pip install --upgrade pip
    pip install -r requirements.txt
) else (
    echo.
    echo [2/3] Activating virtual environment...
    call venv\Scripts\activate.bat

    echo.
    echo [3/3] Dependencies already installed
)

echo.
echo ====================================
echo Starting server...
echo ====================================
echo.
echo Server will be available at:
echo   - http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo ====================================
echo.

REM Run the server
python main.py
