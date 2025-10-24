# Delete All Firebase Users - Instructions

## Problem
Firebase CLI and client SDK don't have built-in commands to bulk delete authentication users. We need Firebase Admin SDK credentials.

## Solution: Get Service Account Key

### Step 1: Download Service Account Key

1. Go to **Firebase Console**: https://console.firebase.google.com/project/sujata-inventory/settings/serviceaccounts/adminsdk

2. Click **"Generate New Private Key"**

3. Click **"Generate Key"** to download the JSON file

4. Save the file as `serviceAccountKey.json` in this project folder:
   ```
   C:\Users\mroug\Desktop\sujata-mastani-inventory-main\sujata-mastani-inventory\
   ```

### Step 2: Run the Deletion Script

Once you have the service account key, I'll update the Node.js script to use it and delete all users automatically.

---

## Alternative: Manual Deletion from Firebase Console

If you prefer to delete users manually:

1. Go to: https://console.firebase.google.com/project/sujata-inventory/authentication/users

2. For each user:
   - Click on the user row
   - Click the **three dots (⋮)** menu at the top right
   - Select **"Delete account"**
   - Confirm deletion

3. Repeat for all users

---

## Quick Tip

If the Firebase Console has a checkbox next to users but you can't select them:
- Try refreshing the page (F5)
- Try a different browser (Chrome/Edge)
- Try clicking directly on the user's email, then use the delete option in the user details page

