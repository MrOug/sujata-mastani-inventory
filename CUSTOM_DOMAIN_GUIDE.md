# 🌐 Custom Domain & Server Deployment Guide

You have **two excellent options** for deploying with your own domain:

## 🔥 Option 1: Firebase + Custom Domain (RECOMMENDED ⭐)

**Best for you because:**
- ✅ **Easiest setup** (5 minutes)
- ✅ **Free SSL certificate** (automatic HTTPS)
- ✅ **Global CDN** (fast worldwide)
- ✅ **Auto-scaling** (handles traffic spikes)
- ✅ **No server management**
- ✅ **PWA features work perfectly**

### Step 1: Deploy to Firebase First

```powershell
cd "C:\Users\mroug\Desktop\web inv"
npm install
npm run build
firebase deploy --only hosting
```

This gives you: `https://your-project.web.app`

### Step 2: Buy Your Domain

Buy from any registrar:
- **GoDaddy** (godaddy.com)
- **Namecheap** (namecheap.com)
- **Google Domains** (domains.google)
- **BigRock** (bigrock.in) - Popular in India

Example domain: `sujatamastani.com` or `inventory.sujatamastani.com`

### Step 3: Connect Domain to Firebase

#### In Firebase Console:

1. Go to https://console.firebase.google.com/
2. Select your project
3. Click **"Hosting"** in left menu
4. Click **"Add custom domain"**
5. Enter your domain: `inventory.sujatamastani.com`
6. Click **"Continue"**
7. Firebase will show you DNS records to add

#### In Your Domain Registrar (e.g., GoDaddy):

1. Log in to your domain registrar
2. Go to **DNS Management** or **DNS Settings**
3. Add the records Firebase showed you:

**For subdomain (inventory.sujatamastani.com):**
```
Type: A
Name: inventory
Value: [IP addresses Firebase provided]
TTL: 1 hour (or default)
```

**For root domain (sujatamastani.com):**
```
Type: A
Name: @
Value: [Firebase IP addresses]
TTL: 1 hour
```

4. **Save changes**
5. Wait 5-30 minutes for DNS to propagate

#### Back in Firebase:

1. Click **"Verify"** button
2. Wait for SSL certificate (automatic, takes 10-30 minutes)
3. Done! Your app is live at your custom domain! 🎉

### Result:

✅ Your app at: `https://inventory.sujatamastani.com`  
✅ Automatic HTTPS (SSL certificate)  
✅ Fast global CDN  
✅ PWA installation works perfectly  
✅ No server to manage  

---

## 🖥️ Option 2: Your Own Server (VPS/Cloud)

**Choose this if you:**
- Want full control
- Already have a server
- Need custom backend features

### Servers You Can Use:

1. **DigitalOcean** ($5-12/month) - digitalocean.com
2. **AWS Lightsail** ($5-10/month) - aws.amazon.com/lightsail
3. **Linode** ($5-10/month) - linode.com
4. **Vultr** ($5-12/month) - vultr.com
5. **Hostinger VPS** (₹349-699/month) - hostinger.in

### Step 1: Build Your App

```powershell
cd "C:\Users\mroug\Desktop\web inv"
npm install
npm run build
```

This creates a `dist` folder with all your app files.

### Step 2: Set Up Your Server

#### Option A: Ubuntu Server (Most Common)

**Connect to your server via SSH:**
```bash
ssh root@your-server-ip
```

**Install required software:**
```bash
# Update system
apt update && apt upgrade -y

# Install Nginx (web server)
apt install nginx -y

# Install Certbot (for SSL)
apt install certbot python3-certbot-nginx -y

# Enable firewall
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

**Upload your app files:**

On your Windows PC:
```powershell
# Install WinSCP or use SCP command
# Copy the entire dist folder to server
scp -r dist/* root@your-server-ip:/var/www/html/
```

Or use FileZilla/WinSCP GUI to upload `dist` folder contents to `/var/www/html/`

### Step 3: Configure Nginx

**Create Nginx config:**
```bash
nano /etc/nginx/sites-available/sujatamastani
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name inventory.sujatamastani.com;
    root /var/www/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - important for React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker
    location /sw.js {
        add_header Cache-Control "no-cache";
        expires off;
    }

    # Manifest
    location /manifest.json {
        add_header Cache-Control "no-cache";
        expires off;
    }
}
```

**Enable the site:**
```bash
ln -s /etc/nginx/sites-available/sujatamastani /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
```

### Step 4: Point Domain to Server

In your domain registrar's DNS settings:

```
Type: A
Name: inventory (or @ for root)
Value: YOUR_SERVER_IP
TTL: 1 hour
```

Wait 10-30 minutes for DNS propagation.

Test: `http://inventory.sujatamastani.com`

### Step 5: Add SSL Certificate (HTTPS)

**Get free SSL from Let's Encrypt:**
```bash
certbot --nginx -d inventory.sujatamastani.com
```

Follow prompts:
- Enter email address
- Agree to terms
- Choose to redirect HTTP to HTTPS (recommended)

**Result:** Your app is now at `https://inventory.sujatamastani.com` 🎉

**Auto-renewal** (SSL certificates expire every 90 days):
```bash
# Test renewal
certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
```

### Step 6: Keep Firebase for Database

**Important:** Even with your own server, you still use Firebase for:
- ✅ Database (Firestore)
- ✅ Authentication
- ✅ User management

Your server only hosts the **frontend files**.

---

## 🌍 Domain Setup Examples

### Example 1: Subdomain
```
Domain: sujatamastani.com
Subdomain: inventory.sujatamastani.com
Your app: https://inventory.sujatamastani.com
```

### Example 2: Root Domain
```
Domain: smstock.in
Your app: https://smstock.in
```

### Example 3: Multiple Stores
```
Store 1: https://kothrud.sujatamastani.com
Store 2: https://pune.sujatamastani.com
Admin: https://admin.sujatamastani.com
```

---

## 💰 Cost Comparison

### Firebase + Custom Domain (Option 1)
- Domain: ₹500-1000/year
- Firebase Hosting: **FREE** (generous limits)
- SSL Certificate: **FREE** (automatic)
- **Total: ₹500-1000/year**

### Your Own Server (Option 2)
- Domain: ₹500-1000/year
- Server: ₹300-700/month (₹3600-8400/year)
- SSL Certificate: **FREE** (Let's Encrypt)
- **Total: ₹4100-9400/year**

---

## 🚀 Quick Start (Recommended Path)

### Fastest Setup (30 minutes):

1. **Deploy to Firebase:**
   ```powershell
   npm install
   npm run build
   firebase deploy
   ```

2. **Buy domain** at GoDaddy/Namecheap
   - Suggested: `inventory.sujatamastani.com`

3. **Connect domain** in Firebase Console:
   - Hosting → Add custom domain
   - Copy DNS records
   - Add to domain registrar
   - Wait 30 minutes

4. **Done!** Your app is live at your domain! 🎉

---

## 📱 Mobile Installation with Custom Domain

Once your custom domain is live:

**Android:**
```
1. Open https://inventory.sujatamastani.com in Chrome
2. Tap "Add to Home screen"
3. Done!
```

**iPhone:**
```
1. Open https://inventory.sujatamastani.com in Safari
2. Tap Share → "Add to Home Screen"
3. Done!
```

Staff will see your branded domain and icon! 🎨

---

## 🔧 Updating Your App

### With Firebase:
```powershell
npm run build
firebase deploy
```
**Updates live in 2 minutes!**

### With Your Server:
```powershell
npm run build
scp -r dist/* root@your-server-ip:/var/www/html/
```
**Or use FileZilla to upload dist folder**

---

## 🆘 Troubleshooting

### Domain not working?
- Wait 30-60 minutes for DNS propagation
- Check DNS with: https://dnschecker.org/
- Verify A records point to correct IP

### SSL not working?
- Firebase: Wait 30 mins, it's automatic
- Server: Run `certbot --nginx -d yourdomain.com`

### App shows blank page?
- Check browser console (F12)
- Verify environment variables in `.env`
- Rebuild: `npm run build`

### PWA not installing?
- Must use HTTPS (not HTTP)
- Clear browser cache
- Check manifest.json is accessible

---

## 🎯 My Recommendation

**For your use case (inventory management for 2-5 stores):**

### ✅ Use Firebase + Custom Domain

**Why?**
1. **Easiest** - Setup in 30 minutes
2. **Cheapest** - Only pay for domain
3. **Most reliable** - Google's infrastructure
4. **Auto-scaling** - Handles any traffic
5. **No maintenance** - No server to manage
6. **Perfect PWA** - All features work
7. **Fast updates** - Deploy in 2 minutes

**Steps:**
```powershell
# 1. Deploy
npm run deploy

# 2. Buy domain at GoDaddy
# 3. Connect in Firebase Console (5 minutes)
# 4. Wait 30 minutes
# 5. Done!
```

---

## 📞 Need Help?

Common providers for domains in India:
- **BigRock**: bigrock.in
- **GoDaddy**: godaddy.com
- **Hostinger**: hostinger.in
- **Namecheap**: namecheap.com

All of these work perfectly with Firebase!

---

**Ready to deploy? Follow Option 1 (Firebase + Custom Domain) for the easiest experience!** 🚀

