# Quick Deployment Guide - Windows

This guide will help you deploy your Sujata Mastani Inventory Management System to the web.

## Prerequisites Checklist

✅ Node.js installed (check with `node --version`)  
✅ npm installed (check with `npm --version`)  
✅ Firebase account created  
✅ Firebase CLI installed globally  

## Step-by-Step Deployment

### 1. Generate App Icons (For Mobile PWA)

Before deploying, create icons for mobile installation:

1. Open `create-icons.html` in your web browser (double-click the file)
2. Click **"Download 192x192"** button
3. Click **"Download 512x512"** button  
4. Save both files to the `public/` folder as:
   - `icon-192.png`
   - `icon-512.png`

These icons will be used when users add your app to their mobile home screen! 📱

### 2. Install Firebase CLI (If Not Installed)

Open PowerShell or Command Prompt as Administrator:

```powershell
npm install -g firebase-tools
```

Verify installation:
```powershell
firebase --version
```

### 2. Install Project Dependencies

Navigate to your project folder:

```powershell
cd "C:\Users\mroug\Desktop\web inv"
npm install
```

This will install all required packages (React, Firebase, Tailwind, etc.)

### 3. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Enter project name: `sujata-mastani-inventory`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 4. Enable Firebase Services

#### Enable Authentication:
1. In Firebase Console, click **"Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"**
5. Click **"Save"**

#### Create Firestore Database:
1. In Firebase Console, click **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose location (e.g., `asia-south1` for India)
5. Click **"Enable"**

### 5. Get Firebase Configuration

1. Click the gear icon (⚙️) → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click the **web icon** (`</>`)
4. Register app name: `Sujata Mastani Web`
5. **Copy the firebaseConfig object** - it looks like:

```javascript
{
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

### 6. Configure Environment Variables

1. Copy the template file:
   ```powershell
   copy env.template .env
   ```

2. Open `.env` in Notepad and paste your config:
   ```env
   VITE_APP_ID=sujata-mastani-inventory
   VITE_FIREBASE_CONFIG={"apiKey":"YOUR_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT","storageBucket":"YOUR_PROJECT.appspot.com","messagingSenderId":"YOUR_ID","appId":"YOUR_APP_ID"}
   ```

   **Important**: Make it a single line with no spaces in the JSON!

### 7. Initialize Firebase

```powershell
firebase login
```

This will open a browser window - log in with your Google account.

Then initialize the project:
```powershell
firebase init
```

**Answer the prompts:**
- "Which Firebase features?" → Select **Firestore** and **Hosting** (use Space to select, Enter to confirm)
- "Please select an option" → **Use an existing project**
- "Select a default Firebase project" → Select your project
- "What file should be used for Firestore Rules?" → Press Enter (use `firestore.rules`)
- "What file should be used for Firestore indexes?" → Press Enter (use `firestore.indexes.json`)
- "What do you want to use as your public directory?" → Type `dist`
- "Configure as a single-page app?" → Type `y` (Yes)
- "Set up automatic builds?" → Type `n` (No)
- "File dist/index.html already exists. Overwrite?" → Type `n` (No)

### 8. Deploy Security Rules

```powershell
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 9. Test Locally (Optional but Recommended)

```powershell
npm run dev
```

Open http://localhost:3000 and test the app.  
Press `Ctrl+C` to stop the server.

### 10. Build and Deploy

Build the production version:
```powershell
npm run build
```

Deploy to Firebase Hosting:
```powershell
firebase deploy --only hosting
```

**Your app is now live! 🎉**

The deployment command will show your URL, like:
```
✔  Deploy complete!

Hosting URL: https://your-project-id.web.app
```

## Post-Deployment Setup

### Create Your First Admin User

1. Open your deployed URL in a browser
2. Click **"Log In / Register"**
3. Toggle to **"Admin Registration"**
4. Enter a secure email and password (min 6 characters)
5. Click **"Register Admin"**

**This first user automatically becomes a super admin.**

### Add Staff Users

1. Log in as admin
2. Click the **"Users"** tab at the bottom
3. Fill in the form:
   - Email (e.g., staff@sujatamastani.com)
   - Password (min 6 characters)
   - Role: Staff or Admin
   - Store: Select from dropdown
4. Click **"Create User Account"**

### Manage Stores

1. Log in as admin
2. Click the **"Stores"** tab
3. Add new stores or remove old ones
4. Users assigned to deleted stores will need to be reassigned

## Updating the App

When you make changes to the code:

```powershell
# 1. Test locally
npm run dev

# 2. Build
npm run build

# 3. Deploy
firebase deploy --only hosting
```

Or use the shortcut:
```powershell
npm run deploy
```

## Common Issues & Fixes

### Issue: `firebase: command not found`
**Fix:** Install Firebase CLI globally:
```powershell
npm install -g firebase-tools
```

### Issue: `npm install` fails
**Fix:** Delete `node_modules` and try again:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Issue: Permission denied in Firestore
**Fix:** Deploy security rules:
```powershell
firebase deploy --only firestore:rules
```

### Issue: Environment variables not working
**Fix:** 
1. Ensure `.env` file exists in project root
2. Restart dev server after changing `.env`
3. Make sure JSON in `VITE_FIREBASE_CONFIG` is on one line

### Issue: Build fails
**Fix:** Clear the dist folder:
```powershell
Remove-Item -Recurse -Force dist
npm run build
```

## Accessing Your App

- **Live URL**: `https://YOUR_PROJECT_ID.web.app`
- **Firebase Console**: `https://console.firebase.google.com/project/YOUR_PROJECT_ID`
- **Firestore Database**: Console → Firestore Database
- **User Management**: Console → Authentication → Users

## 📱 Installing on Mobile Devices

Your app is a **Progressive Web App (PWA)** and can be installed on phones like a native app!

### Android Installation

1. Open your app URL in **Chrome** or **Edge**
2. Look for "Add to Home screen" banner at bottom
   - OR tap menu (⋮) → **"Add to Home screen"**
3. Tap **"Add"**
4. App icon appears on home screen! 🎉

### iPhone Installation

1. Open your app URL in **Safari**
2. Tap the **Share button** (bottom center)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** (top right)
5. App icon appears on home screen! 🎉

### PWA Features After Installation

✅ **Full-screen mode** - No browser UI  
✅ **App icon** - Custom orange icon on home screen  
✅ **Fast loading** - Cached for quick access  
✅ **Portrait lock** - Always stays vertical  
✅ **Offline support** - Basic offline functionality  

**For detailed mobile instructions, see [MOBILE_GUIDE.md](MOBILE_GUIDE.md)**

## Security Best Practices

1. ✅ **Never commit `.env` file** - it's in `.gitignore`
2. ✅ **Use strong passwords** for all accounts
3. ✅ **Keep Firebase config secret** - don't share publicly
4. ✅ **Regularly backup Firestore data** - Console → Firestore → Export
5. ✅ **Monitor usage** - Console → Usage & billing

## Costs

Firebase has a generous **free tier**:
- ✅ Hosting: 10 GB storage, 360 MB/day transfer
- ✅ Firestore: 50K reads/day, 20K writes/day
- ✅ Auth: Unlimited users

For a small business with 2-5 stores, you'll likely stay within free limits.

## Support

If you encounter issues:
1. Check the Firebase Console for errors
2. Review Firestore rules deployment
3. Ensure all environment variables are set correctly
4. Check browser console for JavaScript errors (F12)

---

**You're all set! Happy managing! 📊🚀**

