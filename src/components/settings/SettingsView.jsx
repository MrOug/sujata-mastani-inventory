import React, { useState } from 'react';
import { LogOut, User, Store, Users, Info, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useOrders } from '../../context/OrdersContext';
import StoreListView from './StoreListView';
import UserManagementView from './UserManagementView';
import AboutView from './AboutView';

const SettingsView = () => {
    const { user, role, logout } = useAuth();
    const { showConfirm, showToast } = useToast();
    const { outletCount } = useOrders();
    const [subView, setSubView] = useState(null);

    const username = user?.email?.split('@')[0] || 'User';

    const handleLogout = async () => {
        const confirmed = await showConfirm({
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            confirmText: 'Logout',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });

        if (confirmed) {
            try {
                await logout();
            } catch (err) {
                showToast('Failed to logout', 'error');
            }
        }
    };

    // Render sub-views
    if (subView === 'stores') {
        return <StoreListView onBack={() => setSubView(null)} />;
    }

    if (subView === 'users') {
        return <UserManagementView onBack={() => setSubView(null)} />;
    }

    if (subView === 'about') {
        return <AboutView onBack={() => setSubView(null)} />;
    }

    return (
        <div className="space-y-4">
            {/* User Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{username}</h3>
                        <p className="text-sm text-gray-500 capitalize">{role?.replace('_', ' ') || 'Factory Admin'}</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
                <p className="text-sm opacity-90 mb-1">Connected Outlets</p>
                <p className="text-4xl font-bold">{outletCount}</p>
            </div>

            {/* Menu Items */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                <button
                    onClick={() => setSubView('stores')}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition"
                >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Store className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">Manage Stores</p>
                        <p className="text-sm text-gray-500">View and manage franchise outlets</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button
                    onClick={() => setSubView('users')}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition"
                >
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">User Management</p>
                        <p className="text-sm text-gray-500">Manage factory users</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button
                    onClick={() => setSubView('about')}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition"
                >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Info className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">About</p>
                        <p className="text-sm text-gray-500">App version and info</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="w-full p-4 bg-white rounded-2xl border border-gray-100 flex items-center gap-4 text-left hover:bg-red-50 transition"
            >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                    <p className="font-medium text-red-600">Logout</p>
                    <p className="text-sm text-gray-500">Sign out of your account</p>
                </div>
            </button>
        </div>
    );
};

export default SettingsView;
