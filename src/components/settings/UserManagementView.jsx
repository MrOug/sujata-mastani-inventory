import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Plus, Trash2, Shield, User, Loader, X, Eye, EyeOff } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, appId, auth } from '../../services/firebase';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const UserManagementView = ({ onBack }) => {
    const { showToast, showConfirm } = useToast();
    const { userId: currentUserId } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'factory_staff'
    });

    // Fetch factory users
    useEffect(() => {
        const usersRef = collection(db, `artifacts/${appId}/factory_users`);

        const unsubscribe = onSnapshot(usersRef, async (snapshot) => {
            const usersList = [];

            for (const docSnap of snapshot.docs) {
                const userId = docSnap.id;
                try {
                    const profileRef = doc(db, `artifacts/${appId}/factory_users/${userId}/user_config`, 'profile');
                    const profileUnsubscribe = onSnapshot(profileRef, (profileSnap) => {
                        if (profileSnap.exists()) {
                            const profileData = profileSnap.data();
                            setUsers(prev => {
                                const filtered = prev.filter(u => u.id !== userId);
                                return [...filtered, { id: userId, ...profileData }].sort((a, b) =>
                                    (a.username || '').localeCompare(b.username || '')
                                );
                            });
                        }
                    });
                } catch (err) {
                    console.error('Error fetching user profile:', err);
                }
            }

            setLoading(false);
        }, (error) => {
            console.error('Error fetching users:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setFormData({ username: '', password: '', role: 'factory_staff' });
    };

    const handleCreateUser = async () => {
        if (!formData.username.trim()) {
            showToast('Username is required', 'error');
            return;
        }
        if (!formData.password || formData.password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        setIsCreating(true);
        try {
            const sanitizedUsername = formData.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
            const fakeEmail = `${sanitizedUsername}@sujatafactory.local`;

            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, formData.password);
            const newUserId = userCredential.user.uid;

            // Create user profile in Firestore
            const profileRef = doc(db, `artifacts/${appId}/factory_users/${newUserId}/user_config`, 'profile');
            await setDoc(profileRef, {
                username: sanitizedUsername,
                role: formData.role,
                createdAt: new Date().toISOString()
            });

            showToast(`User "${sanitizedUsername}" created successfully`, 'success');
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('Username already exists', 'error');
            } else {
                showToast(`Failed to create user: ${error.message}`, 'error');
            }
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (userId === currentUserId) {
            showToast('You cannot delete your own account', 'error');
            return;
        }

        const confirmed = await showConfirm({
            title: 'Delete User',
            message: `Are you sure you want to delete "${username}"? This cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });

        if (confirmed) {
            try {
                // Delete user profile from Firestore
                const profileRef = doc(db, `artifacts/${appId}/factory_users/${userId}/user_config`, 'profile');
                await deleteDoc(profileRef);

                showToast('User deleted from database', 'success');
                setUsers(prev => prev.filter(u => u.id !== userId));
            } catch (error) {
                console.error('Error deleting user:', error);
                showToast('Failed to delete user', 'error');
            }
        }
    };

    const handleChangeRole = async (userId, username, newRole) => {
        if (userId === currentUserId) {
            showToast('You cannot change your own role', 'error');
            return;
        }

        try {
            const profileRef = doc(db, `artifacts/${appId}/factory_users/${userId}/user_config`, 'profile');
            await setDoc(profileRef, { role: newRole }, { merge: true });

            showToast(`${username} is now a ${newRole.replace('_', ' ')}`, 'success');
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Error changing role:', error);
            showToast('Failed to change role', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button onClick={onBack} className="p-1 -ml-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold flex-1">User Management</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader className="w-8 h-8 text-orange-600 animate-spin" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No users found</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium"
                        >
                            Add First User
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-4">{users.length} factory users</p>

                        {users.map(user => (
                            <div key={user.id} className="bg-white rounded-xl border border-gray-100 p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        user.role === 'factory_admin' ? 'bg-purple-100' : 'bg-blue-100'
                                    }`}>
                                        {user.role === 'factory_admin' ? (
                                            <Shield className="w-5 h-5 text-purple-600" />
                                        ) : (
                                            <User className="w-5 h-5 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{user.username}</p>
                                        <p className="text-sm text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
                                    </div>
                                    {user.id === currentUserId ? (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">You</span>
                                    ) : (
                                        <>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleChangeRole(user.id, user.username, e.target.value)}
                                                className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
                                            >
                                                <option value="factory_admin">Admin</option>
                                                <option value="factory_staff">Staff</option>
                                            </select>
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md animate-slideUp">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Add Factory User</h3>
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="e.g., factory_manager"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
                                >
                                    <option value="factory_staff">Factory Staff</option>
                                    <option value="factory_admin">Factory Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUser}
                                disabled={isCreating}
                                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Create User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementView;
