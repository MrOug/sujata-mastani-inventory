# Sujata Mastani - Inventory Management System

A comprehensive stock management system for managing inventory across multiple Sujata Mastani outlets.

## Features

- 📊 **Stock Entry** - Daily closing stock entry for staff
- 📈 **Sales Reports** - Automatic calculation of stock sold
- 🛒 **Order Management** - Admin ordering system with export functionality
- 👥 **Multi-User Support** - Role-based access (Admin & Staff)
- 🏪 **Multi-Store Support** - Manage multiple outlet locations
- 🔒 **Secure Authentication** - Firebase Authentication with role management
- 📱 **PWA Ready** - Install on mobile home screen like a native app
- ⚡ **Offline Support** - Service worker for offline functionality
- 🎨 **Mobile Optimized** - Touch-friendly UI, portrait mode, full-screen

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting
- **Icons**: Lucide React

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli) - Install with: `npm install -g firebase-tools`

## Setup Instructions

### 1. Clone the Repository

```bash
cd "C:\Users\mroug\Desktop\web inv"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable **Email/Password Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password"
4. Create a **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in **production mode** (we'll deploy rules later)
   - Choose a location closest to your users

#### Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to create a web app
4. Copy the `firebaseConfig` object

#### Configure Environment Variables

1. Create a `.env` file in the project root:
   ```bash
   copy env.template .env
   ```

2. Edit `.env` and add your Firebase configuration:
   ```env
   VITE_APP_ID=your-app-id
   VITE_FIREBASE_CONFIG={"apiKey":"YOUR_API_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT_ID","storageBucket":"YOUR_PROJECT.appspot.com","messagingSenderId":"YOUR_SENDER_ID","appId":"YOUR_APP_ID"}
   ```

### 4. Initialize Firebase in Your Project

```bash
firebase login
firebase init
```

When prompted:
- Select **Hosting** and **Firestore**
- Choose **Use an existing project** and select your Firebase project
- For Firestore rules, use `firestore.rules`
- For Firestore indexes, use `firestore.indexes.json`
- For hosting public directory, enter: `dist`
- Configure as single-page app: **Yes**
- Set up automatic builds: **No**

### 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Development

### Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### 🚀 Option 1: Vercel (Recommended - Easiest)

**See complete guide: [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)**

Quick steps:
```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# Deploy on vercel.com
# Import your GitHub repo
# Add environment variables
# Done! ✅
```

Your app will be live at: `https://your-project.vercel.app`

### 🔥 Option 2: Firebase Hosting

**See complete guide: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

```bash
npm run build
firebase deploy --only hosting
```

Or use the combined script:

```bash
npm run deploy
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

### Deploy Everything (Hosting + Firestore Rules)

```bash
firebase deploy
```

## First Time Setup

### 1. Generate App Icons (For Mobile)

Before deploying, create your PWA icons:

1. Open `create-icons.html` in a web browser
2. Click "Download 192x192" and "Download 512x512"
3. Save both files to the `public/` folder as:
   - `icon-192.png`
   - `icon-512.png`

### 2. Create First Admin Account

1. Navigate to your deployed app URL
2. Click "Log In / Register"
3. Toggle to "Register Admin"
4. Create your super admin account with email and password
5. This first user will automatically get admin role

### 3. Install on Mobile (Optional)

**For detailed mobile installation instructions, see [MOBILE_GUIDE.md](MOBILE_GUIDE.md)**

Quick steps:
- **Android**: Open in Chrome → Menu → "Add to Home screen"
- **iPhone**: Open in Safari → Share → "Add to Home Screen"

Your app will install like a native mobile app! 📱

### Create Additional Users (Admin Only)

1. Log in as admin
2. Go to "Users" tab in the navigation
3. Fill in email, password, role (staff/admin), and assign a store
4. Click "Create User Account"

### Add/Remove Stores (Admin Only)

1. Log in as admin
2. Go to "Stores" tab in the navigation
3. Add new stores or delete existing ones
4. Users can be assigned to stores in the user management section

## Usage

### For Staff

1. **Stock Entry**:
   - Log in with assigned credentials
   - Select your store
   - Enter closing stock numbers for all items
   - Click "Save Closing Stock"

### For Admins

1. **Stock Entry**: Same as staff, but can access all stores

2. **View Sales Report**:
   - Select a store
   - Navigate to "Sold" tab
   - View total units sold and detailed breakdown
   - Formula: Yesterday's Closing Stock - Today's Current Stock

3. **Order Management**:
   - Select a store
   - Navigate to "Order" tab
   - Enter required quantities for next day
   - Click "Generate Order List & Copy"
   - Order list is copied to clipboard

4. **User Management**:
   - Create new staff/admin accounts
   - Assign users to specific stores

5. **Store Management**:
   - Add new outlet locations
   - Remove old stores

## Firestore Data Structure

```
artifacts/
  {appId}/
    public/
      data/
        stores/
          {storeId}
            - name: string
            - createdAt: timestamp
        stock_entries/
          {storeId}-{date}
            - storeId: string
            - date: string (YYYY-MM-DD)
            - stock: object
            - userId: string
            - timestamp: timestamp
    users/
      {userId}/
        user_config/
          profile
            - role: "admin" | "staff"
            - storeId: string
            - email: string
```

## Security

- All data requires authentication (no anonymous access)
- Staff can only access their assigned store
- Admins have full access to all stores
- Firestore security rules enforce role-based access
- Passwords must be minimum 6 characters

## Troubleshooting

### Build Issues

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Firebase Deployment Issues

```bash
# Re-login to Firebase
firebase logout
firebase login

# Check you're using the right project
firebase projects:list
firebase use YOUR_PROJECT_ID
```

### Environment Variables Not Working

- Make sure `.env` file is in the project root
- Variable names must start with `VITE_`
- Restart the dev server after changing `.env`

### Permission Denied Errors

- Ensure Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Check that users have proper roles assigned in the database

## Project Structure

```
web inv/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── dist/                # Production build (generated)
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── firebase.json        # Firebase configuration
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── README.md           # This file
```

## Support

For issues or questions, contact the development team.

## License

Proprietary - All rights reserved by Sujata Mastani

---

**Built with ❤️ for Sujata Mastani**

#   F o r c e   r e d e p l o y   1 0 / 1 8 / 2 0 2 5   1 5 : 2 5 : 5 7  
 