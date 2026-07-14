import React from 'react';
import { ArrowLeft } from 'lucide-react';

// Display sections matching the physical slip format
const DISPLAY_SECTIONS = [
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

const ShopDetailModal = ({ order, stores, onClose }) => {
    const store = stores[order.storeId] || {};
    const storeName = store.name || order.storeName || order.storeId;
    const area = store.areaCode || '';
    const firmName = store.firmName || storeName;

    const orderDate = order.deliveryDate || (order.orderDate ? order.orderDate.slice(0, 10) : '');
    const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) : '';

    const orderQty = order.orderQuantities || {};

    const getQty = (categoryKey, item) => {
        const key = `${categoryKey}-${item}`;
        return orderQty[key] || 0;
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button onClick={onClose} className="p-1 -ml-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Dispatch Slip</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-white">
                {/* Shop Info - matching slip header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Firm/Shop Name:</span>
                            <span className="font-bold text-gray-900">{firmName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Area:</span>
                            <span className="text-gray-700">{area || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">Date:</span>
                            <span className="text-gray-700">{formattedDate}</span>
                        </div>
                    </div>
                </div>

                {/* Order Items - matching physical slip format exactly */}
                <div className="p-4 pb-8">
                    {DISPLAY_SECTIONS.map((section, sIdx) => (
                        <div key={sIdx} className="mb-6">
                            {/* Section Header with asterisks */}
                            {section.label && (
                                <div className="text-center mb-3 border-t border-gray-200 pt-3">
                                    <span className="text-sm font-bold text-orange-600 tracking-wider">
                                        *{section.label}*
                                    </span>
                                </div>
                            )}

                            {/* Items */}
                            <div className="space-y-1">
                                {section.items.map(item => {
                                    const qty = getQty(section.categoryKey, item);
                                    const hasOrder = qty > 0;

                                    return (
                                        <div
                                            key={`${section.categoryKey}-${item}`}
                                            className={`flex items-center gap-2 py-2 border-b border-gray-100 last:border-b-0 ${
                                                !hasOrder ? 'text-gray-400' : 'text-gray-900'
                                            }`}
                                        >
                                            <span className="flex-1 text-sm">{item}</span>
                                            <span className="text-gray-300">-</span>
                                            <span className={`w-16 text-center font-bold text-base ${
                                                hasOrder ? 'text-gray-900' : 'text-gray-300'
                                            }`}>
                                                {hasOrder ? qty : ''}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShopDetailModal;
