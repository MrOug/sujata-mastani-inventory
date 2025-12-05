import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Loader, Calendar } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';

const OrderStatsView = ({
    db,
    appId,
    selectedStoreId,
    stores,
    showToast,
    masterStockList,
    CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC']
}) => {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [availableDates, setAvailableDates] = useState([]);

    // Fetch orders for the store
    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const fetchOrders = async () => {
            setLoading(true);
            try {
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                const querySnapshot = await getDocs(ordersColRef);

                const ordersData = [];
                const datesSet = new Set();

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        ordersData.push({ id: doc.id, ...data });
                        const orderDate = new Date(data.orderDate).toISOString().slice(0, 10);
                        datesSet.add(orderDate);
                    }
                });

                const sortedDates = Array.from(datesSet).sort((a, b) => new Date(b) - new Date(a));
                setAvailableDates(sortedDates);
                setOrders(ordersData);

                if (sortedDates.length > 0 && !selectedDate) {
                    setSelectedDate(sortedDates[0]);
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
                showToast('Failed to load order statistics', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [db, appId, selectedStoreId]);

    // Calculate summary for selected date
    const dateSummary = useMemo(() => {
        if (!selectedDate || orders.length === 0) return null;

        const dateOrders = orders.filter(order => {
            const orderDate = new Date(order.orderDate).toISOString().slice(0, 10);
            return orderDate === selectedDate;
        });

        if (dateOrders.length === 0) return null;

        const totalsByItem = {};
        let totalOrders = 0;
        let totalItems = 0;

        dateOrders.forEach(order => {
            if (order.orderQuantities) {
                Object.entries(order.orderQuantities).forEach(([key, qty]) => {
                    if (qty > 0) {
                        totalsByItem[key] = (totalsByItem[key] || 0) + qty;
                        totalItems += qty;
                    }
                });
            }
            totalOrders++;
        });

        return { totalsByItem, totalOrders, totalItems };
    }, [selectedDate, orders]);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <BarChart2 className="w-7 h-7 mr-3 text-orange-600" /> Order Statistics
            </h2>
            <p className="text-sm text-gray-600 px-1">
                View order statistics for <span className="font-semibold text-orange-600">{stores[selectedStoreId]?.name}</span>
            </p>

            {loading ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-12">
                    <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                    <span className="text-gray-600 font-medium">Loading statistics...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-bold text-lg">No order data available</p>
                    <p className="text-sm text-gray-500 mt-2">Create some orders to see statistics</p>
                </div>
            ) : (
                <>
                    {/* Date Selector */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4">
                        <label className="flex items-center text-sm font-semibold text-gray-700 whitespace-nowrap">
                            <Calendar className="w-4 h-4 mr-2 text-orange-600" /> Select Date
                        </label>
                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full sm:w-auto flex-1 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 text-sm font-medium"
                        >
                            {availableDates.map(date => (
                                <option key={date} value={date}>{formatDate(date)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary Cards */}
                    {dateSummary && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
                                    <p className="text-sm opacity-90 font-medium relative z-10">Total Orders</p>
                                    <p className="text-4xl font-bold font-display mt-1 relative z-10">{dateSummary.totalOrders}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
                                    <p className="text-sm opacity-90 font-medium relative z-10">Total Items</p>
                                    <p className="text-4xl font-bold font-display mt-1 relative z-10">{dateSummary.totalItems}</p>
                                </div>
                            </div>

                            {/* Detailed Item Breakdown */}
                            {dateSummary.totalsByItem && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900">Item Breakdown</h3>
                                    {CATEGORY_ORDER.map(category => {
                                        const categoryItems = masterStockList[category]
                                            ?.map(item => {
                                                const key = `${category}-${item}`;
                                                const qty = dateSummary.totalsByItem[key] || 0;
                                                return { item, qty, key };
                                            })
                                            .filter(item => item.qty > 0);

                                        if (!categoryItems || categoryItems.length === 0) return null;

                                        const categoryTotal = categoryItems.reduce((sum, item) => sum + item.qty, 0);

                                        return (
                                            <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-lg font-bold text-orange-700">{category}</h4>
                                                    <span className="text-sm font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                                                        Total: {categoryTotal}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {categoryItems.map(({ item, qty, key }) => (
                                                        <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                                            <span className="text-gray-900 font-medium">{item}</span>
                                                            <span className="text-orange-600 font-bold text-lg">{qty}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default OrderStatsView;
