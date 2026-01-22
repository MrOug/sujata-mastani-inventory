import React from 'react';
import { TrendingDown } from 'lucide-react';

const getTodayDate = () => new Date().toISOString().slice(0, 10);

/**
 * Stock Sold Report View
 * NOW USES: Yesterday's ORDERED stock - Today's CURRENT stock = SOLD
 */
const StockSoldView = ({
    currentStock,
    yesterdayOrderedStock,  // Changed from yesterdayStock
    calculateSold,
    soldStockSummary,
    masterStockList,
    CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC']
}) => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <TrendingDown className="w-7 h-7 mr-3 text-orange-600" /> Stock Sold Report
            </h2>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                <div className="relative z-10">
                    <p className="text-sm font-medium opacity-90 tracking-wide uppercase">Total Units Sold Today</p>
                    <p className="text-6xl font-extrabold font-display mt-2 tracking-tight">{soldStockSummary}</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm border border-white/10 text-xs">
                        <span>📅</span> As of {getTodayDate()}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-700 flex items-start gap-3">
                <div className="mt-0.5 min-w-[1.25rem]">ℹ️</div>
                <p>
                    <strong>How this works:</strong> We calculate sold items by subtracting today's current stock from yesterday's orders.
                    <span className="block mt-1 opacity-75 text-xs">(Yesterday's Ordered - Today's Current = Sold)</span>
                </p>
            </div>

            <div className="space-y-4">
                {CATEGORY_ORDER.map(category => {
                    const itemsInCategory = masterStockList[category] || [];
                    if (itemsInCategory.length === 0) return null;

                    return (
                        <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-lg font-bold text-red-600 border-b border-red-200 pb-2 mb-3">{category}</h3>
                            <div className="space-y-2">
                                {itemsInCategory.map(item => {
                                    const key = `${category}-${item}`;
                                    const sold = calculateSold(category, item);
                                    const current = currentStock[key] || 0;
                                    const ordered = yesterdayOrderedStock[key] || 0;

                                    // Styling based on sale status
                                    const isLoss = sold < 0;
                                    const cardClass = isLoss ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';
                                    const soldColor = isLoss ? 'text-red-700' : 'text-orange-600';

                                    return (
                                        <div
                                            key={key}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${cardClass}`}
                                        >
                                            <div className="flex-1">
                                                <p className="text-base font-semibold text-gray-900">{item}</p>
                                                <p className="text-xs text-gray-500">Ord: {ordered} | Cur: {current}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className={`text-2xl font-bold font-display ${soldColor}`}>{sold}</p>
                                                <p className="text-xs text-gray-500">{isLoss ? 'LOSS/ERROR' : 'SOLD'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StockSoldView;
