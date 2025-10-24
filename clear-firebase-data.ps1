# PowerShell script to clear all Firebase data
# Run this with: .\clear-firebase-data.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Firebase Data Cleanup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get Firebase project ID
Write-Host "Getting Firebase project info..." -ForegroundColor Yellow
firebase projects:list

Write-Host ""
Write-Host "WARNING: This will delete ALL data from your Firebase project!" -ForegroundColor Red
Write-Host "This includes:" -ForegroundColor Red
Write-Host "  - All Firestore collections (stores, stock, orders, users)" -ForegroundColor Red
Write-Host "  - All Authentication users" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Are you sure you want to continue? Type 'YES' to confirm"

if ($confirmation -ne "YES") {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Step 1: Deleting Firestore data..." -ForegroundColor Yellow
Write-Host "Deleting artifacts collection (this may take a while)..." -ForegroundColor Cyan

# Delete the main artifacts collection recursively
firebase firestore:delete "artifacts" --recursive --yes

Write-Host ""
Write-Host "Firestore data deleted!" -ForegroundColor Green
Write-Host ""
Write-Host "Step 2: Deleting Authentication users..." -ForegroundColor Yellow
Write-Host "You need to delete users manually from the Firebase Console:" -ForegroundColor Cyan
Write-Host "  1. Go to: https://console.firebase.google.com/" -ForegroundColor White
Write-Host "  2. Select your project" -ForegroundColor White
Write-Host "  3. Click Authentication > Users" -ForegroundColor White
Write-Host "  4. Select all users and delete them" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Firebase is now clean. The app will recreate the necessary" -ForegroundColor Yellow
Write-Host "structure when you first use it." -ForegroundColor Yellow
Write-Host ""
