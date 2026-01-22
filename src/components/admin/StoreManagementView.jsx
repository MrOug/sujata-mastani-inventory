import React, { useState } from 'react';
import { Store, Plus, Trash2, Loader } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const StoreManagementView = ({ db, appId, stores, showToast, showConfirm }) => {
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreFirmName, setNewStoreFirmName] = useState('');
    const [newStoreAreaCode, setNewStoreAreaCode] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const handleAddStore = async () => {
        if (!newStoreName.trim()) {
            showToast('Please enter a store name', 'error');
            return;
        }

        setIsAdding(true);
        try {
            const storeId = newStoreName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const storeDocRef = doc(db, `artifacts/${appId}/public/data/stores`, storeId);

            await setDoc(storeDocRef, {
                name: newStoreName.trim(),
                firmName: newStoreFirmName.trim() || newStoreName.trim(),
                areaCode: newStoreAreaCode.trim(),
                createdAt: new Date().toISOString()
            });

            showToast(`Store "${newStoreName}" added successfully!`, 'success');
            setNewStoreName('');
            setNewStoreFirmName('');
            setNewStoreAreaCode('');
        } catch (error) {
            console.error('Error adding store:', error);
            showToast(`Failed to add store: ${error.message}`, 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        const confirmed = await showConfirm({
            title: 'Delete Store',
            message: `Are you sure you want to delete "${storeName}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });

        if (!confirmed) return;

        setDeletingId(storeId);
        try {
            const storeDocRef = doc(db, `artifacts/${appId}/public/data/stores`, storeId);
            await deleteDoc(storeDocRef);
            showToast(`Store "${storeName}" deleted successfully!`, 'success');
        } catch (error) {
            console.error('Error deleting store:', error);
            showToast(`Failed to delete store: ${error.message}`, 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center px-1">
                <Store className="w-7 h-7 mr-3 text-orange-600" /> Store Management
            </h2>

            {/* Add New Store Form */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                <div className="flex items-center gap-2 border-b border-orange-100 pb-3 mb-2">
                    <Plus className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-gray-900">Add New Store</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Store Name *</label>
                        <input
                            type="text"
                            value={newStoreName}
                            onChange={(e) => setNewStoreName(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                            placeholder="e.g., FC Road"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Firm Name</label>
                        <input
                            type="text"
                            value={newStoreFirmName}
                            onChange={(e) => setNewStoreFirmName(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                            placeholder="e.g., Sujata Mastani FC Road"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Area Code</label>
                        <input
                            type="text"
                            value={newStoreAreaCode}
                            onChange={(e) => setNewStoreAreaCode(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
                            placeholder="e.g., FCR"
                        />
                    </div>
                </div>

                <button
                    onClick={handleAddStore}
                    disabled={isAdding}
                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 mt-2"
                >
                    {isAdding ? (
                        <Loader className="animate-spin w-5 h-5 mr-2" />
                    ) : (
                        <Plus className="w-5 h-5 mr-2" />
                    )}
                    Add Store
                </button>
            </div>

            {/* Existing Stores */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 px-1">Existing Stores ({Object.keys(stores).length})</h3>

                {Object.keys(stores).length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Store className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-medium">No stores added yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(stores).map(([storeId, storeData]) => (
                            <div key={storeId} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>

                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="font-bold text-lg text-gray-900">{storeData.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{storeId}</p>

                                        <div className="mt-3 space-y-1">
                                            {storeData.firmName && storeData.firmName !== storeData.name && (
                                                <p className="text-sm text-gray-600 flex items-center">
                                                    <span className="w-4 h-4 mr-1.5 opacity-50">🏢</span> {storeData.firmName}
                                                </p>
                                            )}
                                            {storeData.areaCode && (
                                                <p className="text-sm text-gray-600 flex items-center">
                                                    <span className="w-4 h-4 mr-1.5 opacity-50">📍</span> {storeData.areaCode}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteStore(storeId, storeData.name)}
                                        disabled={deletingId === storeId}
                                        className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        aria-label={`Delete ${storeData.name}`}
                                    >
                                        {deletingId === storeId ? (
                                            <Loader className="animate-spin w-5 h-5 text-red-600" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoreManagementView;
