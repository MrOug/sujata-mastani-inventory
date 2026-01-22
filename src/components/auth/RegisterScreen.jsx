import React, { useState } from 'react';
import { UserPlus, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RegisterScreen = ({ onSwitchToLogin }) => {
    const { register, completeFirstAdminSetup } = useAuth();

    const [step, setStep] = useState(1); // 1: Details, 2: OTP
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOTP, setGeneratedOTP] = useState('');
    const [otpTimestamp, setOtpTimestamp] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [devModeOTP, setDevModeOTP] = useState('');

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            // Import OTP utilities
            const { generateOTP, sendOTP } = await import('../../utils/otp-utils');

            const newOTP = generateOTP();
            setGeneratedOTP(newOTP);
            setOtpTimestamp(Date.now());

            const result = await sendOTP('+919922422233', newOTP);

            if (result.success) {
                setStep(2);
                setError('');
                if (result.isDevelopment) {
                    setDevModeOTP(newOTP);
                }
            } else {
                setError('Failed to send OTP. Please try again.');
            }
        } catch (err) {
            console.error('OTP Error:', err);
            setError('Error sending OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { verifyOTP, isOTPExpired } = await import('../../utils/otp-utils');

            if (isOTPExpired(otpTimestamp)) {
                setError('OTP has expired. Please request a new one.');
                setStep(1);
                setIsLoading(false);
                return;
            }

            if (!verifyOTP(otp, generatedOTP)) {
                setError('Invalid OTP. Please try again.');
                setIsLoading(false);
                return;
            }

            // OTP verified - create admin account
            const user = await register(username, password);
            await completeFirstAdminSetup(user, username.trim());
        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.message.includes('email-already-in-use')
                ? 'Username already exists'
                : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-orange-100">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <UserPlus className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-orange-600">Register Admin</h1>
                        <p className="text-gray-600 mt-2">Step {step} of 2</p>
                    </div>

                    {step === 1 ? (
                        <form onSubmit={handleRequestOTP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                    placeholder="Choose a username"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                    placeholder="Min 6 characters"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                    placeholder="Re-enter password"
                                />
                            </div>

                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <p className="text-sm text-orange-800">
                                    📱 OTP will be sent via WhatsApp to: <strong>+91 99224 22233</strong>
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : 'Send OTP via WhatsApp'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-gray-700 mb-2">OTP sent via WhatsApp to:</p>
                                <p className="text-lg font-bold text-orange-600">+91 99224 22233</p>
                                <p className="text-sm text-gray-500 mt-2">Valid for 5 minutes</p>

                                {devModeOTP ? (
                                    <div className="mt-3 p-4 bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-400 rounded-lg">
                                        <p className="text-xs text-orange-800 font-semibold mb-2">🔓 DEVELOPMENT MODE</p>
                                        <p className="text-2xl font-bold text-orange-600 tracking-widest">{devModeOTP}</p>
                                        <p className="text-xs text-orange-700 mt-2">Copy this OTP above ⬆️</p>
                                    </div>
                                ) : (
                                    <div className="mt-3 p-2 bg-orange-50 rounded-lg">
                                        <p className="text-xs text-orange-700">💡 Check your WhatsApp messages</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    maxLength="6"
                                    className="w-full p-4 text-center text-2xl font-bold border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition tracking-widest"
                                    placeholder="000000"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || otp.length !== 6}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : 'Verify & Register'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(''); setOtp(''); }}
                                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
                            >
                                ← Back to registration
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <button
                            onClick={onSwitchToLogin}
                            className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                            Already have an account? Log In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterScreen;
