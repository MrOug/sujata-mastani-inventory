import React, { useState } from 'react';
import { Package, Plus, Trash2, Loader, Save } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';

const ItemManagerView = ({
    db,
    appId,
    masterStockList,
    setMasterStockList,
    showToast,
    CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC']
}) => {
    const [newItem, setNewItem] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('MILKSHAKE');
    const [isSaving, setIsSaving] = useState(false);
    const [localList, setLocalList] = useState(masterStockList);

    const handleAddItem = () => {
        if (!newItem.trim()) {
            showToast('Please enter an item name', 'error');
            return;
        }

        const currentItems = localList[selectedCategory] || [];
        if (currentItems.includes(newItem.trim())) {
            showToast('Item already exists in this category', 'error');
            return;
        }

        setLocalList(prev => ({
            ...prev,
            [selectedCategory]: [...(prev[selectedCategory] || []), newItem.trim()]
        }));
        setNewItem('');
        showToast(`"${newItem.trim()}" added to ${selectedCategory}`, 'success');
    };

    const handleRemoveItem = (category, itemToRemove) => {
        setLocalList(prev => ({
            ...prev,
            [category]: (prev[category] || []).filter(item => item !== itemToRemove)
        }));
        showToast(`"${itemToRemove}" removed from ${category}`, 'success');
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const listDocRef = doc(db, `artifacts/${appId}/public`, 'master_stock_list');
            await setDoc(listDocRef, {
                list: localList,
                lastUpdated: new Date().toISOString()
            });

            setMasterStockList(localList);
            showToast('Master stock list saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving master stock list:', error);
            showToast(`Failed to save: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = JSON.stringify(localList) !== JSON.stringify(masterStockList);

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <Package className="w-6 h-6 mr-3 text-orange-600" /> Item Manager
            </h2>
            <p className="text-sm text-gray-600">Manage the master list of stock items across all categories.</p>

            {/* Add New Item */}
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 space-y-4">
                <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2">Add New Item</h3>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600"
                    >
                        {CATEGORY_ORDER.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600"
                        placeholder="Enter item name"
                    />
                </div>

                <button
                    onClick={handleAddItem}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add Item
                </button>
            </div>

            {/* Items by Category */}
            <div className="space-y-4">
                {CATEGORY_ORDER.map(category => {
                    const items = localList[category] || [];

                    return (
                        <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                            <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3 flex justify-between items-center">
                                {category}
                                <span className="text-sm font-normal bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                                    {items.length} items
                                </span>
                            </h3>

                            {items.length === 0 ? (
                                <p className="text-gray-500 text-sm py-2">No items in this category</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {items.map(item => (
                                        <div
                                            key={item}
                                            className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full group"
                                        >
                                            <span className="text-gray-800 font-medium">{item}</span>
                                            <button
                                                onClick={() => handleRemoveItem(category, item)}
                                                className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-100 transition opacity-0 group-hover:opacity-100"
                                                aria-label={`Remove ${item}`}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Save Button */}
            {hasChanges && (
                <div className="sticky bottom-4 z-10">
                    <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader className="animate-spin w-6 h-6 mr-2" />
                        ) : (
                            <Save className="w-6 h-6 mr-2" />
                        )}
                        Save All Changes
                    </button>
                </div>
            )}
        </div>
    );
};

export default ItemManagerView;
