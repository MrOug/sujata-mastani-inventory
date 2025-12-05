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
        <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                <h2 className="text-3xl font-bold font-display mb-1 relative z-10">Welcome Back!</h2>
                <p className="opacity-90 relative z-10 text-lg">Managing: <span className="font-semibold">{storeName}</span></p>
                <div className="mt-4 flex items-center gap-2 text-sm bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                    <span className="opacity-75">📅</span>
                    <span className="font-medium">
                        {new Date().toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                        })}
                    </span>
                </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Today's Summary</h3>
                    <div className="bg-orange-100 p-2 rounded-lg">
                        <TrendingDown className="w-5 h-5 text-orange-600" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex-1 bg-orange-50 p-6 rounded-2xl text-center border border-orange-100">
                        <p className="text-5xl font-bold font-display text-orange-600 tracking-tight">{soldStockSummary}</p>
                        <p className="text-sm text-gray-600 mt-2 font-medium bg-white/50 inline-block px-3 py-1 rounded-full">Units Sold Today</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 px-1 flex items-center gap-2">
                    <span>⚡</span> Quick Actions
                </h3>
                {quickActions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => setView(action.id)}
                        className={`w-full bg-gradient-to-r ${action.color} p-4 rounded-2xl shadow-lg text-white flex items-center justify-between transition-all hover:scale-[1.02] active:scale-[0.98] group`}
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:bg-white/25 transition">
                                <action.icon className="w-7 h-7" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-xl leading-tight">{action.title}</p>
                                <p className="text-sm opacity-90 mt-0.5 font-medium">{action.description}</p>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm group-hover:translate-x-1 transition">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default HomeView;
