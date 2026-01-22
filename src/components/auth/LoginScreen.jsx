import React, { useState } from 'react';
import { User, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginScreen = ({ onSwitchToRegister }) => {
    const { login, fetchUserProfile } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setIsLoading(false);
            return;
        }

        try {
            const user = await login(username, password);
            await fetchUserProfile(user, username.trim());
        } catch (err) {
            console.error("Login Error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Account not found or wrong password. Click "Sign Up" below to register.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else {
                setError(`Login failed: ${err.message}`);
            }
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
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-orange-600">Login</h1>
                        <p className="text-gray-600 mt-2">Welcome back to Sujata Mastani!</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                placeholder="Enter your username"
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
                                placeholder="Enter your password"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center"
                        >
                            {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : 'Log In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={onSwitchToRegister}
                            className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                            Need to register? Sign Up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
