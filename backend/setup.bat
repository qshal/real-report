@echo off
echo Setting up TruthChain Backend Service...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing dependencies...

REM Upgrade pip first
python -m pip install --upgrade pip

REM Install setuptools explicitly
python -m pip install setuptools>=65.0.0

REM Install requirements
python -m pip install -r requirements.txt

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    echo Trying alternative installation...
    
    REM Try installing each package individually
    python -m pip install flask==3.0.0
    python -m pip install flask-cors==4.0.0
    python -m pip install web3==6.15.1
    python -m pip install eth-account==0.10.0
    python -m pip install python-dotenv==1.0.0
)

echo.
echo Setup complete! You can now run:
echo python blockchain_service.py
echo.
pause