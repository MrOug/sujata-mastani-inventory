import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';

const SummaryView = () => {
    const { aggregatedTotals, selectedDate, outletCount, orders, loading, masterStockList } = useOrders();
    const [activeTab, setActiveTab] = useState('MILKSHAKE');

    const tabs = [
        { id: 'MILKSHAKE', label: 'MILKSHAKE' },
        { id: 'ICE CREAM', label: 'ICE CREAM' },
        { id: 'TOPPINGS', label: 'TOPPINGS' },
        { id: 'ICE CREAM DABBE', label: 'PACKAGING MATERIAL' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
        );
    }

    const categoryData = aggregatedTotals[activeTab] || { items: {}, total: 0 };
    const itemsList = masterStockList[activeTab] || [];

    return (
        <div className="space-y-0">
            {/* Tabs - Scrollable */}
            <div className="flex overflow-x-auto border-b border-gray-200 -mx-4 px-4 bg-white">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 font-bold text-sm whitespace-nowrap border-b-2 transition ${
                            activeTab === tab.id
                                ? 'text-orange-500 border-orange-500'
                                : 'text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Date & Outlets info */}
            <div className="flex items-center justify-between text-sm text-gray-500 py-3 border-b border-gray-100">
                <span>{selectedDate}</span>
                <span>{outletCount} outlets</span>
            </div>

            {orders.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center mt-4">
                    <p className="text-gray-500 font-medium">No orders for this date</p>
                </div>
            ) : (
                <div className="bg-white">
                    {/* Items list */}
                    <div className="divide-y divide-gray-100">
                        {itemsList.map(item => {
                            const qty = categoryData.items[item] || 0;
                            const hasOrder = qty > 0;
                            const displayName = activeTab === 'MILKSHAKE' ? `${item} fm` : item;

                            return (
                                <div
                                    key={item}
                                    className={`flex items-center justify-between py-4 ${
                                        !hasOrder ? 'bg-gray-50' : ''
                                    }`}
                                >
                                    <span className={`font-medium ${hasOrder ? 'text-gray-700' : 'text-gray-400'}`}>
                                        {displayName}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        {!hasOrder && (
                                            <span className="text-xs font-semibold text-red-500 border border-red-200 bg-red-50 px-2 py-1 rounded">
                                                No Order
                                            </span>
                                        )}
                                        <span className={`font-bold text-lg min-w-[40px] text-right ${hasOrder ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {hasOrder ? qty : '—'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grand Total */}
                    <div className="bg-orange-50 py-4 flex items-center justify-between border-t-2 border-orange-200 mt-2">
                        <span className="font-bold text-gray-800">GRAND TOTAL</span>
                        <span className="text-2xl font-bold text-gray-900">{categoryData.total}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SummaryView;
