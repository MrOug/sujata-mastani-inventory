# Setup Script for Sujata Mastani Inventory System
# Run this script in PowerShell to set up the project

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sujata Mastani Inventory Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm is installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm is not installed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing project dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Create a Firebase project at:" -ForegroundColor White
    Write-Host "   https://console.firebase.google.com/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Copy env.template to .env:" -ForegroundColor White
    Write-Host "   copy env.template .env" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Edit .env with your Firebase configuration" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Install Firebase CLI (if not installed):" -ForegroundColor White
    Write-Host "   npm install -g firebase-tools" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Login to Firebase:" -ForegroundColor White
    Write-Host "   firebase login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. Initialize Firebase:" -ForegroundColor White
    Write-Host "   firebase init" -ForegroundColor Gray
    Write-Host ""
    Write-Host "7. Start development server:" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For detailed instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Installation failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
    Write-Host ""
}

