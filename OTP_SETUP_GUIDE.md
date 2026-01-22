# 📱 WhatsApp & SMS OTP Setup Guide

This guide will help you set up **FREE** OTP (One-Time Password) for your Sujata Mastani Inventory admin registration.

## 🎯 Current Status
- ✅ OTP system is working in **development mode**
- ⚠️ OTP is shown in browser console and alert popup
- 🔧 To send real OTP, configure any provider below

---

## 🚀 Quick Setup (5 minutes)

### Option 1: 2Factor.in - SMS (EASIEST & FREE) ⭐

**Best for: Quick setup, no credit card required**

#### Steps:
1. **Sign up**: Go to [https://2factor.in](https://2factor.in)
2. **Verify phone**: Enter your phone number
3. **Get API Key**: 
   - Login to dashboard
   - Click on "API Settings"
   - Copy your API key
4. **Add to code**:
   - Open `src/utils/otp-utils.js`
   - Find line: `const TWOFACTOR_API_KEY = '';`
   - Replace with: `const TWOFACTOR_API_KEY = 'YOUR_API_KEY_HERE';`
5. **Done!** 🎉 You get **10 FREE SMS per day**

#### Example:
```javascript
const TWOFACTOR_API_KEY = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

---

### Option 2: AiSensy - WhatsApp (BEST FOR BUSINESS) 🌟

**Best for: Professional WhatsApp messages, 1000 free/month**

#### Steps:
1. **Sign up**: Go to [https://www.aisensy.com](https://www.aisensy.com)
2. **Connect WhatsApp Business**:
   - Follow their setup wizard
   - Connect your business phone number
   - Get approved (takes 1-2 hours)
3. **Create OTP Template**:
   - Go to Templates section
   - Create new template named "otp_verification"
   - Content: `Your Sujata Mastani Inventory OTP is: {{1}}. Valid for 5 minutes.`
   - Submit for approval (instant)
4. **Get API Key**:
   - Go to API Settings
   - Copy API Key and Project Name
5. **Add to code**:
   ```javascript
   const AISENSY_API_KEY = 'YOUR_API_KEY';
   const AISENSY_PROJECT_NAME = 'otp_verification';
   ```
6. **Done!** 🎉 You get **1000 FREE messages per month**

---

### Option 3: Fast2SMS - SMS (50 FREE PER DAY) 📱

**Best for: More free SMS messages**

#### Steps:
1. **Sign up**: Go to [https://www.fast2sms.com](https://www.fast2sms.com)
2. **Verify phone & email**
3. **Complete KYC** (optional, but needed for more credits)
4. **Get API Key**:
   - Go to Dashboard
   - Click on "API Keys"
   - Copy your key
5. **Add to code**:
   ```javascript
   const FAST2SMS_API_KEY = 'YOUR_FAST2SMS_API_KEY';
   ```
6. **Done!** 🎉 You get **50 FREE SMS per day**

---

### Option 4: Interakt - WhatsApp (FOR STARTUPS) 💼

**Best for: Startups, good WhatsApp engagement tools**

#### Steps:
1. **Sign up**: Go to [https://www.interakt.shop](https://www.interakt.shop)
2. **Apply for startup plan** (if eligible)
3. **Connect WhatsApp Business API**
4. **Create OTP template** in their dashboard
5. **Get API Key** from settings
6. **Add to code**:
   ```javascript
   const INTERAKT_API_KEY = 'YOUR_API_KEY_BASE64';
   ```
7. **Done!** 🎉

---

### Option 5: Twilio - SMS & WhatsApp (PREMIUM) 💎

**Best for: Most reliable, supports both SMS and WhatsApp**

#### Steps:
1. **Sign up**: Go to [https://www.twilio.com](https://www.twilio.com)
2. **Get $15 free trial credit**
3. **Get credentials**:
   - Account SID (from dashboard)
   - Auth Token (from dashboard)
   - Phone Number (buy/rent a number)
4. **For WhatsApp**: Enable WhatsApp on your number
5. **Add to code**:
   ```javascript
   const TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxx';
   const TWILIO_AUTH_TOKEN = 'your_auth_token';
   const TWILIO_PHONE = '+1234567890'; // or 'whatsapp:+1234567890'
   ```
6. **Done!** 🎉

---

## 📝 Configuration

### Where to add API keys:
1. Open: `src/utils/otp-utils.js`
2. Find the provider section (lines 30-200)
3. Add your API key(s)
4. Save and rebuild

### Example Configuration:
```javascript
// In src/utils/otp-utils.js

// For 2Factor
const TWOFACTOR_API_KEY = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// For AiSensy
const AISENSY_API_KEY = 'your_aisensy_key_here';
const AISENSY_PROJECT_NAME = 'otp_verification';

// For Fast2SMS
const FAST2SMS_API_KEY = 'your_fast2sms_key_here';
```

---

## 🔄 How It Works

The system tries providers in this order:
1. **AiSensy WhatsApp** (if configured)
2. **Interakt WhatsApp** (if configured)
3. **2Factor SMS** (if configured)
4. **Fast2SMS** (if configured)
5. **MSG91 SMS** (if configured)
6. **Twilio WhatsApp/SMS** (if configured)
7. **TextLocal SMS** (if configured)
8. **Development Mode** (shows OTP in console/alert)

If one fails, it automatically tries the next! 🎯

---

## ✅ Testing

### After configuration:
1. Build your app: `npm run build`
2. Run locally: `npm run dev`
3. Try registering an admin
4. Check if OTP arrives on **+91 99224 22233**

### Troubleshooting:
- **No OTP received?** 
  - Check console for error messages
  - Verify API key is correct
  - Ensure phone number format is correct
  
- **Still in dev mode?**
  - Make sure you saved `otp-utils.js`
  - Rebuild the app
  - Clear browser cache

---

## 💰 Cost Comparison

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **2Factor** | 10 SMS/day | Quick setup |
| **AiSensy** | 1000 msg/month | WhatsApp business |
| **Fast2SMS** | 50 SMS/day | More messages |
| **Interakt** | Varies | Startups |
| **Twilio** | $15 credit | Premium reliability |
| **TextLocal** | 100 credits | Testing |

---

## 🎯 Recommendation

**For your use case** (admin registration):
1. **Start with**: **2Factor.in** (easiest, no card needed)
2. **Upgrade to**: **AiSensy** (professional WhatsApp for customers)

---

## 📞 Current OTP Phone Number

The OTP is sent to: **+91 99224 22233**

To change this number:
- Edit `src/utils/otp-utils.js`
- Change `const ADMIN_PHONE = '+919922422233';`

---

## 🆘 Need Help?

1. Check browser console (F12) for error messages
2. Verify API keys are correct
3. Ensure provider account is active
4. Check provider dashboard for delivery status

---

## ✨ After Setup

Once configured:
1. Push to GitHub: `git push`
2. Deploy to Vercel: `vercel --prod`
3. OTP will work on production too! 🚀

---

**Current Status**: Development Mode (OTP shown in console)  
**Next Step**: Choose a provider and add API key!  
**Time Required**: 5-10 minutes ⏱️

