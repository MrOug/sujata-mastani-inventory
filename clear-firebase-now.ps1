# PowerShell script to clear all Firebase data - NO CONFIRMATION REQUIRED
# WARNING: This will immediately delete all data!

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Firebase Data Cleanup Script (Auto-confirm)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Deleting ALL Firestore data from artifacts collection..." -ForegroundColor Yellow
Write-Host "This may take a minute..." -ForegroundColor Yellow
Write-Host ""

try {
    # Delete the main artifacts collection recursively with force flag
    firebase firestore:delete "artifacts" --recursive --force
    
    Write-Host ""
    Write-Host "SUCCESS! All Firestore data has been deleted!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error deleting Firestore data: $_" -ForegroundColor Red
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Next Step: Delete Authentication Users" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Go to Firebase Console to delete users:" -ForegroundColor White
Write-Host "1. Visit: https://console.firebase.google.com/project/sujata-inventory/authentication/users" -ForegroundColor Cyan
Write-Host "2. Select all users (check the top checkbox)" -ForegroundColor Cyan
Write-Host "3. Click the trash icon to delete them" -ForegroundColor Cyan
Write-Host ""
Write-Host "After deleting users, your Firebase will be completely clean!" -ForegroundColor Green
Write-Host ""
