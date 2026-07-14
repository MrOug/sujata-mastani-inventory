import React from 'react';
import { ArrowLeft, Factory, Database, Globe, Shield, Clock, Smartphone } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';
import { useAuth } from '../../context/AuthContext';

const AboutView = ({ onBack }) => {
    const { outletCount, orders } = useOrders();
    const { user, role } = useAuth();

    const appInfo = [
        { icon: Factory, label: 'App Name', value: 'Sujata Factory' },
        { icon: Globe, label: 'Version', value: '1.0.0' },
        { icon: Database, label: 'Firebase Project', value: 'sujata-inventory' },
        { icon: Shield, label: 'Your Role', value: role?.replace('_', ' ') || 'Factory User' },
        { icon: Smartphone, label: 'Platform', value: 'Web App (PWA Ready)' },
    ];

    const stats = [
        { label: 'Connected Outlets', value: outletCount },
        { label: "Today's Orders", value: orders.length },
    ];

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button onClick={onBack} className="p-1 -ml-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">About</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                {/* Logo Section */}
                <div className="bg-white rounded-2xl p-8 text-center mb-4">
                    <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Factory className="w-10 h-10 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Sujata Factory</h2>
                    <p className="text-gray-500 mt-1">Dispatch Management System</p>
                    <p className="text-sm text-orange-600 mt-2 font-medium">Version 1.0.0</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-4 text-center border border-gray-100">
                            <p className="text-3xl font-bold text-orange-600">{stat.value}</p>
                            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* App Info */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-bold text-gray-700">App Information</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {appInfo.map((item, idx) => (
                            <div key={idx} className="px-4 py-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                    <item.icon className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500">{item.label}</p>
                                    <p className="font-medium text-gray-900 capitalize">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How it Works */}
                <div className="bg-blue-50 rounded-2xl p-5 mt-4 border border-blue-100">
                    <h3 className="font-bold text-blue-900 mb-3">How it Works</h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                            <span>Franchise outlets place orders through their inventory app</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                            <span>Orders automatically appear in this factory app</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                            <span>View aggregated totals in Dashboard and Summary</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                            <span>Manage individual dispatches and generate reports</span>
                        </li>
                    </ul>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-400 mt-6 pb-4">
                    <p>Built for Sujata Mastani</p>
                    <p className="mt-1">© 2026 All rights reserved</p>
                </div>
            </div>
        </div>
    );
};

export default AboutView;
