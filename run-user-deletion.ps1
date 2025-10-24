# Quick script to delete all users
# Run with: .\run-user-deletion.ps1

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Firebase User Deletion Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if service account key exists
if (-not (Test-Path "serviceAccountKey.json")) {
    Write-Host "ERROR: serviceAccountKey.json not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download your service account key first:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.firebase.google.com/project/sujata-inventory/settings/serviceaccounts/adminsdk" -ForegroundColor White
    Write-Host "2. Click 'Generate New Private Key'" -ForegroundColor White
    Write-Host "3. Save the file as 'serviceAccountKey.json' in this folder" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening the Firebase Console page for you..." -ForegroundColor Cyan
    Start-Process "https://console.firebase.google.com/project/sujata-inventory/settings/serviceaccounts/adminsdk"
    exit 1
}

Write-Host "Found service account key!" -ForegroundColor Green
Write-Host "Running deletion script..." -ForegroundColor Yellow
Write-Host ""

node delete-all-users.cjs

