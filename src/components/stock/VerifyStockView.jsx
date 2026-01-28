import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Check, X, Loader, Save, Package, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';

const VerifyStockView = ({
    db,
    appId,
    selectedStoreId,
    stores,
    showToast,
    masterStockList,
    CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC']
}) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [todaysOrders, setTodaysOrders] = useState([]);
    const [verificationData, setVerificationData] = useState({});
    const [existingVerification, setExistingVerification] = useState(null);

    // Get today's date in ISO format (YYYY-MM-DD)
    const getTodayDate = () => new Date().toISOString().slice(0, 10);

    // Fetch orders scheduled for delivery today
    useEffect(() => {
        const fetchTodaysOrders = async () => {
            if (!db || !selectedStoreId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const todayDate = getTodayDate();
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                const ordersSnapshot = await getDocs(ordersColRef);

                // Filter orders for this store with delivery date of today
                const orders = [];
                ordersSnapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.storeId === selectedStoreId && data.deliveryDate === todayDate) {
                        orders.push({ id: docSnap.id, ...data });
                    }
                });

                setTodaysOrders(orders);

                // Initialize verification data from orders
                const initialData = {};
                orders.forEach(order => {
                    if (order.orderQuantities) {
                        Object.entries(order.orderQuantities).forEach(([key, qty]) => {
                            if (qty > 0) {
                                if (!initialData[key]) {
                                    initialData[key] = { ordered: 0, received: 0, verified: false };
                                }
                                initialData[key].ordered += qty;
                                initialData[key].received = initialData[key].ordered; // Default to full receipt
                            }
                        });
                    }
                });

                // Check for existing verification
                const verifyDocRef = doc(db, `artifacts/${appId}/public/data/stock_verifications`, `${selectedStoreId}-${todayDate}`);
                const { getDoc } = await import('firebase/firestore');
                const verifySnap = await getDoc(verifyDocRef);

                if (verifySnap.exists()) {
                    const existingData = verifySnap.data();
                    setExistingVerification(existingData);
                    setVerificationData(existingData.items || initialData);
                } else {
                    setVerificationData(initialData);
                }

            } catch (error) {
                console.error('Error fetching orders:', error);
                showToast('Failed to load today\'s orders', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchTodaysOrders();
    }, [db, appId, selectedStoreId]);

    // Toggle item verification
    const handleToggleVerified = (key) => {
        setVerificationData(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                verified: !prev[key]?.verified
            }
        }));
    };

    // Update received quantity
    const handleReceivedChange = (key, value) => {
        const numValue = parseInt(value) || 0;
        setVerificationData(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                received: numValue,
                discrepancy: numValue - (prev[key]?.ordered || 0)
            }
        }));
    };

    // Mark all as received
    const handleMarkAllReceived = () => {
        setVerificationData(prev => {
            const updated = {};
            Object.entries(prev).forEach(([key, data]) => {
                updated[key] = {
                    ...data,
                    verified: true,
                    received: data.ordered,
                    discrepancy: 0
                };
            });
            return updated;
        });
        showToast('All items marked as received', 'success');
    };

    // Save verification
    const handleSave = async () => {
        if (!db || !selectedStoreId) return;

        setSaving(true);
        try {
            const todayDate = getTodayDate();
            const verifyDocRef = doc(db, `artifacts/${appId}/public/data/stock_verifications`, `${selectedStoreId}-${todayDate}`);

            // Calculate totals
            let totalOrdered = 0;
            let totalReceived = 0;
            let hasDiscrepancies = false;

            Object.values(verificationData).forEach(item => {
                totalOrdered += item.ordered || 0;
                totalReceived += item.received || 0;
                if (item.ordered !== item.received) {
                    hasDiscrepancies = true;
                }
            });

            await setDoc(verifyDocRef, {
                storeId: selectedStoreId,
                storeName: stores[selectedStoreId]?.name || selectedStoreId,
                date: todayDate,
                verifiedAt: new Date().toISOString(),
                items: verificationData,
                totalOrdered,
                totalReceived,
                hasDiscrepancies,
                orderIds: todaysOrders.map(o => o.id)
            });

            setExistingVerification({ items: verificationData, totalOrdered, totalReceived, hasDiscrepancies });
            showToast('Verification saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving verification:', error);
            showToast(`Failed to save: ${error.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Group items by category
    const groupedItems = {};
    Object.entries(verificationData).forEach(([key, data]) => {
        const [category, ...itemParts] = key.split('-');
        const item = itemParts.join('-');
        if (!groupedItems[category]) {
            groupedItems[category] = [];
        }
        groupedItems[category].push({ key, item, ...data });
    });

    // Calculate summary
    const totalItems = Object.keys(verificationData).length;
    const verifiedCount = Object.values(verificationData).filter(d => d.verified).length;
    const discrepancyCount = Object.values(verificationData).filter(d => d.ordered !== d.received).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                <span className="text-gray-600 font-medium">Loading delivery orders...</span>
            </div>
        );
    }

    if (todaysOrders.length === 0 && !existingVerification) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                    <ClipboardCheck className="w-7 h-7 mr-3 text-orange-600" /> Verify Stock
                </h2>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Deliveries Today</h3>
                    <p className="text-gray-500">There are no orders scheduled for delivery today.</p>
                    <p className="text-sm text-gray-400 mt-4">
                        Orders placed will appear here on their delivery date.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-32">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <ClipboardCheck className="w-7 h-7 mr-3 text-orange-600" /> Verify Stock
            </h2>
            <p className="text-sm text-gray-600 px-1">
                Verify items received from today's delivery. Mark each item as received.
            </p>

            {/* Summary Card */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm text-center">
                    <p className="text-xs text-green-600 uppercase font-bold">Verified</p>
                    <p className="text-2xl font-bold text-green-700">{verifiedCount}</p>
                </div>
                <div className={`p-4 rounded-xl border shadow-sm text-center ${discrepancyCount > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                    <p className={`text-xs uppercase font-bold ${discrepancyCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Issues</p>
                    <p className={`text-2xl font-bold ${discrepancyCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{discrepancyCount}</p>
                </div>
            </div>

            {/* Quick Actions */}
            <button
                onClick={handleMarkAllReceived}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center"
            >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Mark All as Received
            </button>

            {/* Items by Category */}
            <div className="space-y-4">
                {CATEGORY_ORDER.map(category => {
                    const items = groupedItems[category] || [];
                    if (items.length === 0) return null;

                    return (
                        <div key={category} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                {category}
                                <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                                    {items.length} items
                                </span>
                            </h3>

                            <div className="space-y-3">
                                {items.map(({ key, item, ordered, received, verified, discrepancy }) => (
                                    <div
                                        key={key}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${verified
                                                ? discrepancy === 0
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-yellow-50 border-yellow-200'
                                                : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{item}</p>
                                            <p className="text-xs text-gray-500">
                                                Ordered: <span className="font-bold text-gray-700">{ordered}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Received quantity input */}
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={received}
                                                    onChange={(e) => handleReceivedChange(key, e.target.value)}
                                                    className="w-16 p-2 text-center border border-gray-200 rounded-lg font-bold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                    min="0"
                                                />
                                                {discrepancy !== 0 && (
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${discrepancy < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {discrepancy > 0 ? '+' : ''}{discrepancy}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Verify toggle */}
                                            <button
                                                onClick={() => handleToggleVerified(key)}
                                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${verified
                                                        ? 'bg-green-600 text-white shadow-lg'
                                                        : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                                    }`}
                                            >
                                                {verified ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Discrepancy Summary */}
            {discrepancyCount > 0 && (
                <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h3 className="font-bold text-red-800">Discrepancies Found</h3>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(verificationData)
                            .filter(([_, data]) => data.ordered !== data.received)
                            .map(([key, data]) => {
                                const [category, ...itemParts] = key.split('-');
                                const item = itemParts.join('-');
                                const diff = data.received - data.ordered;
                                return (
                                    <div key={key} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-200">
                                        <span className="font-medium text-gray-900">{item}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">
                                                {data.ordered} → {data.received}
                                            </span>
                                            <span className={`text-sm font-bold px-2 py-0.5 rounded ${diff < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-[100]">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-2xl transition-all flex items-center justify-center ring-4 ring-white disabled:opacity-50"
                >
                    {saving ? (
                        <Loader className="animate-spin w-6 h-6 mr-2" />
                    ) : (
                        <Save className="w-6 h-6 mr-2" />
                    )}
                    Save Verification
                </button>
            </div>
        </div>
    );
};

export default VerifyStockView;
