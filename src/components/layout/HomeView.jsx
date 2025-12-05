import React from 'react';
import { Store, List, TrendingDown, ShoppingCart, ArrowRight } from 'lucide-react';

const HomeView = ({ selectedStoreId, stores, setView, soldStockSummary }) => {
    const storeName = selectedStoreId ? stores[selectedStoreId]?.name : null;

    if (!selectedStoreId) {
        return (
            <div className="p-4 space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center">
                    <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-700 mb-2">Welcome!</h2>
                    <p className="text-gray-500">Please select a store from the top menu to get started.</p>
                </div>
            </div>
        );
    }

    const quickActions = [
        {
            id: 'stock',
            icon: List,
            title: 'Enter Stock',
            description: 'Record current stock levels',
            color: 'from-blue-500 to-blue-600'
        },
        {
            id: 'sold',
            icon: TrendingDown,
            title: 'View Sold',
            description: `${soldStockSummary} units sold today`,
            color: 'from-green-500 to-green-600'
        },
        {
            id: 'order',
            icon: ShoppingCart,
            title: 'Generate Order',
            description: 'Create order for tomorrow',
            color: 'from-orange-500 to-orange-600'
        },
    ];

    return (
        <div className="p-4 space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white">
                <h2 className="text-2xl font-bold font-display mb-1">Welcome Back!</h2>
                <p className="opacity-90">Managing: <span className="font-semibold">{storeName}</span></p>
                <p className="text-sm opacity-75 mt-2">
                    {new Date().toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </div>

            {/* Sales Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Today's Summary</h3>
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-orange-50 p-4 rounded-xl text-center">
                        <p className="text-4xl font-bold font-display text-orange-600">{soldStockSummary}</p>
                        <p className="text-sm text-gray-600 mt-1">Units Sold</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-800 px-1">Quick Actions</h3>
                {quickActions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => setView(action.id)}
                        className={`w-full bg-gradient-to-r ${action.color} p-4 rounded-xl shadow-lg text-white flex items-center justify-between transition-transform hover:scale-[1.02] active:scale-[0.98]`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <action.icon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-lg">{action.title}</p>
                                <p className="text-sm opacity-90">{action.description}</p>
                            </div>
                        </div>
                        <ArrowRight className="w-6 h-6" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default HomeView;
