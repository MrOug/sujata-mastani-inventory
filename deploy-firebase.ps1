# PowerShell script to deploy Firebase rules
# Run this after setting up Vercel environment variables

Write-Host "🚀 Deploying Firebase Rules for Sujata Mastani Inventory" -ForegroundColor Green

# Check if Firebase CLI is installed
try {
    firebase --version
    Write-Host "✅ Firebase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    npm install -g firebase-tools
}

# Login to Firebase
Write-Host "🔐 Logging into Firebase..." -ForegroundColor Yellow
firebase login

# Use the correct project
Write-Host "📁 Setting Firebase project..." -ForegroundColor Yellow
firebase use sujata-inventory

# Deploy Firestore rules
Write-Host "🔥 Deploying Firestore rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

Write-Host "✅ Firebase rules deployed successfully!" -ForegroundColor Green
Write-Host "🌐 Your app should now be live at: https://sujata-mastani-inventory.vercel.app" -ForegroundColor Cyan
