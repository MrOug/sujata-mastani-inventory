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
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <Store className="w-6 h-6 mr-3 text-orange-600" /> Store Management
            </h2>

            {/* Add New Store Form */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-4">
                <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2">Add New Store</h3>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Store Name *</label>
                    <input
                        type="text"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600"
                        placeholder="e.g., FC Road"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Firm Name</label>
                    <input
                        type="text"
                        value={newStoreFirmName}
                        onChange={(e) => setNewStoreFirmName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600"
                        placeholder="e.g., Sujata Mastani FC Road"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Area Code</label>
                    <input
                        type="text"
                        value={newStoreAreaCode}
                        onChange={(e) => setNewStoreAreaCode(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600"
                        placeholder="e.g., FCR"
                    />
                </div>

                <button
                    onClick={handleAddStore}
                    disabled={isAdding}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition duration-200 flex items-center justify-center disabled:opacity-50"
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
                <h3 className="text-lg font-bold text-gray-900">Existing Stores ({Object.keys(stores).length})</h3>

                {Object.keys(stores).length === 0 ? (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center">
                        <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">No stores added yet</p>
                    </div>
                ) : (
                    Object.entries(stores).map(([storeId, storeData]) => (
                        <div key={storeId} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-900">{storeData.name}</p>
                                {storeData.firmName && storeData.firmName !== storeData.name && (
                                    <p className="text-sm text-gray-500">🏢 {storeData.firmName}</p>
                                )}
                                {storeData.areaCode && (
                                    <p className="text-xs text-gray-400">Code: {storeData.areaCode}</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleDeleteStore(storeId, storeData.name)}
                                disabled={deletingId === storeId}
                                className="p-2 rounded-full text-red-600 hover:bg-red-100 transition duration-150 disabled:opacity-50"
                                aria-label={`Delete ${storeData.name}`}
                            >
                                {deletingId === storeId ? (
                                    <Loader className="animate-spin w-5 h-5" />
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StoreManagementView;
