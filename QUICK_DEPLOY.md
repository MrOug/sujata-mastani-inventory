# ⚡ Quick Deploy Cheat Sheet

## 🚀 EASIEST: Vercel (RECOMMENDED ⭐)

### 1️⃣ Deploy to Vercel (5 minutes)

```powershell
# Push to GitHub
cd "C:\Users\mroug\Desktop\web inv"
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/sujata-mastani-inventory.git
git push -u origin main

# Go to vercel.com
# Sign up with GitHub
# Click "Import Project"
# Select your repo
# Click "Deploy"
```

**Result:** App live at `https://your-project.vercel.app` in 2 minutes! 🎉

### 2️⃣ Add Environment Variables

In Vercel dashboard:
- Settings → Environment Variables
- Add: `VITE_APP_ID`
- Add: `VITE_FIREBASE_CONFIG`
- Redeploy

### 3️⃣ Add Custom Domain (Optional)

- Vercel → Settings → Domains
- Add your domain
- Update DNS (CNAME record)
- Done!

**See full guide:** `VERCEL_DEPLOY.md`

---

## 🔥 ALTERNATIVE: Firebase + Custom Domain

### 1️⃣ First Time Setup (15 minutes)

```powershell
# In your project folder
cd "C:\Users\mroug\Desktop\web inv"

# Install dependencies
npm install

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create .env file with your Firebase config
copy env.template .env
# Edit .env with your Firebase details

# Initialize Firebase
firebase init
# Select: Firestore + Hosting
# Choose: Existing project
# Firestore rules: firestore.rules
# Public directory: dist
# Single-page app: Yes

# Deploy rules
firebase deploy --only firestore:rules

# Build and deploy
npm run build
firebase deploy --only hosting
```

**Result:** App live at `https://YOUR_PROJECT.web.app`

---

### 2️⃣ Connect Your Domain (15 minutes)

#### Buy Domain
- Go to **GoDaddy.com** or **Namecheap.com** or **BigRock.in**
- Buy: `yourdomain.com` (₹500-1000/year)

#### In Firebase Console:
1. Go to https://console.firebase.google.com
2. Your project → **Hosting** → **Add custom domain**
3. Enter: `inventory.yourdomain.com` (or just `yourdomain.com`)
4. Firebase shows DNS records (write them down!)

#### In Domain Provider (GoDaddy/Namecheap):
1. Login → Go to **DNS Management**
2. Add **A record**:
   ```
   Type: A
   Name: inventory (or @ for root)
   Value: [IP from Firebase]
   TTL: 1 hour
   ```
3. **Save**
4. Wait 30-60 minutes

**Result:** App live at `https://inventory.yourdomain.com` 🎉

---

## 🖥️ ADVANCED: Your Own Server

### If You Have VPS/Cloud Server

#### 1️⃣ Build
```powershell
npm run build
```

#### 2️⃣ Upload to Server

**Using FileZilla (GUI):**
- Download: https://filezilla-project.org/
- Connect to your server
- Upload `dist` folder contents to `/var/www/html/`

**Using Command Line:**
```powershell
scp -r dist/* root@YOUR_SERVER_IP:/var/www/html/
```

#### 3️⃣ Server Setup (Ubuntu)

```bash
# Connect via SSH
ssh root@YOUR_SERVER_IP

# Install Nginx
apt update
apt install nginx -y

# Install SSL tool
apt install certbot python3-certbot-nginx -y

# Allow traffic
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

#### 4️⃣ Configure Domain

**In domain provider:**
```
Type: A
Name: inventory
Value: YOUR_SERVER_IP
TTL: 1 hour
```

#### 5️⃣ Add SSL (HTTPS)

```bash
certbot --nginx -d inventory.yourdomain.com
# Follow prompts, choose redirect HTTP to HTTPS
```

**Done!** App at `https://inventory.yourdomain.com`

---

## 🔄 How to Update App

### Firebase:
```powershell
npm run build
firebase deploy --only hosting
```
**Live in 2 minutes!**

### Own Server:
```powershell
npm run build
scp -r dist/* root@YOUR_SERVER_IP:/var/www/html/
```

---

## 📱 Share with Staff

Once deployed, share:
```
App URL: https://inventory.yourdomain.com

Android:
- Open in Chrome
- Menu → Add to Home screen

iPhone:
- Open in Safari  
- Share → Add to Home Screen
```

---

## 🆘 Common Commands

```powershell
# Install everything
npm install

# Test locally
npm run dev

# Build for production
npm run build

# Deploy to Firebase
firebase deploy

# Check Firebase project
firebase projects:list

# Login to Firebase
firebase login
```

---

## 💡 Tips

✅ **Use Firebase** - Easier, cheaper, no maintenance  
✅ **Use subdomain** - `inventory.yourdomain.com` instead of root  
✅ **Wait for DNS** - Takes 30-60 minutes after adding records  
✅ **Test on phone** - Make sure PWA installation works  
✅ **Generate icons** - Open `create-icons.html`, download to `public/`  

---

## 📊 Costs

### Firebase Option:
- Domain: ₹500-1000/year
- Hosting: FREE
- SSL: FREE (automatic)
- **Total: ₹500-1000/year**

### Server Option:
- Domain: ₹500-1000/year
- Server: ₹300-700/month
- SSL: FREE (Let's Encrypt)
- **Total: ₹4000-9000/year**

---

**Recommended: Start with Firebase, it's easiest!** 🚀

