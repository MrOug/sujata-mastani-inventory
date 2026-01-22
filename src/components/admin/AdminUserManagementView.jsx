import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Loader, Edit2, Download, X } from 'lucide-react';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Modal from '../Modal';

const AdminUserManagementView = ({ db, appId, stores, auth, exportStockData, showToast, showConfirm }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Create user form states
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('staff');
    const [newStoreId, setNewStoreId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Fetch users - extracted to reusable function
    const fetchUsers = useCallback(async () => {
        if (!db) return;

        setLoading(true);
        try {
            const usersData = [];

            // Get all user configs
            const usersColRef = collection(db, `artifacts/${appId}/users`);
            const usersSnapshot = await getDocs(usersColRef);

            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const profileDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
                const profileSnapshot = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/user_config`));

                profileSnapshot.forEach(profileDoc => {
                    if (profileDoc.id === 'profile') {
                        const data = profileDoc.data();
                        usersData.push({
                            id: userId,
                            ...data,
                            storeName: data.storeId ? (stores[data.storeId]?.name || data.storeId) : 'Not Assigned'
                        });
                    }
                });
            }

            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [db, appId, stores, showToast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = async () => {
        if (!newUsername.trim() || !newPassword || newPassword.length < 6) {
            showToast('Please fill all fields. Password must be at least 6 characters.', 'error');
            return;
        }

        if (newRole === 'staff' && !newStoreId) {
            showToast('Please select a store for staff users', 'error');
            return;
        }

        setIsCreating(true);
        try {
            // Create Firebase Auth user
            const fakeEmail = `${newUsername.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')}@sujatainventory.local`;
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, newPassword);

            // Create user profile in Firestore
            const roleDocRef = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}/user_config`, 'profile');
            await setDoc(roleDocRef, {
                username: newUsername.trim(),
                role: newRole,
                storeId: newRole === 'staff' ? newStoreId : null,
                createdAt: new Date().toISOString()
            });

            showToast(`User "${newUsername}" created successfully!`, 'success');
            setShowCreateModal(false);
            setNewUsername('');
            setNewPassword('');
            setNewRole('staff');
            setNewStoreId('');

            // Refresh users list
            await fetchUsers();
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

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        setIsSaving(true);
        try {
            const roleDocRef = doc(db, `artifacts/${appId}/users/${editingUser.id}/user_config`, 'profile');
            await setDoc(roleDocRef, {
                ...editingUser,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            showToast('User updated successfully!', 'success');
            setEditingUser(null);
            await fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            showToast(`Failed to update user: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (userId, username) => {
        const confirmed = await showConfirm({
            title: 'Delete User',
            message: `Are you sure you want to delete "${username}"? Note: The user will also need to be deleted from Firebase Console.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });

        if (!confirmed) return;

        setDeletingId(userId);
        try {
            // Delete user profile from Firestore
            const profileDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
            await deleteDoc(profileDocRef);

            showToast(`User "${username}" profile deleted. Remember to also delete from Firebase Console.`, 'success');
            await fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast(`Failed to delete user: ${error.message}`, 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <Users className="w-7 h-7 mr-3 text-orange-600" /> User Management
            </h2>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex-1 py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5 mr-2" /> Create User
                </button>

                {exportStockData && (
                    <button
                        onClick={exportStockData}
                        className="py-3.5 px-5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center"
                        title="Export Data"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Users List */}
            {loading ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-12">
                    <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                    <span className="text-gray-600 font-medium">Loading users...</span>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-bold text-lg">No users found</p>
                    <p className="text-sm text-gray-500 mt-2">Create a new user to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {users.map((user) => (
                        <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <p className="font-bold text-lg text-gray-900">{user.username}</p>
                                        <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-md border ${user.role === 'admin'
                                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                                            : 'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                                        <span className="w-4 h-4 mr-1.5 opacity-50">🏪</span> {user.storeName}
                                    </p>
                                </div>
                                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingUser(user)}
                                        className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        aria-label={`Edit ${user.username}`}
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                        disabled={deletingId === user.id}
                                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                        aria-label={`Delete ${user.username}`}
                                    >
                                        {deletingId === user.id ? (
                                            <Loader className="animate-spin w-5 h-5 text-red-600" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <Modal title="Create New User" onClose={() => setShowCreateModal(false)}>
                    <div className="space-y-5 p-1">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Username *</label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                                placeholder="Enter username"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password *</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                                placeholder="Min 6 characters"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Role *</label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                            >
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {newRole === 'staff' && (
                            <div className="animate-fadeIn">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Assign Store *</label>
                                <select
                                    value={newStoreId}
                                    onChange={(e) => setNewStoreId(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                                >
                                    <option value="">Select Store</option>
                                    {Object.entries(stores).map(([id, store]) => (
                                        <option key={id} value={id}>{store.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={handleCreateUser}
                            disabled={isCreating}
                            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all mt-4 flex items-center justify-center disabled:opacity-50"
                        >
                            {isCreating ? (
                                <Loader className="animate-spin w-5 h-5 mr-2" />
                            ) : (
                                <Plus className="w-5 h-5 mr-2" />
                            )}
                            Create User
                        </button>
                    </div>
                </Modal>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <Modal title="Edit User" onClose={() => setEditingUser(null)}>
                    <div className="space-y-5 p-1">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Username</label>
                            <input
                                type="text"
                                value={editingUser.username || ''}
                                disabled
                                className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Role</label>
                            <select
                                value={editingUser.role || 'staff'}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                            >
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Assign Store</label>
                            <select
                                value={editingUser.storeId || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, storeId: e.target.value })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                            >
                                <option value="">Not Assigned</option>
                                {Object.entries(stores).map(([id, store]) => (
                                    <option key={id} value={id}>{store.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition-all mt-4 flex items-center justify-center disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader className="animate-spin w-5 h-5 mr-2" />
                            ) : null}
                            Save Changes
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminUserManagementView;
