import React, { useState } from 'react';
import { ArrowLeft, Store, Plus, Trash2, Edit2, Save, X, Loader, MapPin } from 'lucide-react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../services/firebase';
import { useOrders } from '../../context/OrdersContext';
import { useToast } from '../../context/ToastContext';

const StoreListView = ({ onBack }) => {
    const { stores } = useOrders();
    const { showToast, showConfirm } = useToast();

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        areaCode: '',
        firmName: ''
    });

    const resetForm = () => {
        setFormData({ id: '', name: '', areaCode: '', firmName: '' });
        setEditingStore(null);
    };

    const handleAddStore = async () => {
        if (!formData.name.trim()) {
            showToast('Store name is required', 'error');
            return;
        }

        const storeId = formData.id.trim() || formData.name.toLowerCase().replace(/\s+/g, '-');

        setIsLoading(true);
        try {
            const storeRef = doc(db, `artifacts/${appId}/public/data/stores`, storeId);
            await setDoc(storeRef, {
                name: formData.name.trim(),
                areaCode: formData.areaCode.trim(),
                firmName: formData.firmName.trim() || formData.name.trim(),
                createdAt: new Date().toISOString()
            });

            showToast('Store added successfully', 'success');
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Error adding store:', error);
            showToast('Failed to add store', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditStore = async () => {
        if (!formData.name.trim()) {
            showToast('Store name is required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const storeRef = doc(db, `artifacts/${appId}/public/data/stores`, editingStore);
            await setDoc(storeRef, {
                name: formData.name.trim(),
                areaCode: formData.areaCode.trim(),
                firmName: formData.firmName.trim() || formData.name.trim(),
            }, { merge: true });

            showToast('Store updated successfully', 'success');
            setEditingStore(null);
            resetForm();
        } catch (error) {
            console.error('Error updating store:', error);
            showToast('Failed to update store', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        const confirmed = await showConfirm({
            title: 'Delete Store',
            message: `Are you sure you want to delete "${storeName}"? This cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });

        if (confirmed) {
            try {
                const storeRef = doc(db, `artifacts/${appId}/public/data/stores`, storeId);
                await deleteDoc(storeRef);
                showToast('Store deleted', 'success');
            } catch (error) {
                console.error('Error deleting store:', error);
                showToast('Failed to delete store', 'error');
            }
        }
    };

    const startEdit = (storeId, store) => {
        setFormData({
            id: storeId,
            name: store.name,
            areaCode: store.areaCode || '',
            firmName: store.firmName || ''
        });
        setEditingStore(storeId);
    };

    const storesList = Object.entries(stores).sort((a, b) => a[1].name.localeCompare(b[1].name));

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button onClick={onBack} className="p-1 -ml-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold flex-1">Manage Stores</h1>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                <p className="text-sm text-gray-500 mb-4">{storesList.length} stores registered</p>

                {storesList.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center">
                        <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No stores yet</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium"
                        >
                            Add First Store
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {storesList.map(([storeId, store]) => (
                            <div key={storeId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                {editingStore === storeId ? (
                                    <div className="p-4 space-y-3">
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Store Name"
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        />
                                        <input
                                            type="text"
                                            value={formData.areaCode}
                                            onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                                            placeholder="Area / Location"
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        />
                                        <input
                                            type="text"
                                            value={formData.firmName}
                                            onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                                            placeholder="Firm Name (optional)"
                                            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingStore(null); resetForm(); }}
                                                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleEditStore}
                                                disabled={isLoading}
                                                className="flex-1 py-2 bg-orange-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                                            >
                                                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Store className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{store.name}</p>
                                            {store.areaCode && (
                                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {store.areaCode}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => startEdit(storeId, store)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteStore(storeId, store.name)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Store Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md animate-slideUp">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Add New Store</h3>
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Creamy World"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Area / Location</label>
                                <input
                                    type="text"
                                    value={formData.areaCode}
                                    onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                                    placeholder="e.g., Kothrud"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                                <input
                                    type="text"
                                    value={formData.firmName}
                                    onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                                    placeholder="Legal firm name (optional)"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Store ID (optional)</label>
                                <input
                                    type="text"
                                    value={formData.id}
                                    onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    placeholder="Auto-generated if empty"
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddStore}
                                disabled={isLoading}
                                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                Add Store
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreListView;
