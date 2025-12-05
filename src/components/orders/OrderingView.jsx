import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader, Copy, Check, Sun, Cloud, AlertTriangle } from 'lucide-react';
import { doc, setDoc, collection } from 'firebase/firestore';
import StockInput from '../StockInput';

const OrderingView = ({
    currentStock,
    orderQuantities,
    setOrderQuantities,
    generateOrderOutput,
    showToast,
    masterStockList,
    db,
    appId,
    selectedStoreId,
    stores,
    miscStatus,
    selectedMiscItems,
    setSelectedMiscItems,
    CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC']
}) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [nextDayInfo, setNextDayInfo] = useState(null);
    const [weatherInfo, setWeatherInfo] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(true);

    // Load next day info and weather
    useEffect(() => {
        const loadInfo = async () => {
            setLoadingInfo(true);
            try {
                // Load calendar info
                const { getNextDayInfo } = await import('../../utils/calendar-utils');
                const dayInfo = getNextDayInfo();
                setNextDayInfo(dayInfo);

                // Load weather info
                const { getWeatherForecast, getWeatherEmoji, getBusinessRecommendation } = await import('../../utils/weather-utils');
                const weather = await getWeatherForecast();
                if (weather) {
                    setWeatherInfo({
                        ...weather,
                        emoji: getWeatherEmoji(weather.condition),
                        recommendation: getBusinessRecommendation(weather)
                    });
                }
            } catch (error) {
                console.error('Error loading info:', error);
            } finally {
                setLoadingInfo(false);
            }
        };

        loadInfo();
    }, []);

    const handleQuantityChange = (category, item, value) => {
        const key = `${category}-${item}`;
        setOrderQuantities(prev => ({ ...prev, [key]: value }));
    };

    const handleMiscToggle = (item) => {
        const key = `MISC-${item}`;
        setSelectedMiscItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleCopyAndSave = async () => {
        const orderText = generateOrderOutput();

        // Copy to clipboard
        try {
            const textArea = document.createElement("textarea");
            textArea.value = orderText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
        } catch (err) {
            console.error('Copy failed:', err);
        }

        // Save order to Firestore
        if (db && selectedStoreId) {
            setIsSavingOrder(true);
            try {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const deliveryDate = tomorrow.toISOString().slice(0, 10);

                const orderId = `${selectedStoreId}-${Date.now()}`;
                const orderDocRef = doc(db, `artifacts/${appId}/public/data/orders`, orderId);

                await setDoc(orderDocRef, {
                    storeId: selectedStoreId,
                    storeName: stores[selectedStoreId]?.name || selectedStoreId,
                    orderDate: new Date().toISOString(),
                    deliveryDate: deliveryDate,
                    orderQuantities: orderQuantities,
                    orderText: orderText,
                    holidays: nextDayInfo?.holidays || [],
                    weather: weatherInfo || null,
                    currentStock: currentStock
                });

                showToast('Order saved and copied to clipboard!', 'success');
            } catch (error) {
                console.error('Error saving order:', error);
                showToast('Order copied but failed to save to history', 'warning');
            } finally {
                setIsSavingOrder(false);
            }
        } else {
            showToast('Order copied to clipboard!', 'success');
        }
    };

    const totalOrderItems = Object.values(orderQuantities).reduce((sum, v) => sum + (v || 0), 0);

    // Get low stock MISC items
    const lowStockMiscItems = masterStockList.MISC?.filter(item => {
        const key = `MISC-${item}`;
        return miscStatus[key] === 'low';
    }) || [];

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-3 text-orange-600" /> Generate Order
            </h2>

            {/* Next Day Info */}
            {loadingInfo ? (
                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center justify-center">
                    <Loader className="animate-spin w-5 h-5 text-orange-600 mr-2" />
                    <span className="text-gray-600">Loading forecast...</span>
                </div>
            ) : (
                <>
                    {/* Day Info Card */}
                    {nextDayInfo && (
                        <div className={`p-4 rounded-xl shadow-lg border ${nextDayInfo.isWeekend ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Tomorrow</p>
                                    <p className="text-lg font-bold text-gray-900">{nextDayInfo.dayName}</p>
                                </div>
                                {nextDayInfo.isWeekend && (
                                    <span className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded-full">
                                        Weekend
                                    </span>
                                )}
                            </div>
                            {nextDayInfo.holidays?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    {nextDayInfo.holidays.map((holiday, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-purple-700">
                                            <span>🎊</span>
                                            <span className="font-semibold">{holiday.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Weather Card */}
                    {weatherInfo && (
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl shadow-lg border border-blue-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{weatherInfo.emoji}</span>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{weatherInfo.temp || weatherInfo.mockData?.temp}°C</p>
                                        <p className="text-sm text-gray-600">{weatherInfo.description || weatherInfo.mockData?.description}</p>
                                    </div>
                                </div>
                                {weatherInfo.recommendation && (
                                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${weatherInfo.recommendation.type === 'increase'
                                            ? 'bg-green-100 text-green-700'
                                            : weatherInfo.recommendation.type === 'decrease'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {weatherInfo.recommendation.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg text-white">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm opacity-90">Total Order</p>
                        <p className="text-3xl font-bold">{totalOrderItems} items</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm opacity-90">Store</p>
                        <p className="text-lg font-semibold">{stores[selectedStoreId]?.name || 'Unknown'}</p>
                    </div>
                </div>
            </div>

            {/* Order Entry Forms */}
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
                                    const current = currentStock[key] || 0;
                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-gray-500">Current: {current}</span>
                                            </div>
                                            <StockInput
                                                label={item}
                                                value={orderQuantities[key] || 0}
                                                onChange={(val) => handleQuantityChange(category, item, val)}
                                                category={category}
                                                item={item}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* MISC Items - Only show low stock items */}
                {lowStockMiscItems.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-red-600 border-b border-red-200 pb-2 mb-3">
                            <AlertTriangle className="w-5 h-5 inline mr-2" />
                            Low Stock Items
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">Select items to include in order</p>
                        <div className="space-y-2">
                            {lowStockMiscItems.map(item => {
                                const key = `MISC-${item}`;
                                const isSelected = selectedMiscItems[key] || false;

                                return (
                                    <div
                                        key={key}
                                        onClick={() => handleMiscToggle(item)}
                                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${isSelected
                                                ? 'bg-orange-50 border-orange-300'
                                                : 'bg-gray-50 border-gray-200 hover:border-orange-200'
                                            }`}
                                    >
                                        <span className="text-gray-900 font-medium">{item}</span>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-orange-600 text-white' : 'bg-gray-300'
                                            }`}>
                                            {isSelected && <Check className="w-4 h-4" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Copy & Save Button */}
            <button
                onClick={handleCopyAndSave}
                disabled={isSavingOrder}
                className={`w-full py-4 font-bold rounded-xl shadow-lg transition duration-200 flex items-center justify-center text-xl ${isCopied
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    } disabled:opacity-50`}
            >
                {isSavingOrder ? (
                    <Loader className="animate-spin w-6 h-6 mr-2" />
                ) : isCopied ? (
                    <>
                        <Check className="w-6 h-6 mr-2" /> Copied & Saved!
                    </>
                ) : (
                    <>
                        <Copy className="w-6 h-6 mr-2" /> Copy Order & Save
                    </>
                )}
            </button>
        </div>
    );
};

export default OrderingView;
