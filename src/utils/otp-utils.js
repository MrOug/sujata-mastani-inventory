// OTP utility functions for admin registration

const ADMIN_PHONE = '+919922422233'; // Admin phone number for OTP

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via SMS
 * Using Free SMS services - Add your API key below
 * 
 * Free SMS Services for India:
 * 1. Fast2SMS - https://www.fast2sms.com/ (Free 50 SMS/day)
 * 2. TextLocal - https://www.textlocal.in/ (Free credits on signup)
 * 3. MSG91 - https://msg91.com/ (Free trial)
 * 4. Twilio - https://www.twilio.com/ (Free trial $15)
 */
export const sendOTP = async (phoneNumber, otp) => {
    try {
        // For development: Log OTP to console
        console.log('=================================');
        console.log('📱 OTP for Registration:');
        console.log(`Phone: ${phoneNumber}`);
        console.log(`OTP: ${otp}`);
        console.log('=================================');
        
        // OPTION 1: Fast2SMS (Recommended for India - Free 50 SMS/day)
        // Signup at: https://www.fast2sms.com/
        // Get API key from dashboard
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
                    numbers: phoneNumber.replace('+91', '') // Remove +91 prefix
                })
            });
            
            const data = await response.json();
            if (data.return) {
                return { success: true, message: 'OTP sent successfully!' };
            }
        }
        
        // OPTION 2: TextLocal
        // Signup at: https://www.textlocal.in/
        const TEXTLOCAL_API_KEY = ''; // Add your API key here
        
        if (TEXTLOCAL_API_KEY) {
            const params = new URLSearchParams({
                apikey: TEXTLOCAL_API_KEY,
                numbers: phoneNumber.replace('+91', ''),
                sender: 'TXTLCL',
                message: `Your Sujata Mastani Inventory OTP is: ${otp}. Valid for 5 minutes.`
            });
            
            const response = await fetch(`https://api.textlocal.in/send/?${params}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                return { success: true, message: 'OTP sent successfully!' };
            }
        }
        
        // OPTION 3: MSG91
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
                    mobile: phoneNumber.replace('+91', ''),
                    otp: otp
                })
            });
            
            const data = await response.json();
            if (data.type === 'success') {
                return { success: true, message: 'OTP sent successfully!' };
            }
        }
        
        // Development mode: Always succeed (OTP shown in console)
        return { 
            success: true, 
            message: 'OTP sent! (Check console in development mode)',
            isDevelopment: true 
        };
        
    } catch (error) {
        console.error('SMS Error:', error);
        return { 
            success: true, // Still succeed in development
            message: 'OTP generated (development mode)', 
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

