@echo off
setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     🧠  AI-POWERED LOAD BALANCER SYSTEM                   ║
echo ║          Software Engineering Project                     ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Error: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo ✓ Node.js detected
echo ✓ Python detected
echo.

REM Check if packages are installed
if not exist "node_modules\" (
    echo 📦 Installing Node.js dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ✗ Failed to install Node.js packages
        pause
        exit /b 1
    )
    echo ✓ Node.js packages installed
    echo.
)

if not exist "service\venv\" (
    echo 📦 Setting up Python virtual environment...
    cd service
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo ✗ Failed to install Python packages
        pause
        exit /b 1
    )
    cd ..
    echo ✓ Python packages installed
    echo.
)

echo ════════════════════════════════════════════════════════════
echo 🚀 Starting Services...
echo ════════════════════════════════════════════════════════════
echo.

REM Start Load Balancer
echo [1/2] Starting Load Balancer (Port 3000)...
start "Load Balancer" /D "%cd%" cmd /k "title Load Balancer - AI Load Balancer & npm start"
timeout /t 3 /nobreak

REM Start AI Service
echo [2/2] Starting AI Service (Port 5000)...
start "AI Service" /D "%cd%\service" cmd /k "title AI Service - Python Flask & python app.py"
timeout /t 2 /nobreak

echo.
echo ════════════════════════════════════════════════════════════
echo ✓ All services started successfully!
echo ════════════════════════════════════════════════════════════
echo.
echo 📊 Dashboard:  http://localhost:3000
echo 📈 Analytics:  http://localhost:3000/dashboard.html
echo.
echo To run traffic simulation in a new window:
echo   npm run traffic
echo.
echo Press Ctrl+C in any terminal to stop that service
echo.
pause
