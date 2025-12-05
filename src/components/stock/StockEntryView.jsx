import React from 'react';
import { List, Loader, Save } from 'lucide-react';
import StockInput from '../StockInput';

const StockEntryView = ({
    storeId,
    stockData,
    setStockData,
    saveStock,
    isSaving,
    selectedDate,
    setSelectedDate,
    showToast,
    masterStockList,
    miscStatus,
    setMiscStatus,
    CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC']
}) => {
    const getTodayDate = () => new Date().toISOString().slice(0, 10);
    const today = getTodayDate();

    const totalItems = Object.values(stockData || {}).filter(v => v > 0).length;
    const totalQuantity = Object.values(stockData || {}).reduce((sum, v) => sum + (v || 0), 0);

    const handleQuantityChange = (category, item, value) => {
        const key = `${category}-${item}`;
        setStockData(prev => ({ ...prev, [key]: value }));
    };

    const handleMiscStatusChange = (item, status) => {
        const key = `MISC-${item}`;
        setMiscStatus(prev => ({ ...prev, [key]: status }));
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <List className="w-6 h-6 mr-3 text-orange-600" /> Stock Entry
            </h2>
            <p className="text-sm text-gray-500">Entering stock for: <span className="font-semibold text-orange-600">{storeId}</span></p>

            {/* Date Selector */}
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Entry Date</label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                        if (e.target.value > today) {
                            showToast('Cannot select future dates', 'error');
                            return;
                        }
                        setSelectedDate(e.target.value);
                    }}
                    max={today}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600"
                />
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm opacity-90">Total Items</p>
                        <p className="text-3xl font-bold">{totalItems}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm opacity-90">Total Quantity</p>
                        <p className="text-3xl font-bold">{totalQuantity}</p>
                    </div>
                </div>
            </div>

            {/* Stock Entry Forms */}
            <div className="space-y-4">
                {CATEGORY_ORDER.map(category => {
                    const itemsInCategory = masterStockList[category] || [];
                    if (itemsInCategory.length === 0 || category === 'MISC') return null;

                    return (
                        <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">{category}</h3>
                            <div className="space-y-2">
                                {itemsInCategory.map(item => {
                                    const key = `${category}-${item}`;
                                    return (
                                        <StockInput
                                            key={key}
                                            label={item}
                                            value={stockData[key] || 0}
                                            onChange={(val) => handleQuantityChange(category, item, val)}
                                            category={category}
                                            item={item}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* MISC Section - Special Toggle UI */}
                {masterStockList.MISC && masterStockList.MISC.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">MISC</h3>
                        <p className="text-xs text-gray-500 mb-3">Toggle stock status for each item</p>
                        <div className="space-y-3">
                            {masterStockList.MISC.map(item => {
                                const key = `MISC-${item}`;
                                const status = miscStatus[key] || 'available';

                                return (
                                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <span className="text-gray-900 font-medium">{item}</span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleMiscStatusChange(item, 'available')}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${status === 'available'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                    }`}
                                            >
                                                Available
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMiscStatusChange(item, 'low')}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${status === 'low'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                    }`}
                                            >
                                                Low Stock
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Save Button */}
            <button
                onClick={saveStock}
                disabled={isSaving}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition duration-200 flex items-center justify-center disabled:opacity-50 text-xl"
            >
                {isSaving ? (
                    <Loader className="animate-spin w-6 h-6 mr-2" />
                ) : (
                    <>
                        <Save className="w-6 h-6 mr-2" /> Save Stock Entry
                    </>
                )}
            </button>
        </div>
    );
};

export default StockEntryView;
