import React from 'react';
import { Plus, Loader } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';

const CategoryCard = ({ label, value, color }) => {
    const colorClasses = {
        orange: 'bg-orange-500',
        brown: 'bg-amber-700',
        green: 'bg-green-600',
        blue: 'bg-blue-500',
    };

    return (
        <div className={`${colorClasses[color]} rounded-2xl p-5 text-white`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{label}</p>
            <p className="text-5xl font-bold font-display mt-2">{value}</p>
            <p className="text-sm opacity-80 mt-1">total units</p>
        </div>
    );
};

const DashboardView = ({ onExport, isExporting }) => {
    const { categorySummary, selectedDate, outletCount, orders, loading } = useOrders();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Date and Outlets Row */}
            <div className="flex items-center justify-between text-gray-500 px-1">
                <span className="font-medium">{selectedDate}</span>
                <span className="font-medium">{outletCount} outlets</span>
            </div>

            {orders.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <p className="text-gray-500 font-medium">No orders for this date</p>
                </div>
            ) : (
                <>
                    {/* Category Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <CategoryCard
                            label="MILKSHAKE"
                            value={categorySummary['MILKSHAKE']}
                            color="orange"
                        />
                        <CategoryCard
                            label="ICE CREAM"
                            value={categorySummary['ICE CREAM']}
                            color="brown"
                        />
                        <CategoryCard
                            label="TOPPINGS"
                            value={categorySummary['TOPPINGS']}
                            color="green"
                        />
                        <CategoryCard
                            label="PACKAGING MATERIAL"
                            value={categorySummary['ICE CREAM DABBE']}
                            color="blue"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                        <h3 className="text-gray-500 font-medium mb-4">Quick Actions</h3>
                        <button
                            onClick={onExport}
                            disabled={isExporting}
                            className="w-full py-4 bg-orange-100 text-orange-600 font-bold rounded-xl transition hover:bg-orange-200 disabled:opacity-50 uppercase tracking-wide"
                        >
                            {isExporting ? (
                                <Loader className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                'EXPORT REPORT'
                            )}
                        </button>
                    </div>
                </>
            )}

            {/* FAB */}
            <button className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-orange-600 transition">
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
};

export default DashboardView;
