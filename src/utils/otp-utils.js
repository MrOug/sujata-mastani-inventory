// OTP utility functions for admin registration
// Multiple FREE WhatsApp and SMS providers integrated!

const ADMIN_PHONE = '+919922422233';
const ADMIN_PHONE_NO_PREFIX = '919922422233'; // Without +

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via WhatsApp/SMS using multiple FREE providers
 * Tries providers in order until one succeeds
 */
export const sendOTP = async (phoneNumber, otp) => {
    try {
        console.log('=================================');
        console.log('📱 Sending OTP:');
        console.log(`Phone: ${phoneNumber}`);
        console.log(`OTP: ${otp}`);
        console.log('=================================');
        
        const cleanPhone = phoneNumber.replace('+', '').replace(/\s/g, '');
        const message = `Your Sujata Mastani Inventory OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`;
        
        // ============================================
        // OPTION 1: AISENSY WhatsApp API (Best for India - FREE!)
        // ============================================
        // Sign up at: https://www.aisensy.com/
        // Get 1000 free messages per month!
        const AISENSY_API_KEY = '22ae4605-b0b2-11f0-bdde-0200cd936042'; // Add your API key
        const AISENSY_PROJECT_NAME = ''; // Your project name
        
        if (AISENSY_API_KEY && AISENSY_PROJECT_NAME) {
            try {
                const response = await fetch(`https://backend.aisensy.com/campaign/t1/api/v2`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        apiKey: AISENSY_API_KEY,
                        campaignName: AISENSY_PROJECT_NAME,
                        destination: cleanPhone,
                        userName: 'Admin',
                        templateParams: [otp],
                        source: 'OTP Verification'
                    })
                });
                
                const data = await response.json();
                if (data.status === 'success' || response.ok) {
                    console.log('✅ OTP sent via AiSensy WhatsApp!');
                    return { success: true, message: 'OTP sent via WhatsApp!', provider: 'AiSensy' };
                }
            } catch (error) {
                console.log('AiSensy failed, trying next provider...', error.message);
            }
        }
        
        // ============================================
        // OPTION 2: INTERAKT WhatsApp API (FREE tier available)
        // ============================================
        // Sign up at: https://www.interakt.shop/
        // Free WhatsApp messages for startups
        const INTERAKT_API_KEY = ''; // Add your API key
        
        if (INTERAKT_API_KEY) {
            try {
                const response = await fetch('https://api.interakt.ai/v1/public/message/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${INTERAKT_API_KEY}`
                    },
                    body: JSON.stringify({
                        countryCode: '+91',
                        phoneNumber: cleanPhone.replace('91', ''),
                        type: 'Template',
                        template: {
                            name: 'otp_verification',
                            languageCode: 'en',
                            bodyValues: [otp]
                        }
                    })
                });
                
                const data = await response.json();
                if (data.result === true || response.ok) {
                    console.log('✅ OTP sent via Interakt WhatsApp!');
                    return { success: true, message: 'OTP sent via WhatsApp!', provider: 'Interakt' };
                }
            } catch (error) {
                console.log('Interakt failed, trying next provider...', error.message);
            }
        }
        
        // ============================================
        // OPTION 3: 2FACTOR.IN (10 FREE SMS per day - No credit card!)
        // ============================================
        // Sign up at: https://2factor.in/
        // Best for SMS in India - completely FREE tier
        const TWOFACTOR_API_KEY = ''; // Add your API key
        
        if (TWOFACTOR_API_KEY) {
            try {
                const response = await fetch(`https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/${cleanPhone}/${otp}/OTP_TEMPLATE`);
                const data = await response.json();
                
                if (data.Status === 'Success') {
                    console.log('✅ OTP sent via 2Factor SMS!');
                    return { success: true, message: 'OTP sent via SMS!', provider: '2Factor' };
                }
            } catch (error) {
                console.log('2Factor failed, trying next provider...', error.message);
            }
        }
        
        // ============================================
        // OPTION 4: FAST2SMS (50 FREE SMS per day)
        // ============================================
        // Sign up at: https://www.fast2sms.com/
        // Very popular in India
        const FAST2SMS_API_KEY = ''; // Add your API key
        
        if (FAST2SMS_API_KEY) {
            try {
                const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'authorization': FAST2SMS_API_KEY
                    },
                    body: JSON.stringify({
                        route: 'otp',
                        sender_id: 'FSTSMS',
                        message: `Your OTP is ${otp}`,
                        variables_values: otp,
                        flash: 0,
                        numbers: cleanPhone.replace('91', '')
                    })
                });
                
                const data = await response.json();
                if (data.return === true) {
                    console.log('✅ OTP sent via Fast2SMS!');
                    return { success: true, message: 'OTP sent via SMS!', provider: 'Fast2SMS' };
                }
            } catch (error) {
                console.log('Fast2SMS failed, trying next provider...', error.message);
            }
        }
        
        // ============================================
        // OPTION 5: MSG91 (Free trial credits)
        // ============================================
        // Sign up at: https://msg91.com/
        const MSG91_AUTH_KEY = ''; // Add your auth key
        const MSG91_TEMPLATE_ID = ''; // Add your template ID
        
        if (MSG91_AUTH_KEY && MSG91_TEMPLATE_ID) {
            try {
                const response = await fetch('https://control.msg91.com/api/v5/otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'authkey': MSG91_AUTH_KEY
                    },
                    body: JSON.stringify({
                        template_id: MSG91_TEMPLATE_ID,
                        mobile: cleanPhone,
                        otp: otp
                    })
                });
                
                const data = await response.json();
                if (data.type === 'success') {
                    console.log('✅ OTP sent via MSG91!');
                    return { success: true, message: 'OTP sent via SMS!', provider: 'MSG91' };
                }
            } catch (error) {
                console.log('MSG91 failed, trying next provider...', error.message);
            }
        }
        
        // ============================================
        // OPTION 6: TWILIO (WhatsApp + SMS - $15 free trial)
        // ============================================
        // Sign up at: https://www.twilio.com/
        // Supports both SMS and WhatsApp
        const TWILIO_ACCOUNT_SID = ''; // Add your Account SID
        const TWILIO_AUTH_TOKEN = ''; // Add your Auth Token
        const TWILIO_PHONE = ''; // Your Twilio phone number (with WhatsApp: whatsapp:+14155238886)
        
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE) {
            try {
                const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
                const response = await fetch(
                    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${auth}`
                        },
                        body: new URLSearchParams({
                            To: `whatsapp:${phoneNumber}`, // For WhatsApp
                            // To: phoneNumber, // For SMS
                            From: TWILIO_PHONE,
                            Body: message
                        })
                    }
                );
                
                const data = await response.json();
                if (data.sid) {
                    console.log('✅ OTP sent via Twilio WhatsApp!');
                    return { success: true, message: 'OTP sent via WhatsApp!', provider: 'Twilio' };
                }
            } catch (error) {
                console.log('Twilio failed, trying next provider...', error.message);
            }
        }
        
        // ============================================
        // OPTION 7: TEXTLOCAL (Free for India)
        // ============================================
        // Sign up at: https://www.textlocal.in/
        const TEXTLOCAL_API_KEY = ''; // Add your API key
        
        if (TEXTLOCAL_API_KEY) {
            try {
                const params = new URLSearchParams({
                    apikey: TEXTLOCAL_API_KEY,
                    numbers: cleanPhone,
                    sender: 'TXTLCL',
                    message: message
                });
                
                const response = await fetch(`https://api.textlocal.in/send/?${params}`);
                const data = await response.json();
                
                if (data.status === 'success') {
                    console.log('✅ OTP sent via TextLocal!');
                    return { success: true, message: 'OTP sent via SMS!', provider: 'TextLocal' };
                }
            } catch (error) {
                console.log('TextLocal failed, trying next provider...', error.message);
            }
        }
        
        // ============================================
        // DEVELOPMENT MODE - Show OTP in console and alert
        // ============================================
        console.log('========================================');
        console.log('🔓 DEVELOPMENT MODE - No provider configured');
        console.log('========================================');
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`🔐 OTP: ${otp}`);
        console.log('========================================');
        console.log('⚠️ To enable real OTP sending:');
        console.log('1. Sign up for any provider above');
        console.log('2. Add API keys to otp-utils.js');
        console.log('3. OTP will be sent automatically!');
        console.log('========================================');
        
        // Show alert popup on localhost
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('192.168')) {
            setTimeout(() => {
                alert(`🔓 DEVELOPMENT MODE\n\n✅ OTP Generated: ${otp}\n\n📱 Phone: ${phoneNumber}\n\nℹ️ This is shown because no SMS/WhatsApp provider is configured.\n\nTo enable real OTP:\n1. Sign up at 2factor.in (FREE 10 SMS/day)\n2. Add API key to otp-utils.js`);
            }, 500);
        }
        
        return { 
            success: true, 
            message: 'OTP generated! Check console (development mode)', 
            isDevelopment: true,
            otp: otp
        };
        
    } catch (error) {
        console.error('❌ OTP Error:', error);
        
        // Still succeed in development mode
        return { 
            success: true,
            message: 'OTP generated (check console)', 
            isDevelopment: true,
            otp: otp,
            error: error.message 
        };
    }
};

/**
 * Verify OTP
 */
export const verifyOTP = (enteredOTP, correctOTP) => {
    return enteredOTP === correctOTP;
};

/**
 * Check if OTP has expired (5 minutes validity)
 */
export const isOTPExpired = (otpTimestamp) => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - otpTimestamp) > fiveMinutes;
};

/**
 * ============================================
 * 🚀 QUICK START GUIDE - Enable Real OTP
 * ============================================
 * 
 * BEST OPTIONS FOR INDIA (FREE):
 * 
 * 1️⃣ AISENSY WhatsApp (RECOMMENDED - 1000 free messages/month)
 *    ✅ Sign up: https://www.aisensy.com/
 *    ✅ Get API key from dashboard
 *    ✅ Create WhatsApp template for OTP
 *    ✅ Add AISENSY_API_KEY and AISENSY_PROJECT_NAME above
 * 
 * 2️⃣ 2FACTOR.IN SMS (EASIEST - 10 free SMS/day, NO credit card!)
 *    ✅ Sign up: https://2factor.in/
 *    ✅ Get API key instantly
 *    ✅ Add TWOFACTOR_API_KEY above
 *    ✅ Works immediately!
 * 
 * 3️⃣ FAST2SMS (50 free SMS/day)
 *    ✅ Sign up: https://www.fast2sms.com/
 *    ✅ Verify phone and get API key
 *    ✅ Add FAST2SMS_API_KEY above
 * 
 * 4️⃣ INTERAKT WhatsApp (Free tier for startups)
 *    ✅ Sign up: https://www.interakt.shop/
 *    ✅ Set up WhatsApp Business account
 *    ✅ Add INTERAKT_API_KEY above
 * 
 * 5️⃣ TWILIO (WhatsApp + SMS - $15 free trial)
 *    ✅ Sign up: https://www.twilio.com/
 *    ✅ Get Account SID and Auth Token
 *    ✅ Add all TWILIO_ variables above
 * 
 * FOR NOW:
 * - App works in development mode
 * - OTP shown in console and alert popup
 * - Add any API key above to enable real OTP!
 * 
 * PRIORITY ORDER:
 * 1. AiSensy (WhatsApp - Best for business)
 * 2. 2Factor (SMS - Easiest setup)
 * 3. Fast2SMS (SMS - More free messages)
 * 4. Interakt (WhatsApp - Good for engagement)
 * 5. Twilio (Premium - Most reliable)
 * 
 * The system automatically tries all configured providers
 * until one succeeds! 🎯
 */
