import React, { useState } from 'react';
import { Loader, Trash2, Plus } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';
import { useToast } from '../../context/ToastContext';
import ShopDetailModal from './ShopDetailModal';
import OrderEntryModal from './OrderEntryModal';

const OrderCard = ({ order, stores, onDelete, onClick }) => {
    const store = stores[order.storeId] || {};
    const storeName = store.name || order.storeName || order.storeId;
    const area = store.areaCode || '';

    const orderQty = order.orderQuantities || {};

    const milkshakeTotal = Object.entries(orderQty)
        .filter(([key]) => key.startsWith('MILKSHAKE-'))
        .reduce((sum, [, qty]) => sum + (qty || 0), 0);

    const iceCreamTotal = Object.entries(orderQty)
        .filter(([key]) => key.startsWith('ICE CREAM-'))
        .reduce((sum, [, qty]) => sum + (qty || 0), 0);

    const toppingsTotal = Object.entries(orderQty)
        .filter(([key]) => key.startsWith('TOPPINGS-'))
        .reduce((sum, [, qty]) => sum + (qty || 0), 0);

    const packagingTotal = Object.entries(orderQty)
        .filter(([key]) => key.startsWith('ICE CREAM DABBE-'))
        .reduce((sum, [, qty]) => sum + (qty || 0), 0);

    const orderDate = order.deliveryDate || (order.orderDate ? order.orderDate.slice(0, 10) : '');
    const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) : '';

    return (
        <div
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition"
            onClick={() => onClick(order)}
        >
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{storeName}</h3>
                        {area && <p className="text-sm text-gray-500">{area}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{formattedDate}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(order.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-600 transition"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Category badges - matching physical slip categories */}
                <div className="flex gap-1">
                    <div className="flex-1 bg-red-100 text-red-700 rounded-lg px-2 py-2 text-center">
                        <span className="text-sm font-semibold">IC: {iceCreamTotal}</span>
                    </div>
                    <div className="flex-1 bg-orange-100 text-orange-700 rounded-lg px-2 py-2 text-center">
                        <span className="text-sm font-semibold">M: {milkshakeTotal}</span>
                    </div>
                    <div className="flex-1 bg-blue-100 text-blue-700 rounded-lg px-2 py-2 text-center">
                        <span className="text-sm font-semibold">P: {packagingTotal}</span>
                    </div>
                    <div className="flex-1 bg-green-100 text-green-700 rounded-lg px-2 py-2 text-center">
                        <span className="text-sm font-semibold">T: {toppingsTotal}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DispatchView = () => {
    const { orders, stores, loading, deleteOrder } = useOrders();
    const { showToast, showConfirm } = useToast();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderEntry, setShowOrderEntry] = useState(false);

    const handleDelete = async (orderId) => {
        const confirmed = await showConfirm({
            title: 'Delete Order',
            message: 'Are you sure you want to delete this order?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });

        if (confirmed) {
            try {
                await deleteOrder(orderId);
                showToast('Order deleted', 'success');
            } catch (error) {
                showToast('Failed to delete order', 'error');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {orders.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <p className="text-gray-500 font-medium">No orders for this date</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            stores={stores}
                            onDelete={handleDelete}
                            onClick={setSelectedOrder}
                        />
                    ))}
                </div>
            )}

            {/* Shop Detail Modal */}
            {selectedOrder && (
                <ShopDetailModal
                    order={selectedOrder}
                    stores={stores}
                    onClose={() => setSelectedOrder(null)}
                />
            )}

            {/* Order Entry Modal */}
            {showOrderEntry && (
                <OrderEntryModal onClose={() => setShowOrderEntry(false)} />
            )}

            {/* FAB */}
            <button
                className="fixed bottom-24 right-4 w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg flex items-center justify-center transition z-40"
                onClick={() => setShowOrderEntry(true)}
            >
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
};

export default DispatchView;
