import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader, List as ListIcon, FileText, History } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import Modal from '../Modal';

const OrderHistoryView = ({ db, appId, selectedStoreId, stores, showToast }) => {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'stock'
    
    const [orders, setOrders] = useState([]);
    const [stockEntries, setStockEntries] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedStock, setSelectedStock] = useState(null);

    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const loadHistory = async () => {
            setLoading(true);
            try {
                // Fetch Orders
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                const ordersSnapshot = await getDocs(ordersColRef);
                const ordersData = [];
                ordersSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        ordersData.push({ id: doc.id, ...data });
                    }
                });
                ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                setOrders(ordersData);

                // Fetch Stock Entries
                const stockColRef = collection(db, `artifacts/${appId}/public/data/stock_entries`);
                const stockSnapshot = await getDocs(stockColRef);
                const stockData = [];
                stockSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        stockData.push({ id: doc.id, ...data });
                    }
                });
                stockData.sort((a, b) => new Date(b.date || b.updatedAt) - new Date(a.date || a.updatedAt));
                setStockEntries(stockData);
                
            } catch (error) {
                console.error('Error loading history:', error);
                showToast('Failed to load history', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [db, appId, selectedStoreId]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown Date';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTotalItems = (quantities) => {
        if (!quantities) return 0;
        return Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0);
    };

    const handleCopyText = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
        document.body.removeChild(textArea);
    };
    
    const generateStockText = (stock) => {
        if (!stock || !stock.stock) return 'No items recorded.';
        let text = `Stock for ${stores[selectedStoreId]?.name} on ${stock.date}\n\n`;
        const items = Object.entries(stock.stock).filter(([_, qty]) => qty > 0);
        if (items.length === 0) return text + 'No items had quantity > 0.';
        
        items.forEach(([key, qty]) => {
            text += `${key.split('-').join(' - ')}: ${qty}\n`;
        });
        return text;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <History className="w-7 h-7 mr-3 text-orange-600" /> History
            </h2>
            <p className="text-sm text-gray-600 px-1">
                View past records for <span className="font-semibold text-orange-600">{stores[selectedStoreId]?.name}</span>
            </p>
            
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 flex justify-center items-center py-2.5 text-sm font-bold rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ShoppingCart className="w-4 h-4 mr-2" /> Orders
                </button>
                <button 
                    onClick={() => setActiveTab('stock')}
                    className={`flex-1 flex justify-center items-center py-2.5 text-sm font-bold rounded-lg transition-colors ${activeTab === 'stock' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ListIcon className="w-4 h-4 mr-2" /> Stock Entries
                </button>
            </div>

            {loading ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-12">
                    <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                    <span className="text-gray-600 font-medium">Loading history...</span>
                </div>
            ) : activeTab === 'orders' ? (
                /* ORDERS TAB */
                orders.length === 0 ? (
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
                                            {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : 'N/A'}
                                        </div>
                                    </div>
                                </div>
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
                )
            ) : (
                /* STOCK ENTRIES TAB */
                stockEntries.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ListIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-bold text-lg">No stock entries yet</p>
                        <p className="text-sm text-gray-500 mt-2">Stock recordings will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {stockEntries.map((stock) => (
                            <div key={stock.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Entry Date</p>
                                        <p className="text-base font-bold text-gray-900 mt-0.5">{stock.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Updated</p>
                                        <p className="text-sm font-medium text-gray-600 mt-0.5">{formatDate(stock.updatedAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Quantities</p>
                                        <p className="text-xl font-bold font-display text-gray-900">{getTotalItems(stock.stock)}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedStock(stock)}
                                        className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg shadow-gray-200"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <Modal title="Order Details" onClose={() => setSelectedOrder(null)}>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Order Date</p>
                            <p className="text-base font-semibold">{formatDate(selectedOrder.orderDate)}</p>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <p className="text-sm font-medium text-gray-700 mb-2">Order List:</p>
                            <pre className="p-4 bg-gray-50 text-gray-900 text-sm rounded-lg border border-gray-200 whitespace-pre-wrap font-mono">
                                {selectedOrder.orderText}
                            </pre>
                        </div>
                        <button
                            onClick={() => handleCopyText(selectedOrder.orderText)}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
                        >
                            Copy Order List
                        </button>
                    </div>
                </Modal>
            )}

            {/* Stock Detail Modal */}
            {selectedStock && (
                <Modal title="Stock Entry Details" onClose={() => setSelectedStock(null)}>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Entry Date</p>
                            <p className="text-base font-semibold">{selectedStock.date}</p>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <p className="text-sm font-medium text-gray-700 mb-2">Stock Data:</p>
                            <pre className="p-4 bg-gray-50 text-gray-900 text-sm rounded-lg border border-gray-200 whitespace-pre-wrap font-mono">
                                {generateStockText(selectedStock)}
                            </pre>
                        </div>
                        <button
                            onClick={() => handleCopyText(generateStockText(selectedStock))}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                        >
                            Copy Stock Details
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default OrderHistoryView;
