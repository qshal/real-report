# TruthChain Backend Setup Script for PowerShell
Write-Host "Setting up TruthChain Backend Service..." -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python from https://python.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Upgrade pip first
Write-Host "Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install setuptools explicitly
Write-Host "Installing setuptools..." -ForegroundColor Cyan
python -m pip install setuptools>=65.0.0

# Install requirements
Write-Host "Installing requirements..." -ForegroundColor Cyan
$result = python -m pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Write-Host "Trying alternative installation..." -ForegroundColor Yellow
    
    # Try installing each package individually
    $packages = @(
        "flask==3.0.0",
        "flask-cors==4.0.0", 
        "web3==6.15.1",
        "eth-account==0.10.0",
        "python-dotenv==1.0.0"
    )
    
    foreach ($package in $packages) {
        Write-Host "Installing $package..." -ForegroundColor Cyan
        python -m pip install $package
    }
}

Write-Host ""
Write-Host "Setup complete! You can now run:" -ForegroundColor Green
Write-Host "python blockchain_service.py" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to continue"