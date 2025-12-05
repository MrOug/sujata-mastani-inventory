import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import Modal from '../Modal';

const OrderHistoryView = ({ db, appId, selectedStoreId, stores, showToast }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                const querySnapshot = await getDocs(ordersColRef);

                const ordersData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        ordersData.push({ id: doc.id, ...data });
                    }
                });

                // Sort by order date descending (newest first)
                ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                setOrders(ordersData);
            } catch (error) {
                console.error('Error loading orders:', error);
                showToast('Failed to load order history', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, [db, appId, selectedStoreId]);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTotalItems = (orderQuantities) => {
        if (!orderQuantities) return 0;
        return Object.values(orderQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
    };

    const handleCopyOrder = (orderText) => {
        const textArea = document.createElement("textarea");
        textArea.value = orderText;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Order copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <ShoppingCart className="w-7 h-7 mr-3 text-orange-600" /> Order History
            </h2>
            <p className="text-sm text-gray-600 px-1">
                View past orders for <span className="font-semibold text-orange-600">{stores[selectedStoreId]?.name}</span>
            </p>

            {loading ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-12">
                    <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                    <span className="text-gray-600 font-medium">Loading history...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-bold text-lg">No orders yet</p>
                    <p className="text-sm text-gray-500 mt-2">Orders will appear here once you generate them</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Ordered on</p>
                                    <p className="text-base font-bold text-gray-900 mt-0.5">{formatDate(order.orderDate)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Delivery</p>
                                    <div className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded text-sm font-bold bg-orange-50 text-orange-600 border border-orange-100">
                                        {new Date(order.deliveryDate).toLocaleDateString('en-IN')}
                                    </div>
                                </div>
                            </div>

                            {/* Info Badges */}
                            {(order.holidays?.length > 0 || order.weather) && (
                                <div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    {order.holidays?.map((holiday, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                                            <span>🎊</span> {holiday.name}
                                        </div>
                                    ))}
                                    {order.weather && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                                            <span>{order.weather.emoji}</span>
                                            <span>{order.weather.temp || order.weather.mockData?.temp}°C</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div>
                                    <p className="text-sm text-gray-500">Total Items</p>
                                    <p className="text-xl font-bold font-display text-gray-900">{getTotalItems(order.orderQuantities)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg shadow-gray-200"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <Modal title="Order Details" onClose={() => setSelectedOrder(null)}>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Order Date</p>
                            <p className="text-base font-semibold">{formatDate(selectedOrder.orderDate)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Delivery Date</p>
                            <p className="text-base font-semibold text-orange-600">
                                {new Date(selectedOrder.deliveryDate).toLocaleDateString('en-IN')}
                            </p>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <p className="text-sm font-medium text-gray-700 mb-2">Order List:</p>
                            <pre className="p-4 bg-gray-50 text-gray-900 text-sm rounded-lg border border-gray-200 whitespace-pre-wrap font-mono">
                                {selectedOrder.orderText}
                            </pre>
                        </div>
                        <button
                            onClick={() => handleCopyOrder(selectedOrder.orderText)}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
                        >
                            Copy Order List
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default OrderHistoryView;
