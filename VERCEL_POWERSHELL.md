# ⚡ Vercel Deployment - PowerShell Commands for Windows

Complete guide with all commands tested for Windows PowerShell!

## 🚀 Method 1: Using Vercel Website (EASIEST - No Commands!)

**This is the easiest way if you're getting command errors!**

### Step 1: Install Git (if not installed)

Download from: https://git-scm.com/download/win

After installing, **restart PowerShell**.

### Step 2: Push to GitHub

```powershell
# Navigate to your project
cd "C:\Users\mroug\Desktop\web inv"

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# If git asks for identity:
git config user.email "your-email@example.com"
git config user.name "Your Name"

# Commit again if needed
git commit -m "Initial commit"
```

### Step 3: Create GitHub Repository

1. Go to https://github.com
2. Sign up/Login
3. Click **"New repository"** (green button)
4. Name: `sujata-mastani-inventory`
5. Keep it **Public**
6. **Don't** check "Initialize with README"
7. Click **"Create repository"**

### Step 4: Push to GitHub

GitHub will show commands like this, use them:

```powershell
# Connect to GitHub (use YOUR repository URL)
git remote add origin https://github.com/YOUR_USERNAME/sujata-mastani-inventory.git

# Push code
git branch -M main
git push -u origin main
```

If it asks for credentials, use:
- Username: Your GitHub username
- Password: Personal Access Token (not your actual password)

**To create token:**
- GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Select "repo" scope
- Copy the token and use it as password

### Step 5: Deploy on Vercel (No Commands!)

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access GitHub
5. Click **"Import Project"** or **"Add New Project"**
6. Find `sujata-mastani-inventory` repository
7. Click **"Import"**
8. Vercel auto-detects it's a Vite project ✅
9. Click **"Deploy"**

**Done! Your app is deploying!** 🎉

Watch the build logs. In 1-2 minutes, you'll see:
```
✅ Deployment Ready!
https://sujata-mastani-inventory.vercel.app
```

### Step 6: Add Environment Variables

1. In Vercel dashboard, click your project
2. Go to **Settings** → **Environment Variables**
3. Add these variables:

**Variable 1:**
```
Name: VITE_APP_ID
Value: your-app-id
```

**Variable 2:**
```
Name: VITE_FIREBASE_CONFIG
Value: {"apiKey":"YOUR_KEY","authDomain":"YOUR_DOMAIN","projectId":"YOUR_PROJECT","storageBucket":"YOUR_BUCKET","messagingSenderId":"YOUR_ID","appId":"YOUR_APP_ID"}
```

(Make it one line, no spaces)

4. Click **"Save"**
5. Go to **Deployments** tab
6. Click **⋯** on latest deployment
7. Click **"Redeploy"**

**Now your app is fully working!** ✅

---

## 🖥️ Method 2: Using Vercel CLI (If you want command line)

### Step 1: Install Node.js (if errors about npm)

1. Download from: https://nodejs.org/
2. Install the LTS version
3. **Restart PowerShell**
4. Test: `node --version`

### Step 2: Install Vercel CLI

```powershell
npm install -g vercel
```

**If you get permission errors:**
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell → "Run as Administrator"
npm install -g vercel
```

**If still errors, use this:**
```powershell
npm config set prefix "$env:APPDATA\npm"
npm install -g vercel

# Add to PATH
$env:Path += ";$env:APPDATA\npm"
```

### Step 3: Test Vercel Installation

```powershell
vercel --version
```

**If "vercel is not recognized":**
```powershell
# Find where it installed
npm list -g vercel

# Or use full path
& "$env:APPDATA\npm\vercel.cmd" --version
```

### Step 4: Login to Vercel

```powershell
vercel login
```

Choose **"Continue with GitHub"** - easiest option.

### Step 5: Deploy

```powershell
cd "C:\Users\mroug\Desktop\web inv"
vercel
```

Answer the prompts:
```
? Set up and deploy? Yes
? Which scope? Your account (press Enter)
? Link to existing project? No
? What's your project's name? sujata-mastani-inventory
? In which directory is your code located? ./ (press Enter)
? Want to override the settings? No (press Enter)
```

Vercel will deploy and give you a URL!

### Step 6: Add Environment Variables

```powershell
# Add app ID
vercel env add VITE_APP_ID

# When prompted, paste: your-app-id
# Environment: Production
# Add to: Production

# Add Firebase config
vercel env add VITE_FIREBASE_CONFIG

# When prompted, paste (one line):
# {"apiKey":"...","authDomain":"...","projectId":"..."}
# Environment: Production
# Add to: Production
```

### Step 7: Deploy to Production

```powershell
vercel --prod
```

**Done!** Your app is live with environment variables! 🎉

---

## 🆘 Troubleshooting Common Errors

### Error: "git is not recognized"

**Fix:**
1. Install Git: https://git-scm.com/download/win
2. During installation, choose "Git from the command line and also from 3rd-party software"
3. **Restart PowerShell**
4. Test: `git --version`

### Error: "npm is not recognized"

**Fix:**
1. Install Node.js: https://nodejs.org/
2. Use the LTS (Long Term Support) version
3. **Restart PowerShell**
4. Test: `npm --version`

### Error: "vercel is not recognized"

**Fix Option 1:**
```powershell
# Use npx instead
npx vercel
npx vercel login
npx vercel --prod
```

**Fix Option 2:**
```powershell
# Install locally in project
npm install vercel

# Use with npx
npx vercel
```

**Fix Option 3:**
```powershell
# Add npm global path to PowerShell
$env:Path += ";$env:APPDATA\npm"

# Test again
vercel --version
```

### Error: "cannot be loaded because running scripts is disabled"

**Fix:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Try command again
```

### Error: "fatal: not a git repository"

**Fix:**
```powershell
# Initialize git first
cd "C:\Users\mroug\Desktop\web inv"
git init
```

### Error: "Author identity unknown"

**Fix:**
```powershell
git config user.email "youremail@example.com"
git config user.name "Your Name"
```

### Error: "failed to push some refs"

**Fix:**
```powershell
# Pull first
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

### Error: "Permission denied (publickey)"

**Fix:**
Use HTTPS instead of SSH:
```powershell
# Remove old remote
git remote remove origin

# Add with HTTPS
git remote add origin https://github.com/YOUR_USERNAME/repo-name.git

# Push
git push -u origin main
```

### Error: Build fails on Vercel

**Check these:**
1. Make sure `package.json` exists
2. Check build logs in Vercel dashboard
3. Verify `vite.config.js` is correct
4. Check environment variables are set

---

## 📝 Step-by-Step Checklist

Use this checklist to deploy successfully:

### ✅ Pre-deployment:

- [ ] Git installed (`git --version`)
- [ ] Node.js installed (`node --version`)
- [ ] GitHub account created
- [ ] `.env` file created with Firebase config

### ✅ Push to GitHub:

```powershell
cd "C:\Users\mroug\Desktop\web inv"
git init
git add .
git config user.email "your-email@example.com"
git config user.name "Your Name"
git commit -m "Initial commit"

# Create repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/sujata-mastani-inventory.git
git branch -M main
git push -u origin main
```

### ✅ Deploy on Vercel:

**Option A: Website (Easier)**
- [ ] Go to vercel.com
- [ ] Sign in with GitHub
- [ ] Import repository
- [ ] Click Deploy
- [ ] Add environment variables
- [ ] Redeploy

**Option B: CLI**
```powershell
npm install -g vercel
vercel login
vercel
vercel env add VITE_APP_ID
vercel env add VITE_FIREBASE_CONFIG
vercel --prod
```

### ✅ Verify Deployment:

- [ ] Visit your Vercel URL
- [ ] Check if app loads
- [ ] Try logging in
- [ ] Test on mobile
- [ ] Add to home screen

---

## 🔄 How to Update Your App Later

### If you used GitHub + Vercel Website:

```powershell
cd "C:\Users\mroug\Desktop\web inv"

# Make your changes to the code

git add .
git commit -m "Updated stock features"
git push

# Vercel auto-deploys! ✅
```

### If you used Vercel CLI:

```powershell
cd "C:\Users\mroug\Desktop\web inv"

# Make your changes

vercel --prod
```

---

## 🎯 Recommended Workflow

For Windows users, I recommend:

### 1. Use Vercel Website (Not CLI)

It's more reliable on Windows and avoids PowerShell permission issues.

### 2. One-time GitHub Push

```powershell
# Only need to do this once
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/repo.git
git push -u origin main
```

### 3. Deploy via Vercel Website

- Import from GitHub
- Auto-deploys on every push
- No CLI issues
- Easier to manage

### 4. Update via Git Push

```powershell
git add .
git commit -m "Updates"
git push
# Done! Auto-deploys
```

---

## 💡 Quick Commands Reference

### Git Commands:
```powershell
git init                          # Initialize repository
git add .                        # Add all files
git commit -m "message"          # Commit changes
git push                         # Push to GitHub
git status                       # Check status
git log                          # View history
```

### NPM Commands:
```powershell
npm install                      # Install dependencies
npm run dev                      # Start dev server
npm run build                    # Build for production
npm list -g                      # List global packages
```

### Vercel Commands:
```powershell
vercel login                     # Login to Vercel
vercel                          # Deploy to preview
vercel --prod                   # Deploy to production
vercel env add NAME             # Add environment variable
vercel env ls                   # List env variables
vercel list                     # List deployments
vercel logs                     # View logs
```

---

## 🎬 Complete Example (Copy-Paste)

```powershell
# 1. Navigate to project
cd "C:\Users\mroug\Desktop\web inv"

# 2. Setup git
git init
git add .
git config user.email "myemail@example.com"
git config user.name "My Name"
git commit -m "Initial commit"

# 3. Push to GitHub (create repo first on github.com)
git remote add origin https://github.com/myusername/my-repo.git
git branch -M main
git push -u origin main

# 4. Deploy via website
# Go to vercel.com
# Sign in with GitHub
# Import repository
# Click Deploy
# Add environment variables
# Done!

# 5. To update later:
git add .
git commit -m "Updates"
git push
# Auto-deploys!
```

---

## 🆘 Still Having Issues?

### Try the simplest method:

1. **Skip CLI completely**
2. Use GitHub Desktop instead of command line:
   - Download: https://desktop.github.com/
   - Drag your folder into GitHub Desktop
   - Publish to GitHub (one click)
3. Go to vercel.com
4. Import from GitHub
5. Done!

### Or contact me with:
- The exact error message
- Screenshot of the error
- What command you ran

I'll help you fix it!

---

**Ready? Start with Method 1 (Website) - it's the most reliable for Windows!** 🚀

