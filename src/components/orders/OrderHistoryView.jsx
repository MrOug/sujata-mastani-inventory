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
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-3 text-orange-600" /> Order History
            </h2>
            <p className="text-sm text-gray-600">
                View past orders for <span className="font-semibold">{stores[selectedStoreId]?.name}</span>
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                    <span className="text-gray-600">Loading order history...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No orders found for this store</p>
                    <p className="text-sm text-gray-500 mt-2">Orders will appear here once you generate them</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-sm text-gray-500">Ordered on</p>
                                    <p className="text-base font-semibold text-gray-900">{formatDate(order.orderDate)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Delivery Date</p>
                                    <p className="text-base font-semibold text-orange-600">
                                        {new Date(order.deliveryDate).toLocaleDateString('en-IN')}
                                    </p>
                                </div>
                            </div>

                            {order.holidays && order.holidays.length > 0 && (
                                <div className="mb-2">
                                    {order.holidays.map((holiday, idx) => (
                                        <span key={idx} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                            🎊 {holiday.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {order.weather && (
                                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                                    <span>{order.weather.emoji}</span>
                                    <span>{order.weather.temp || order.weather.mockData?.temp}°C</span>
                                    <span className="text-gray-400">•</span>
                                    <span>{order.weather.description || order.weather.mockData?.description}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Total Items:</span> {getTotalItems(order.orderQuantities)}
                                </p>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition"
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
