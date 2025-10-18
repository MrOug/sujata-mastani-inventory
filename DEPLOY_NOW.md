# 🚀 Deploy to Vercel RIGHT NOW - PowerShell Commands

Copy and paste these commands one by one!

## ✅ Your System is Ready!

- ✅ Node.js: v22.20.0
- ✅ npm: 10.9.3
- ✅ Git: 2.51.0
- ✅ Dependencies: Installed

## Step 1: Initialize Git

```powershell
git init
```

## Step 2: Configure Git (Use YOUR email and name!)

```powershell
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

## Step 3: Add and Commit Files

```powershell
git add .
git commit -m "Initial commit - Sujata Mastani Inventory"
```

## Step 4: Create GitHub Repository

1. Open https://github.com in your browser
2. Click "Sign up" or "Sign in"
3. Click the **"+"** in top right → **"New repository"**
4. Name it: **sujata-mastani-inventory**
5. Keep it **Public**
6. **Don't check** "Initialize with README"
7. Click **"Create repository"**

## Step 5: Push to GitHub

GitHub will show you commands. Use this format:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/sujata-mastani-inventory.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username!

**If it asks for credentials:**
- Username: Your GitHub username
- Password: Create a Personal Access Token:
  - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
  - Select "repo" scope
  - Copy the token and paste as password

## Step 6: Deploy on Vercel (Website - NO COMMANDS!)

1. Go to **https://vercel.com**
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel
5. Click **"Add New"** → **"Project"**
6. Find **sujata-mastani-inventory** in the list
7. Click **"Import"**
8. Vercel detects it's a Vite project automatically ✅
9. Click **"Deploy"**

**Wait 1-2 minutes...** ⏱️

✅ **Done! Your app is live!**

You'll see a URL like: `https://sujata-mastani-inventory.vercel.app`

## Step 7: Add Environment Variables

Your app needs Firebase config to work!

1. In Vercel dashboard, click your project name
2. Go to **Settings** tab
3. Click **Environment Variables** in left menu
4. Add these two variables:

### Variable 1: App ID

```
Name: VITE_APP_ID
Value: sujata-mastani-inventory
```

Click **"Save"**

### Variable 2: Firebase Config

You need to create this from your Firebase project:

1. Go to https://console.firebase.google.com/
2. Create a new project (or use existing)
3. Click Project Settings (gear icon)
4. Scroll to "Your apps" → Click web icon (`</>`)
5. Register app, then copy the config

```
Name: VITE_FIREBASE_CONFIG
Value: {"apiKey":"YOUR_API_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT_ID","storageBucket":"YOUR_PROJECT.appspot.com","messagingSenderId":"YOUR_SENDER_ID","appId":"YOUR_APP_ID"}
```

**Important:** Make it ONE LINE with no extra spaces!

Click **"Save"**

## Step 8: Redeploy with Variables

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **"Redeploy"**
4. Click **"Redeploy"** to confirm

Wait 1-2 minutes...

✅ **Your app is now fully working!**

## Step 9: Set Up Firebase (Backend)

Your app uses Firebase for database and auth. Set it up:

### Install Firebase CLI:

```powershell
npm install -g firebase-tools
```

### Login to Firebase:

```powershell
firebase login
```

### Initialize Firestore:

```powershell
firebase init
```

Select:
- **Firestore** (use spacebar to select)
- Use **existing project**
- Rules file: `firestore.rules`
- Indexes file: `firestore.indexes.json`

### Deploy Firestore Rules:

```powershell
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

✅ **Done! Your backend is set up!**

## 🎉 Your App is Live!

Visit your Vercel URL and test:
- Login/Register
- Create first admin account
- Add stores
- Add users
- Enter stock data

## 📱 Test on Mobile

1. Open your Vercel URL on your phone
2. Chrome (Android): Menu → "Add to Home screen"
3. Safari (iPhone): Share → "Add to Home Screen"
4. App installs like a native app! 🎉

## 🔄 How to Update Later

When you make changes:

```powershell
git add .
git commit -m "Updated features"
git push
```

Vercel automatically deploys in 1-2 minutes! ✅

## 🌐 Add Custom Domain (Optional)

After deploying:

1. Buy domain from GoDaddy/Namecheap (₹500-1000/year)
2. Vercel → Settings → Domains → Add
3. Add CNAME record in domain provider
4. Wait 30 minutes
5. Done! `https://inventory.yourdomain.com`

---

## 🆘 If You Get Errors

### Error: "git: command not found"
- Git is installed, restart PowerShell

### Error: "Permission denied"
- Use HTTPS URL (not SSH)
- Create Personal Access Token for password

### Error: "npm ERR!"
- Already fixed! Dependencies are installed ✅

### Error: On Vercel build
- Check build logs in Vercel dashboard
- Make sure environment variables are set
- Redeploy after adding variables

---

**Start from Step 1 above and you'll be deployed in 10 minutes!** 🚀

