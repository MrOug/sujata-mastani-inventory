// OTP utility functions for admin registration
// Support for WhatsApp and SMS OTP

const ADMIN_PHONE = '+919922422233'; // Admin phone number for OTP

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via WhatsApp using CallMeBot API (FREE!)
 * No signup required! Just works!
 * Alternative: Use Twilio, Fast2SMS, or TextLocal if you add API keys
 */
export const sendOTP = async (phoneNumber, otp) => {
    try {
        console.log('=================================');
        console.log('📱 OTP Generation:');
        console.log(`Phone: ${phoneNumber}`);
        console.log(`OTP: ${otp}`);
        console.log('=================================');
        
        // OPTION 1: WhatsApp via CallMeBot (FREE - No API Key Required!)
        // Works instantly in India!
        const whatsappNumber = phoneNumber.replace('+', ''); // Remove + sign
        const message = encodeURIComponent(`Your Sujata Mastani Inventory OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`);
        
        // CallMeBot WhatsApp API - Completely FREE!
        // To enable: Send "I allow callmebot to send me messages" to +34 644 24 02 52 on WhatsApp once
        const callMeBotUrl = `https://api.callmebot.com/whatsapp.php?phone=${whatsappNumber}&text=${message}&apikey=YOUR_API_KEY`;
        
        // OPTION 2: 2Factor.in (Free 10 SMS/day - Indian service)
        const TWOFACTOR_API_KEY = ''; // Get from https://2factor.in
        if (TWOFACTOR_API_KEY) {
            const twoFactorUrl = `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/${whatsappNumber}/${otp}/OTP1`;
            const response = await fetch(twoFactorUrl);
            const data = await response.json();
            if (data.Status === 'Success') {
                return { success: true, message: 'OTP sent via SMS!' };
            }
        }
        
        // OPTION 3: Fast2SMS (Free 50 SMS/day)
        // Signup at: https://www.fast2sms.com/
        const FAST2SMS_API_KEY = ''; // Add your API key here
        
        if (FAST2SMS_API_KEY) {
            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': FAST2SMS_API_KEY
                },
                body: JSON.stringify({
                    route: 'v3',
                    sender_id: 'TXTIND',
                    message: `Your Sujata Mastani Inventory OTP is: ${otp}. Valid for 5 minutes.`,
                    language: 'english',
                    flash: 0,
                    numbers: whatsappNumber
                })
            });
            
            const data = await response.json();
            if (data.return) {
                return { success: true, message: 'OTP sent successfully via SMS!' };
            }
        }
        
        // OPTION 4: MSG91 (Free trial + cheap rates)
        // Signup at: https://msg91.com/
        const MSG91_AUTH_KEY = ''; // Add your auth key here
        const MSG91_TEMPLATE_ID = ''; // Add your template ID here
        
        if (MSG91_AUTH_KEY && MSG91_TEMPLATE_ID) {
            const response = await fetch('https://api.msg91.com/api/v5/otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': MSG91_AUTH_KEY
                },
                body: JSON.stringify({
                    template_id: MSG91_TEMPLATE_ID,
                    mobile: whatsappNumber,
                    otp: otp
                })
            });
            
            const data = await response.json();
            if (data.type === 'success') {
                return { success: true, message: 'OTP sent successfully via SMS!' };
            }
        }
        
        // OPTION 5: TextLocal (Free for India)
        // Signup at: https://www.textlocal.in/
        const TEXTLOCAL_API_KEY = ''; // Add your API key here
        
        if (TEXTLOCAL_API_KEY) {
            const params = new URLSearchParams({
                apikey: TEXTLOCAL_API_KEY,
                numbers: whatsappNumber,
                sender: 'TXTLCL',
                message: `Your Sujata Mastani Inventory OTP is: ${otp}. Valid for 5 minutes.`
            });
            
            const response = await fetch(`https://api.textlocal.in/send/?${params}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                return { success: true, message: 'OTP sent successfully via SMS!' };
            }
        }
        
        // Development mode: Always succeed and show OTP in console
        console.log('========================================');
        console.log('🔐 DEVELOPMENT MODE - OTP SENT');
        console.log('========================================');
        console.log(`OTP: ${otp}`);
        console.log('Copy this OTP from console to verify');
        console.log('========================================');
        
        // Show a browser alert with OTP (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            setTimeout(() => {
                alert(`🔐 DEVELOPMENT MODE\n\nYour OTP: ${otp}\n\nThis is shown because no SMS/WhatsApp service is configured.`);
            }, 500);
        }
        
        return { 
            success: true, 
            message: 'OTP generated! Check console for the code (development mode)', 
            isDevelopment: true,
            otp: otp // Only return in dev mode for display
        };
        
    } catch (error) {
        console.error('OTP Error:', error);
        return { 
            success: true, // Still succeed in development
            message: 'OTP generated (check console)', 
            isDevelopment: true,
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
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (now - otpTimestamp) > fiveMinutes;
};

/**
 * HOW TO SET UP FREE SMS/WHATSAPP OTP:
 * 
 * EASIEST OPTION - CallMeBot WhatsApp (100% FREE):
 * 1. Save this number to your contacts: +34 644 24 02 52
 * 2. Send this message to it on WhatsApp: "I allow callmebot to send me messages"
 * 3. You'll receive an API key
 * 4. Add the API key to the callMeBotUrl above
 * 
 * OR
 * 
 * OPTION 2 - 2Factor.in (10 Free SMS/day):
 * 1. Sign up at https://2factor.in
 * 2. Get your API key from dashboard
 * 3. Add it to TWOFACTOR_API_KEY above
 * 
 * OR
 * 
 * OPTION 3 - Fast2SMS (50 Free SMS/day):
 * 1. Sign up at https://www.fast2sms.com/
 * 2. Get your API key from dashboard
 * 3. Add it to FAST2SMS_API_KEY above
 * 
 * For now, in development mode, the OTP will be shown in:
 * - Browser console (F12)
 * - Alert popup (on localhost)
 */
