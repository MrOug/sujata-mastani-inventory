# 🚀 INSTANT VERCEL DEPLOYMENT GUIDE

## Step 1: Go to Vercel Dashboard
1. Open: https://vercel.com
2. Sign in with GitHub
3. Find your project: `sujata-mastani-inventory`

## Step 2: Add Environment Variables (COPY-PASTE)
Go to: Settings → Environment Variables

### Variable 1:
- **Name**: `VITE_APP_ID`
- **Value**: `sujata-mastani-inventory`

### Variable 2:
- **Name**: `VITE_FIREBASE_CONFIG`
- **Value**: `{"apiKey":"AIzaSyDZt6n1QSGLq_PyLDYQlayFwMK0Qv7gpmE","authDomain":"sujata-inventory.firebaseapp.com","projectId":"sujata-inventory","storageBucket":"sujata-inventory.firebasestorage.app","messagingSenderId":"527916478889","appId":"1:527916478889:web:7043c7d45087ee452bd4b8","measurementId":"G-BC3JXRWDVH"}`

## Step 3: Redeploy
1. Go to Deployments tab
2. Click ⋯ on latest deployment
3. Click "Redeploy"
4. Wait 2-3 minutes

## Step 4: Firebase Setup (One-time)
1. Go to: https://console.firebase.google.com
2. Select project: `sujata-inventory`
3. Enable Authentication → Email/Password
4. Create Firestore Database (production mode)

## Step 5: Deploy Firestore Rules
Run these commands in terminal:
```bash
npm install -g firebase-tools
firebase login
firebase use sujata-inventory
firebase deploy --only firestore:rules
```

## ✅ DONE!
Your app will be live at: https://sujata-mastani-inventory.vercel.app

## 📱 Mobile Installation
- Android: Chrome → Menu → "Add to Home screen"
- iPhone: Safari → Share → "Add to Home Screen"

## 🔄 Future Updates
Just push to GitHub → Vercel auto-deploys!
