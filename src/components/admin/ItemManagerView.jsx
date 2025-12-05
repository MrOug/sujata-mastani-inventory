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
        <div className="space-y-6 pb-20">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <Package className="w-7 h-7 mr-3 text-orange-600" /> Item Manager
            </h2>
            <p className="text-sm text-gray-600 px-1">Manage the master list of stock items across all categories.</p>

            {/* Add New Item */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                <div className="flex items-center gap-2 border-b border-orange-100 pb-3 mb-2">
                    <Plus className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-900">Add New Item</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                        >
                            {CATEGORY_ORDER.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Item Name</label>
                        <input
                            type="text"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                            placeholder="Enter item name"
                        />
                    </div>
                </div>

                <button
                    onClick={handleAddItem}
                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center mt-2"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add Item
                </button>
            </div>

            {/* Items by Category */}
            <div className="space-y-4">
                {CATEGORY_ORDER.map(category => {
                    const items = localList[category] || [];

                    return (
                        <div key={category} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    {category}
                                </span>
                                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">
                                    {items.length} items
                                </span>
                            </h3>

                            {items.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <p className="text-gray-400 text-sm font-medium">No items in this category</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {items.map(item => (
                                        <div
                                            key={item}
                                            className="group flex items-center gap-2 bg-white border border-gray-200 pl-3 pr-1 py-1.5 rounded-lg shadow-sm hover:border-orange-200 hover:shadow-md transition-all"
                                        >
                                            <span className="text-gray-700 font-medium text-sm">{item}</span>
                                            <button
                                                onClick={() => handleRemoveItem(category, item)}
                                                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all"
                                                aria-label={`Remove ${item}`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
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
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50">
                    <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/20 transition-all flex items-center justify-center disabled:opacity-50 ring-4 ring-white"
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
