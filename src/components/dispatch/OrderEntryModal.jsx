import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';
import { useToast } from '../../context/ToastContext';

const SECTIONS = [
    {
        label: 'ICE CREAM',
        categoryKey: 'ICE CREAM',
        items: [
            'Mango', 'Pista', 'Pineapple', 'Rose', 'Vanilla', 'Orange',
            'Keshar Pista', 'Chocolate', 'Strawberry', 'Butter Scotch',
            'Dry Anjir', 'Coffee Chips', 'Chocolate Fudge Badam', 'Chocolate Choco Chips',
            'Royal Treat', 'Kaju Draksha', 'Lichi', 'Jardalu', 'V.O.P.',
            'Gulkand Badam', 'Fresh Mango Bites', 'Tender Coconut',
            'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Pink Peru'
        ]
    },
    {
        label: 'MILKSHAKE',
        categoryKey: 'MILKSHAKE',
        items: [
            'Mango fm', 'Pista fm', 'Pineapple fm', 'Rose fm', 'Orange fm',
            'Vanilla fm', 'Kesar fm', 'Chocolate fm', 'Strawberry fm',
            'Butter Scotch fm', 'Kesar Mango fm', 'Fresh Sitaphal fm',
            'Fresh Strawberry fm', 'Fresh Pink Peru fm'
        ]
    },
    {
        label: 'PACKAGING MATERIAL',
        categoryKey: 'ICE CREAM DABBE',
        items: [
            'Glass Box Big', 'Glass Box Small', 'Icecream cup',
            'Big Glass Lid Box', 'Small Glass Lid Box', 'Icecream cup lid Box',
            'Cone Box', 'Paper Straw', 'Paper napkin', '500 ml Container'
        ]
    },
    {
        label: 'TOPPINGS',
        categoryKey: 'TOPPINGS',
        items: [
            'Dry Fruit Pack', 'Pista Pack', 'Badam Pack', 'Pista Powder', 'Cherry Tin'
        ]
    },
    {
        label: null,
        categoryKey: 'ICE CREAM DABBE',
        items: ['Ice Cream Empty Dabe']
    }
];

const OrderEntryModal = ({ onClose }) => {
    const { stores, addOrder } = useOrders();
    const { showToast } = useToast();

    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showStorePicker, setShowStorePicker] = useState(false);
    const [quantities, setQuantities] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const today = new Date().toISOString().slice(0, 10);

    const storesList = useMemo(() => {
        return Object.entries(stores)
            .map(([id, s]) => ({ id, ...s }))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [stores]);

    const selectedStore = selectedStoreId ? stores[selectedStoreId] : null;

    const filteredStores = useMemo(() => {
        if (!searchQuery) return storesList;
        const q = searchQuery.toLowerCase();
        return storesList.filter(
            s => (s.name || '').toLowerCase().includes(q) ||
                 (s.firmName || '').toLowerCase().includes(q) ||
                 (s.areaCode || '').toLowerCase().includes(q)
        );
    }, [storesList, searchQuery]);

    const handleQtyChange = (categoryKey, item, value) => {
        const key = `${categoryKey}-${item}`;
        const num = parseInt(value) || 0;
        setQuantities(prev => ({
            ...prev,
            [key]: num > 0 ? num : 0
        }));
    };

    // Clear all quantities
    const handleClearAll = () => {
        setQuantities({});
    };

    const handleSave = async () => {
        if (!selectedStoreId) {
            showToast('Please select a shop/firm', 'error');
            return;
        }

        // Check if at least one item has qty
        const hasItems = Object.values(quantities).some(q => q > 0);
        if (!hasItems) {
            showToast('Please enter at least one item quantity', 'error');
            return;
        }

        setIsSaving(true);
        try {
            // Build orderQuantities - only include items with qty > 0
            const orderQuantities = {};
            Object.entries(quantities).forEach(([key, qty]) => {
                if (qty > 0) {
                    orderQuantities[key] = qty;
                }
            });

            const orderData = {
                storeId: selectedStoreId,
                storeName: selectedStore?.name || '',
                deliveryDate: today,
                orderDate: new Date().toISOString(),
                orderQuantities,
                createdAt: new Date().toISOString()
            };

            await addOrder(orderData);
            showToast('Order saved successfully!', 'success');
            onClose();
        } catch (error) {
            console.error('Error saving order:', error);
            showToast('Failed to save order', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button onClick={onClose} className="p-1 -ml-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">New Order</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white">
                {/* Firm/Shop Info */}
                <div className="p-4 border-b border-gray-200">
                    {/* Shop Selector */}
                    <div className="mb-3">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Firm/Shop Name
                        </label>
                        {selectedStore ? (
                            <div className="flex items-center justify-between bg-orange-50 rounded-xl p-3">
                                <div>
                                    <p className="font-bold text-gray-900">{selectedStore.name}</p>
                                    {selectedStore.areaCode && (
                                        <p className="text-sm text-gray-500">{selectedStore.areaCode}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setSelectedStoreId(''); setShowStorePicker(true); }}
                                    className="text-sm text-orange-600 font-semibold"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowStorePicker(true)}
                                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-orange-400 hover:text-orange-600 transition text-center"
                            >
                                + Select Shop / Firm
                            </button>
                        )}
                    </div>

                    {/* Area & Date */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Area</label>
                            <p className="text-gray-700 font-medium">
                                {selectedStore?.areaCode || '—'}
                            </p>
                        </div>
                        <div className="flex-1 text-right">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
                            <p className="text-gray-700 font-medium">
                                {new Date(today).toLocaleDateString('en-IN', {
                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Order Sections - matching physical slip format */}
                <div className="p-4 pb-24">
                    {/* Clear All button */}
                    <div className="flex justify-end mb-3">
                        <button
                            onClick={handleClearAll}
                            className="text-xs text-red-500 font-semibold px-3 py-1 rounded-full border border-red-200 hover:bg-red-50"
                        >
                            Clear All
                        </button>
                    </div>

                    {SECTIONS.map((section, sIdx) => (
                        <div key={sIdx} className="mb-6">
                            {/* Section Header - using asterisks like the physical slip */}
                            {section.label && (
                                <div className="text-center mb-3">
                                    <span className="text-sm font-bold text-orange-600 tracking-wider">
                                        *{section.label}*
                                    </span>
                                </div>
                            )}

                            {/* Items */}
                            <div className="space-y-1">
                                {section.items.map(item => {
                                    const key = `${section.categoryKey}-${item}`;
                                    const qty = quantities[key] || 0;
                                    const displayName = item;

                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-b-0"
                                        >
                                            <span className="flex-1 text-gray-700 text-sm">{displayName}</span>
                                            <span className="text-gray-400">-</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={qty || ''}
                                                onChange={(e) => handleQtyChange(section.categoryKey, item, e.target.value)}
                                                placeholder="0"
                                                className="w-16 text-center border border-gray-200 rounded-lg p-1 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Spacer between sections */}
                            {sIdx < SECTIONS.length - 1 && <div className="my-4" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-200">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !selectedStoreId}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition"
                >
                    {isSaving ? (
                        <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    SAVE ORDER
                </button>
            </div>

            {/* Store Picker Modal */}
            {showStorePicker && (
                <div className="fixed inset-0 bg-white z-[60] flex flex-col">
                    <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <div className="px-4 py-4 flex items-center gap-3">
                            <button onClick={() => setShowStorePicker(false)} className="p-1 -ml-1">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-xl font-bold">Select Shop</h1>
                        </div>
                    </header>

                    <div className="p-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search shop by name or area..."
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 text-sm"
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-8">
                        {filteredStores.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No shops found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredStores.map(store => (
                                    <button
                                        key={store.id}
                                        onClick={() => {
                                            setSelectedStoreId(store.id);
                                            setShowStorePicker(false);
                                            setSearchQuery('');
                                        }}
                                        className={`w-full text-left p-4 rounded-xl border transition ${
                                            selectedStoreId === store.id
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-100 hover:border-orange-200'
                                        }`}
                                    >
                                        <p className="font-bold text-gray-900">{store.name}</p>
                                        {store.areaCode && (
                                            <p className="text-sm text-gray-500">{store.areaCode}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderEntryModal;
