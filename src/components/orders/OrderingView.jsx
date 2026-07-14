import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import StockInput from '../StockInput';
import { copyToClipboard } from '../../utils/clipboard-utils';
import { formatDateLocal, getDeliveryDate } from '../../utils/date-utils';

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
    const [showOutputModal, setShowOutputModal] = useState(false);
    const [orderOutput, setOrderOutput] = useState('');

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

    // Save order to Firestore
    const saveOrderToFirestore = async (quantities, output) => {
        if (!db || !selectedStoreId) return;

        // Business day ends at 6 AM
        const deliveryDate = formatDateLocal(getDeliveryDate());

        const orderId = `${selectedStoreId}-${Date.now()}`;
        const orderDocRef = doc(db, `artifacts/${appId}/public/data/orders`, orderId);

        await setDoc(orderDocRef, {
            storeId: selectedStoreId,
            storeName: stores[selectedStoreId]?.name || selectedStoreId,
            orderDate: new Date().toISOString(),
            deliveryDate: deliveryDate,
            orderQuantities: quantities,
            orderText: output,
            holidays: nextDayInfo?.holidays || [],
            weather: weatherInfo || null,
            currentStock: currentStock
        });
    };

    const handleCopyAndSave = async () => {
        setIsSavingOrder(true);

        try {
            const output = generateOrderOutput();
            setOrderOutput(output);

            // Save to Firestore first
            try {
                await saveOrderToFirestore(orderQuantities, output);
            } catch (saveError) {
                console.error('Error saving order:', saveError);
                // Continue even if save fails
            }

            // Copy to clipboard
            try {
                await copyToClipboard(output);
                showToast('Order saved and copied to clipboard!', 'success');
            } catch (copyError) {
                showToast('Order saved but failed to copy. Please copy manually from the modal.', 'warning');
            }

            // Show modal after copying
            setShowOutputModal(true);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
        } catch (error) {
            console.error('Error generating order:', error);
            showToast('Failed to generate order. Please try again.', 'error');
        } finally {
            setIsSavingOrder(false);
        }
    };

    const totalOrderItems = Object.values(orderQuantities).reduce((sum, v) => sum + (v || 0), 0);

    // Get low stock MISC items
    const lowStockMiscItems = masterStockList.MISC?.filter(item => {
        const key = `MISC-${item}`;
        return miscStatus[key] === 'low';
    }) || [];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <ShoppingCart className="w-7 h-7 mr-3 text-orange-600" /> Generate Order
            </h2>

            {/* Next Day Info & Weather */}
            {loadingInfo ? (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-8">
                    <Loader className="animate-spin w-6 h-6 text-orange-600 mr-2" />
                    <span className="text-gray-600 font-medium">Loading forecast...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Day Info Card */}
                    {nextDayInfo && (
                        <div className={`p-5 rounded-2xl shadow-sm border transition-shadow hover:shadow-md ${
                            nextDayInfo.isChaturthi || nextDayInfo.isPurnima
                                ? 'bg-orange-50 border-orange-200'
                                : nextDayInfo.isWeekend
                                    ? 'bg-purple-50 border-purple-100'
                                    : 'bg-white border-gray-100'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Tomorrow's Delivery</p>
                                    <p className="text-xl font-bold text-gray-900 mt-1">{nextDayInfo.dayName}</p>
                                    {/* Tithi Info */}
                                    {nextDayInfo.panchang?.tithi && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {nextDayInfo.panchang.tithi.name} • {nextDayInfo.panchang.tithi.paksha}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    {nextDayInfo.isWeekend && (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200 uppercase tracking-wider">
                                            Weekend
                                        </span>
                                    )}
                                    {nextDayInfo.isChaturthi && (
                                        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200 uppercase tracking-wider">
                                            🙏 Chaturthi
                                        </span>
                                    )}
                                    {nextDayInfo.isPurnima && (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200 uppercase tracking-wider">
                                            🌕 Purnima
                                        </span>
                                    )}
                                    {nextDayInfo.isEkadashi && (
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200 uppercase tracking-wider">
                                            Ekadashi
                                        </span>
                                    )}
                                    {nextDayInfo.isAmavasya && (
                                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full border border-gray-200 uppercase tracking-wider">
                                            🌑 Amavasya
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Tithi Events */}
                            {nextDayInfo.tithiEvents?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-orange-200/60">
                                    {nextDayInfo.tithiEvents.map((event, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-orange-700 text-sm">
                                            <span>{event.emoji}</span>
                                            <span className="font-semibold">{event.name}</span>
                                            {event.impact === 'high' && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">High Demand</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Holidays */}
                            {nextDayInfo.holidays?.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200/60">
                                    {nextDayInfo.holidays.map((holiday, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-purple-700 text-sm">
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
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-blue-100 transition-shadow hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl filter drop-shadow-sm">{weatherInfo.emoji}</span>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{weatherInfo.temp || weatherInfo.mockData?.temp}°C</p>
                                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">{weatherInfo.description || weatherInfo.mockData?.description}</p>
                                    </div>
                                </div>
                                {weatherInfo.recommendation && (
                                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border ${weatherInfo.recommendation.type === 'increase'
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : weatherInfo.recommendation.type === 'decrease'
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : 'bg-white/60 text-gray-600 border-gray-200'
                                        }`}>
                                        {weatherInfo.recommendation.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white flex items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-700"></div>

                <div className="relative z-10">
                    <p className="text-sm opacity-90 font-medium mb-1">Total Order Items</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold font-display">{totalOrderItems}</p>
                        <span className="text-sm opacity-75">units</span>
                    </div>
                </div>
                <div className="text-right relative z-10 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                    <p className="text-xs opacity-75 uppercase tracking-wider mb-0.5">Store</p>
                    <p className="text-base font-bold truncate max-w-[120px]">{stores[selectedStoreId]?.name || 'Unknown'}</p>
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

            {/* Output Modal */}
            {showOutputModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-slideUp">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                            <h3 className="text-lg font-bold">📋 Order Generated</h3>
                            <button
                                onClick={() => setShowOutputModal(false)}
                                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-words border border-gray-200">
                                {orderOutput}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-gray-200 flex gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        await copyToClipboard(orderOutput);
                                        showToast('Copied to clipboard!', 'success');
                                    } catch (err) {
                                        showToast('Failed to copy', 'error');
                                    }
                                }}
                                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition flex items-center justify-center"
                            >
                                <Copy className="w-5 h-5 mr-2" /> Copy Again
                            </button>
                            <button
                                onClick={() => setShowOutputModal(false)}
                                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderingView;
