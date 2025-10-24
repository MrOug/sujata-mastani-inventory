import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import {
    User, Home, List, ShoppingCart, Loader, TrendingDown, LogOut, UserPlus, X, Store, Trash2, Edit, Plus, Package, Save, RefreshCw // Added icons
} from 'lucide-react';

// Import utility functions
import { validateStockData, validateUserCredentials, validateStoreData, RateLimiter, sanitizeInput } from './utils/validation-utils';
import { safeTransaction, retryOperation, DocumentCache } from './utils/firestore-utils';
import { storageBackup, recoverFromBackup } from './utils/storage-backup';
import { perfMonitor, getMemoryInfo, getNetworkSpeed } from './utils/performance-monitor';

// --- Global Constants and Firebase Setup ---

const appId = typeof __app_id !== 'undefined' ? __app_id : 'sujata-mastani-inventory';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyDZt6n1QSGLq_PyLDYQlayFwMK0Qv7gpmE", // Replace with your actual config if needed
    authDomain: "sujata-inventory.firebaseapp.com",
    projectId: "sujata-inventory",
    storageBucket: "sujata-inventory.appspot.com",
    messagingSenderId: "527916478889",
    appId: "1:527916478889:web:7043c7d45087ee452bd4b8",
    measurementId: "G-BC3JXRWDVH"
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Default structure if Firestore doc doesn't exist yet
const DEFAULT_STOCK_LIST_STRUCTURE = {
  MILKSHAKE: ['Mango', 'Rose', 'Pineapple'],
  'ICE CREAM': ['Mango', 'Pista', 'Vanilla'],
  TOPPINGS: ['Dry Fruit'],
  MISC: ['Ice Cream Dabee']
};

// --- Utility Functions ---

// UPDATED: Now uses the dynamic masterStockList
const getEmptyStock = (masterStockList) => {
  const stock = {};
  if (!masterStockList || typeof masterStockList !== 'object') {
      console.warn("getEmptyStock called with invalid masterStockList");
      return {}; // Return empty object if list is invalid
  }
  Object.keys(masterStockList).forEach(category => {
    // Ensure category value is an array before iterating
    if (Array.isArray(masterStockList[category])) {
        masterStockList[category].forEach(item => {
            // Ensure item is a string before creating key
            if (typeof item === 'string') {
               const key = `${category}-${item}`;
               stock[key] = 0;
            } else {
               console.warn(`Invalid item found in category ${category}:`, item);
            }
        });
    } else {
        console.warn(`Invalid category structure found for ${category}:`, masterStockList[category]);
    }
  });
  return stock;
};


const getTodayDate = () => new Date().toISOString().slice(0, 10);
const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
};

// --- Custom Components (Defined BEFORE App component) ---

const StockInput = ({ label, value, onChange, placeholder = '0' }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg mb-2 border border-gray-100">
        <label className="text-sm font-medium text-gray-800 w-1/2 overflow-hidden whitespace-nowrap text-ellipsis pr-2">{label}</label>
        <input
            type="number" min="0" step="0.01" value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder={placeholder}
            className="w-1/3 p-2 text-base text-right bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150 shadow-inner"
        />
    </div>
);

const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 relative border border-orange-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold font-display text-orange-700 border-b border-gray-200 pb-3 mb-4 sticky top-0 bg-white z-10">{title}</h3>
            <div className="modal-content">{children}</div>
            {onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-orange-600 transition-colors z-20">
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>
    </div>
);


const Toast = ({ message, type = 'success', onClose }) => {
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };
    useEffect(() => { const timer = setTimeout(onClose, 4000); return () => clearTimeout(timer); }, [onClose]);
    return (
        <div className="animate-slideInRight">
            <div className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}>
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-xl font-bold">{icons[type]}</div>
                <p className="flex-1 font-medium">{message}</p>
                <button onClick={onClose} className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition"><X className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">{toasts.map((toast) => <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />)}</div>
);


const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'orange' }) => {
    const colorClasses = { orange: 'bg-orange-600 hover:bg-orange-700', red: 'bg-red-600 hover:bg-red-700', green: 'bg-green-600 hover:bg-green-700' };
    return (
        <Modal title={title} onClose={onCancel}>
            <p className="text-gray-700 mb-6 text-base leading-relaxed whitespace-pre-wrap">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition duration-150">{cancelText}</button>
                <button onClick={onConfirm} className={`flex-1 py-3 ${colorClasses[confirmColor]} text-white font-bold rounded-xl transition duration-150 shadow-lg`}>{confirmText}</button>
            </div>
        </Modal>
    );
};

const LoadingSpinner = ({ text = "Initializing Secure App..." }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 text-orange-600">
        <Loader className="animate-spin w-10 h-10 mb-4 text-orange-600" />
        <p className="text-xl font-display text-gray-700">{text}</p>
    </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, minLength, required = true }) => (
    <label className="flex flex-col min-w-40 flex-1">
        <span className="text-sm font-semibold text-orange-700/80 leading-normal pb-2">{label}</span>
        <input
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900 transition-all duration-300"
            type={type} value={value} onChange={onChange} placeholder={placeholder} minLength={minLength} required={required}
        />
    </label>
);

const SelectField = ({ label, value, onChange, children }) => (
    <label className="flex flex-col min-w-40 flex-1">
        <span className="text-sm font-semibold text-orange-700/80 leading-normal pb-2">{label}</span>
        <select
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900 transition-all duration-300 appearance-none bg-no-repeat bg-right pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
            value={value} onChange={onChange}
        >
            {children}
        </select>
    </label>
);

// --- Admin Store Management Component ---
const StoreManagementView = ({ db, appId, stores, showToast, showConfirm }) => {
    const [newStoreName, setNewStoreName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddStore = async (e) => {
        e.preventDefault();
        if (!newStoreName.trim()) { showToast("Store name cannot be empty.", "error"); return; }
        setIsAdding(true);
        try {
            const validatedStore = validateStoreData({ name: newStoreName });
            const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
            await addDoc(storesColRef, { name: validatedStore.name, createdAt: new Date().toISOString() });
            showToast(`Store "${validatedStore.name}" added successfully!`, 'success');
            setNewStoreName('');
        } catch (error) { console.error("Error adding store:", error); showToast(`Failed: ${error.message}`, 'error'); }
        finally { setIsAdding(false); }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        try {
            const storeDocRef = doc(db, `artifacts/${appId}/public/data/stores`, storeId);
            await deleteDoc(storeDocRef);
            showToast(`Store "${storeName}" deleted successfully!`, 'success');
        } catch (error) { console.error("Error deleting store:", error); showToast(`Failed to delete store: ${error.message}`, 'error'); }
    };

    const handleDeleteClick = async (storeId, storeName) => {
        const confirmed = await showConfirm({ title: 'Delete Store', message: `Delete "${storeName}"? This cannot be undone.`, confirmText: 'Delete', cancelText: 'Cancel', confirmColor: 'red' });
        if (confirmed) { await handleDeleteStore(storeId, storeName); }
    };

     return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center"><Store className="w-6 h-6 mr-3 text-orange-600" /> Store Manager</h2>
            <p className="text-sm text-gray-600">Add or remove outlet locations.</p>
             <form onSubmit={handleAddStore} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-4 max-w-md mx-auto">
                 <InputField label="New Store Name" type="text" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="e.g., Kothrud Outlet"/>
                 <button type="submit" disabled={isAdding} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg"> {isAdding ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <Store className="w-5 h-5 mr-2" />} Add New Store </button>
             </form>
             <div className="pt-4">
                 <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">Current Stores ({Object.keys(stores).length})</h3>
                 <ul className="space-y-2">
                     {Object.entries(stores).sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB)).map(([id, name]) => ( <li key={id} className="p-3 bg-white rounded-lg border border-gray-100 flex justify-between items-center text-gray-900"> <span className="flex-1">{name}</span> <div className="flex items-center space-x-3"> <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full hidden sm:inline">{id}</span> <button onClick={() => handleDeleteClick(id, name)} className="p-1 rounded-full text-red-600 hover:bg-red-100 transition duration-150" aria-label={`Delete ${name}`}> <Trash2 className="w-5 h-5" /> </button> </div> </li> ))}
                 </ul>
             </div>
        </div>
    );
};


// --- Admin User Management Component ---
const AdminUserManagementView = ({ db, appId, stores, auth, exportStockData, showToast }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('staff');
    const [storeId, setStoreId] = useState(Object.keys(stores)[0] || ''); // Handle empty stores
    const [isCreating, setIsCreating] = useState(false);

     useEffect(() => {
        // Update selected storeId if stores change and the current one is invalid
        if (Object.keys(stores).length > 0 && !stores[storeId]) {
            setStoreId(Object.keys(stores)[0]);
        } else if (Object.keys(stores).length === 0) {
            setStoreId('');
        }
    }, [stores, storeId]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!storeId && Object.keys(stores).length > 0) {
            showToast("Please select a store for the user.", "error");
            return;
        }
        setIsCreating(true);
        const validationErrors = validateUserCredentials(username, password);
        if (validationErrors.length > 0) { showToast(validationErrors.join(', '), 'error'); setIsCreating(false); return; }
        try {
            const fakeEmail = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
            const newUser = userCredential.user;
            const userConfigRef = doc(db, `artifacts/${appId}/users/${newUser.uid}/user_config`, 'profile');
            await setDoc(userConfigRef, { role: role, storeId: storeId || null, username: username.trim() }, { merge: true });
            showToast(`User ${username} created successfully!`, 'success');
            setUsername(''); setPassword('');
        } catch (error) { console.error("Error creating user:", error); showToast(`Failed: ${error.message.replace('Firebase: Error (auth/', '').replace(').', '')}`, 'error'); }
        finally { setIsCreating(false); }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center"><UserPlus className="w-6 h-6 mr-3 text-orange-600" /> User Manager</h2>
            <p className="text-sm text-gray-600">Create accounts and assign stores.</p>
            <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-6 max-w-md mx-auto">
                 <div className="flex flex-col gap-4"> <InputField label="Username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., staff.kothrud"/> <InputField label="Password (Min 6 chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" minLength="6"/> </div>
                 <div className="flex space-x-4"> <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)}> <option value="staff">Staff</option> <option value="admin">Admin</option> </SelectField> <SelectField label="Store" value={storeId} onChange={(e) => setStoreId(e.target.value)}> {Object.entries(stores).length > 0 ? Object.entries(stores).sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB)).map(([id, name]) => ( <option key={id} value={id}>{name}</option> )) : <option disabled value="">No stores available</option>} </SelectField> </div>
                 <button type="submit" disabled={isCreating || Object.keys(stores).length === 0} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg"> {isCreating ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />} Create User Account </button>
             </form>
             <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-md mx-auto"> <h3 className="text-lg font-bold text-gray-900 mb-3">Data Export</h3> <p className="text-sm text-gray-600 mb-4">Export stock data as JSON.</p> <button onClick={exportStockData} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/40 transition duration-200 flex items-center justify-center text-lg"> 📊 Export Stock Data </button> </div>
        </div>
    );
};

// --- Item Management Component ---
const ItemManagerView = ({ db, appId, masterStockList: initialMasterStockList, showToast, showConfirm }) => {
    // Local state for edits, only save to Firestore on explicit save action
    const [localList, setLocalList] = useState(() => JSON.parse(JSON.stringify(initialMasterStockList))); // Deep copy for local edits
    const [isSavingList, setIsSavingList] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null); // { oldName: string, newName: string } | null
    const [editingItem, setEditingItem] = useState(null); // { category: string, oldName: string, newName: string } | null

    // Reset local state if the initial list changes (e.g., Firestore update via snapshot)
    useEffect(() => {
        setLocalList(JSON.parse(JSON.stringify(initialMasterStockList)));
    }, [initialMasterStockList]);

    // Save the entire local list structure to Firestore
    const handleSaveMasterList = async () => {
        setIsSavingList(true);
        try {
            // Basic validation
            let hasEmptyCat = false;
            let hasEmptyItem = false;
            const validatedList = {}; // Build a new validated list to ensure order and cleanliness
             // Sort categories alphabetically before saving
            const sortedCategories = Object.keys(localList).sort((a, b) => a.localeCompare(b));

            for (const cat of sortedCategories) {
                 const trimmedCat = cat.trim();
                 if (!trimmedCat) {
                     hasEmptyCat = true;
                     continue; // Skip empty categories
                 }
                if (!Array.isArray(localList[cat])) throw new Error(`Invalid structure for category: ${cat}`);
                
                 // Sort items within each category and filter out empty ones
                const validItems = localList[cat]
                    .map(item => typeof item === 'string' ? item.trim() : '')
                    .filter(item => item) // Remove empty strings
                    .sort((a, b) => a.localeCompare(b)); 

                if (localList[cat].length > validItems.length) {
                    hasEmptyItem = true; // Flag if any items were removed
                }
                
                validatedList[trimmedCat] = validItems; 
            }
             
            if (hasEmptyCat) { showToast('Empty category names were removed.', 'warning'); }
            if (hasEmptyItem) { showToast('Empty item names were removed.', 'warning'); }
            if (Object.keys(validatedList).length === 0) { throw new Error("The list cannot be empty. Add at least one category and item."); }

            const listDocRef = doc(db, `artifacts/${appId}/public/data/master_stock_list`, 'current');
            await setDoc(listDocRef, { list: validatedList }, { merge: false }); // Overwrite with validated list
            setLocalList(validatedList); // Update local state to match saved state
            showToast('Master item list saved successfully!', 'success');
        } catch (error) {
            console.error("Error saving master list:", error);
            showToast(`Save failed: ${error.message}`, 'error');
        } finally {
            setIsSavingList(false);
            setEditingCategory(null);
            setEditingItem(null);
        }
    };

    // Add Category (locally)
    const handleAddCategory = (e) => {
        e.preventDefault();
        const sanitizedCategory = sanitizeInput(newCategoryName.trim().toUpperCase());
        if (!sanitizedCategory) { showToast('Category name empty.', 'error'); return; }
        if (localList[sanitizedCategory]) { showToast(`Category "${sanitizedCategory}" exists.`, 'warning'); return; }
        setLocalList(prev => ({ ...prev, [sanitizedCategory]: [] }));
        setNewCategoryName('');
    };

    // Start Editing Category Name
    const startEditCategory = (catName) => {
        setEditingCategory({ oldName: catName, newName: catName });
        setEditingItem(null); 
    };
    
    // Update Category Name input (locally)
    const handleCategoryNameChange = (newName) => {
        if (!editingCategory) return;
        setEditingCategory(prev => ({ ...prev, newName: newName })); 
    };

    // Save Edited Category Name (locally)
    const saveCategoryRename = () => {
        if (!editingCategory) return;
        const oldName = editingCategory.oldName;
        const newName = sanitizeInput(editingCategory.newName.trim().toUpperCase()); 
        
        if (!newName) { showToast('Category name cannot be empty.', 'error'); return; }
        if (newName === oldName) { setEditingCategory(null); return; } 
        // Check case-insensitively if the new name exists (excluding the old name)
        if (Object.keys(localList).some(key => key.toLowerCase() === newName.toLowerCase() && key !== oldName)) {
            showToast(`Category "${newName}" already exists (case-insensitive).`, 'error'); return; 
        }

        // Create new list preserving order as much as possible
        const updatedListOrdered = {};
        Object.keys(localList).forEach(key => {
            if (key === oldName) {
                updatedListOrdered[newName] = localList[oldName];
            } else {
                updatedListOrdered[key] = localList[key];
            }
        });
        
        setLocalList(updatedListOrdered);
        setEditingCategory(null);
    };
    
    // Cancel Category Edit
    const cancelCategoryEdit = () => setEditingCategory(null);

    // Delete Category (locally)
    const handleDeleteCategory = async (categoryToDelete) => {
        const confirmed = await showConfirm({ title: 'Delete Category', message: `Delete "${categoryToDelete}" and ALL its items?`, confirmText: 'Delete', confirmColor: 'red' });
        if (!confirmed) return;
        const { [categoryToDelete]: _, ...rest } = localList; 
        setLocalList(rest);
         if (editingCategory?.oldName === categoryToDelete) setEditingCategory(null); 
    };

    // Add Item (locally)
    const handleAddItem = (e, category) => {
        e.preventDefault();
        const sanitizedItem = sanitizeInput(newItemName.trim());
        if (!sanitizedItem) { showToast('Item name empty.', 'error'); return; }
        const currentItems = localList[category] || [];
        if (currentItems.map(item => item.toLowerCase()).includes(sanitizedItem.toLowerCase())) { 
            showToast(`Item "${sanitizedItem}" exists in ${category} (case-insensitive).`, 'warning'); return; 
        }
        setLocalList(prev => ({ ...prev, [category]: [...currentItems, sanitizedItem].sort((a,b) => a.localeCompare(b)) })); 
        setNewItemName('');
    };

     // Start Editing Item Name
    const startEditItem = (category, itemName) => {
        setEditingItem({ category: category, oldName: itemName, newName: itemName });
        setEditingCategory(null); 
    };

    // Update Item Name input (locally)
    const handleItemNameChange = (newName) => {
        if (!editingItem) return;
        setEditingItem(prev => ({ ...prev, newName: newName }));
    };

    // Save Edited Item Name (locally)
    const saveItemRename = () => {
         if (!editingItem) return;
         const { category, oldName } = editingItem;
         const newName = sanitizeInput(editingItem.newName.trim()); 

         if (!newName) { showToast('Item name cannot be empty.', 'error'); return; }
         if (newName === oldName) { setEditingItem(null); return; } 

         const currentItems = localList[category] || [];
         if (currentItems.map(item => item.toLowerCase()).filter(item => item !== oldName.toLowerCase()).includes(newName.toLowerCase())) { 
             showToast(`Item "${newName}" already exists in ${category} (case-insensitive).`, 'error'); return; 
         }

         const updatedItems = currentItems.map(item => item === oldName ? newName : item).sort((a,b) => a.localeCompare(b)); 
         setLocalList(prev => ({ ...prev, [category]: updatedItems }));
         setEditingItem(null);
    };
    
    // Cancel Item Edit
    const cancelItemEdit = () => setEditingItem(null);

    // Delete Item (locally)
    const handleDeleteItem = async (category, itemToDelete) => {
        const confirmed = await showConfirm({ title: 'Delete Item', message: `Delete "${itemToDelete}" from "${category}"?`, confirmText: 'Delete', confirmColor: 'red'});
        if (!confirmed) return;
        const currentItems = localList[category] || [];
        const updatedItems = currentItems.filter(item => item !== itemToDelete); 
        setLocalList(prev => ({ ...prev, [category]: updatedItems }));
        if (editingItem?.oldName === itemToDelete && editingItem?.category === category) setEditingItem(null); 
    };

    // Discard local changes and revert to Firestore state
    const handleDiscardChanges = async () => {
         const confirmed = await showConfirm({ title: 'Discard Changes', message: `Revert all unsaved changes?`, confirmText: 'Discard', confirmColor: 'orange'});
         if (!confirmed) return;
        setLocalList(JSON.parse(JSON.stringify(initialMasterStockList)));
        setEditingCategory(null);
        setEditingItem(null);
        showToast('Changes discarded.', 'info');
    };
    
    // Check if there are unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        // Compare sorted versions to ignore order differences during check
         const sortList = (list) => {
             const sorted = {};
             Object.keys(list).sort().forEach(cat => {
                 sorted[cat] = [...(list[cat] || [])].sort();
             });
             return sorted;
         };
         return JSON.stringify(sortList(localList)) !== JSON.stringify(sortList(initialMasterStockList));
    }, [localList, initialMasterStockList]);

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center"><Package className="w-6 h-6 mr-3 text-orange-600" /> Item Manager</h2>
            <p className="text-sm text-gray-600">Add, rename, or delete categories and items. Changes are local until saved.</p>

            {/* Save/Discard Buttons - Sticky */}
             <div className="sticky top-[73px] z-20 bg-gradient-to-b from-gray-50 via-gray-50/80 to-transparent py-3 flex gap-3 -mx-4 px-4 border-b border-gray-200">
                 <button onClick={handleSaveMasterList} disabled={isSavingList || !hasUnsavedChanges} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg">
                    {isSavingList ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />} Save All Changes
                </button>
                 <button onClick={handleDiscardChanges} disabled={isSavingList || !hasUnsavedChanges} className="flex-1 py-3 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-xl shadow transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg">
                    <RefreshCw className="w-5 h-5 mr-2" /> Discard Changes
                </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="bg-white p-6 rounded-xl shadow border border-gray-100 space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Add New Category</h3>
                <InputField label="Category Name (e.g., BEVERAGES)" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Enter category name"/>
                 <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-200 flex items-center justify-center"><Plus className="w-5 h-5 mr-1" /> Add Category</button>
            </form>
            
            <hr className="my-6 border-gray-200"/>

            {/* Manage Categories and Items */}
            <div className="space-y-4">
                 <h3 className="text-lg font-bold text-gray-800 mb-2">Manage Items</h3>
                 {Object.keys(localList).length === 0 && <p className="text-gray-500 italic">No categories yet. Add one above to start.</p>}
                 {Object.keys(localList).sort().map(category => ( // Sort categories for display
                     <div key={category} className="bg-white p-4 rounded-xl shadow border border-gray-100 space-y-3">
                         {/* Category Header */}
                         <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
                             {editingCategory?.oldName === category ? (
                                 <div className="flex-1 flex gap-2 items-center mr-2">
                                     <input type="text" value={editingCategory.newName} onChange={(e) => handleCategoryNameChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveCategoryRename()} className="text-lg font-bold text-orange-700 bg-orange-50 border border-orange-300 rounded px-2 py-1 flex-1" autoFocus/>
                                     <button onClick={saveCategoryRename} className="p-1 text-green-600 hover:bg-green-100 rounded shrink-0" title="Save"><Save className="w-5 h-5" /></button>
                                     <button onClick={cancelCategoryEdit} className="p-1 text-gray-500 hover:bg-gray-100 rounded shrink-0" title="Cancel"><X className="w-5 h-5" /></button>
                                 </div>
                             ) : (
                                <h4 className="text-lg font-bold text-orange-700 flex-1 truncate mr-2">{category}</h4>
                             )}
                             <div className="flex gap-1 shrink-0">
                                 {editingCategory?.oldName !== category && <button onClick={() => startEditCategory(category)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit Category Name"><Edit className="w-4 h-4" /></button>}
                                 <button onClick={() => handleDeleteCategory(category)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete Category"><Trash2 className="w-4 h-4" /></button>
                             </div>
                         </div>

                         {/* Add Item Form (Only show if not editing category) */}
                         {editingCategory?.oldName !== category && (
                            <form onSubmit={(e) => handleAddItem(e, category)} className="flex gap-2 items-end">
                                <InputField label={`Add item to ${category}`} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="New item name" required={false} />
                                <button type="submit" className="py-2 px-4 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition duration-200 flex items-center justify-center shrink-0">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </form>
                         )}

                         {/* List Items */}
                         <ul className="space-y-1 max-h-60 overflow-y-auto pr-2 border-t border-gray-100 pt-3">
                              {(localList[category] || []).map(item => ( // Items are sorted on add/rename
                                 <li key={`${category}-${item}`} className="p-2 bg-gray-50 rounded-md border border-gray-200 flex justify-between items-center text-gray-800 text-sm group min-h-[40px]">
                                     {editingItem?.category === category && editingItem?.oldName === item ? (
                                         <div className="flex-1 flex gap-1 items-center mr-1">
                                             <input type="text" value={editingItem.newName} onChange={(e) => handleItemNameChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveItemRename()} className="bg-gray-100 border border-gray-300 rounded px-1 py-0.5 flex-1 text-sm" autoFocus/>
                                             <button onClick={saveItemRename} className="p-1 text-green-500 hover:bg-green-100 rounded shrink-0" title="Save"><Save className="w-4 h-4" /></button>
                                             <button onClick={cancelItemEdit} className="p-1 text-gray-500 hover:bg-gray-100 rounded shrink-0" title="Cancel"><X className="w-4 h-4" /></button>
                                         </div>
                                     ) : (
                                         <>
                                             <span className="flex-1 truncate group-hover:text-orange-700 mr-1">{item}</span>
                                             <div className="flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                 <button onClick={() => startEditItem(category, item)} className="p-1 text-blue-500 hover:bg-blue-100 rounded" title="Edit Item Name"><Edit className="w-4 h-4" /></button>
                                                 <button onClick={() => handleDeleteItem(category, item)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Delete Item"><Trash2 className="w-4 h-4" /></button>
                                             </div>
                                         </>
                                     )}
                                 </li>
                             ))}
                             {(localList[category]?.length || 0) === 0 && <li className="text-gray-500 text-sm italic py-2">No items in this category yet.</li>}
                         </ul>
                     </div>
                 ))}
            </div>
        </div>
    );
};

// --- Stock Management Components ---

const StockEntryView = ({ storeId, stockData, setStockData, saveStock, isSaving, selectedDate, setSelectedDate, showToast, masterStockList }) => {
    // ... (handleSave, handleDateChange - corrected toast logic)
     const handleSave = async () => { try { await saveStock(); showToast('Stock saved successfully!', 'success'); } catch (e) { if (e.message !== "Save cancelled by user.") { showToast(e.message || 'Error saving stock.', 'error'); } console.error("Save stock error:", e); } };
     const handleDateChange = (e) => { const newDate = e.target.value; if (newDate > getTodayDate()) { showToast('Cannot select future dates', 'warning'); return; } setSelectedDate(newDate); };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Closing Stock Entry</h2>
            <p className="text-sm text-gray-600">Enter stock for **{storeId}** on {selectedDate}.</p>
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100"> <label className="block text-sm font-medium text-gray-700 mb-2"> Select Date </label> <input type="date" value={selectedDate} max={getTodayDate()} onChange={handleDateChange} className="w-full p-3 text-base bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition duration-150"/> <p className="text-xs text-gray-500 mt-1">Maximum date: Today ({getTodayDate()})</p> </div>

            <div className="space-y-4">
                {Object.keys(masterStockList).sort().map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">{category}</h3>
                        <div className="space-y-2">
                            {masterStockList[category]?.sort().map(item => { // Sort items alphabetically
                                const key = `${category}-${item}`;
                                return ( <StockInput key={key} label={item} value={stockData[key]} onChange={(value) => setStockData(prev => ({ ...prev, [key]: value }))}/> );
                            })}
                            {(!masterStockList[category] || masterStockList[category].length === 0) && <p className="text-sm text-gray-500 italic">No items defined in this category.</p>}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 flex items-center justify-center disabled:opacity-50 text-xl font-display tracking-wide">
                {isSaving ? <Loader className="animate-spin w-6 h-6 mr-2" /> : <><List className="w-6 h-6 mr-2" /> Save Closing Stock</>}
            </button>
        </div>
    );
};

const StockSoldView = ({ currentStock, yesterdayStock, calculateSold, soldStockSummary, masterStockList }) => {
    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Stock Sold Report</h2>
            <div className="flex flex-col items-center justify-center rounded-xl shadow-lg bg-white border border-gray-100 p-6"> <p className="text-base font-semibold text-gray-600 font-display">TOTAL UNITS SOLD TODAY</p> <p className="text-6xl font-extrabold font-display text-orange-600 mt-1">{soldStockSummary}</p> <p className="text-xs text-gray-400 mt-2">Data as of {getTodayDate()}</p> </div> <p className="text-sm text-gray-500"> Calculation: Yesterday's Closing Stock - Today's Current Stock. </p>

            <div className="space-y-4">
                {Object.keys(masterStockList).sort().map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-red-600 border-b border-red-200 pb-2 mb-3">{category}</h3>
                        <div className="space-y-2">
                            {masterStockList[category]?.sort().map(item => { // Sort items
                                const key = `${category}-${item}`;
                                const sold = calculateSold(category, item);
                                const current = currentStock[key] || 0;
                                const yesterday = yesterdayStock[key] || 0;
                                const isLoss = sold < 0;
                                const cardClass = isLoss ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';
                                const soldColor = isLoss ? 'text-red-700' : 'text-orange-600';
                                return ( <div key={key} className={`flex items-center justify-between p-3 rounded-lg border ${cardClass}`}> <div className="flex-1"> <p className="text-base font-semibold text-gray-900">{item}</p> <p className="text-xs text-gray-500">Yst: {yesterday} | Cur: {current}</p> </div> <div className="shrink-0 text-right"> <p className={`text-2xl font-bold font-display ${soldColor}`}>{sold}</p> <p className="text-xs text-gray-500">{isLoss ? 'LOSS/ERROR' : 'SOLD'}</p> </div> </div> );
                            })}
                             {(!masterStockList[category] || masterStockList[category].length === 0) && <p className="text-sm text-gray-500 italic">No items defined in this category.</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const OrderingView = ({ currentStock, orderQuantities, setOrderQuantities, generateOrderOutput, showToast, masterStockList }) => {
    // ... (handleOutput, state - unchanged)
     const [showOutputModal, setShowOutputModal] = useState(false);
     const handleOutput = () => { const output = generateOrderOutput(); const textArea = document.createElement("textarea"); textArea.value = output; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); showToast('Order list copied!', 'success'); } catch (err) { showToast('Failed to copy.', 'error'); } document.body.removeChild(textArea); setShowOutputModal(true); };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Order Management</h2>
            <p className="text-sm text-gray-600">Enter required quantity. Current stock shown.</p>

            <div className="space-y-4">
                {Object.keys(masterStockList).sort().map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">{category} (Order Qty)</h3>
                        <div className="space-y-2">
                            {masterStockList[category]?.sort().map(item => { // Sort items
                                const key = `${category}-${item}`;
                                const current = currentStock[key] || 0;
                                return ( <div key={key} className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200`}> <div className="w-1/2"> <p className="text-base font-semibold text-gray-900">{item}</p> <p className="text-xs text-orange-600">Current Stock: {current}</p> </div> <input type="number" min="0" step="0.01" value={orderQuantities[key] || ''} onChange={(e) => setOrderQuantities(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))} placeholder="Order" className="w-1/3 p-2 text-base text-right bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150 shadow-sm" /> </div> );
                            })}
                             {(!masterStockList[category] || masterStockList[category].length === 0) && <p className="text-sm text-gray-500 italic">No items defined in this category.</p>}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={handleOutput} className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 flex items-center justify-center text-xl font-display tracking-wide"> <ShoppingCart className="w-6 h-6 mr-2" /> Generate & Copy </button>
             {showOutputModal && ( <Modal title="Order List Output" onClose={() => setShowOutputModal(false)}> <p className="text-sm mb-4 text-gray-700">Copied to clipboard. Copy manually below if needed.</p> <pre className="p-4 bg-gray-50 text-gray-900 text-sm overflow-x-scroll rounded-lg border border-gray-300 font-mono">{generateOrderOutput()}</pre> <button onClick={() => { const output = generateOrderOutput(); const textArea = document.createElement("textarea"); textArea.value = output; document.body.appendChild(textArea); textArea.select(); try { document.execCommand('copy'); showToast('Re-copied!', 'success'); } catch (err) { showToast('Copy failed.', 'error'); } document.body.removeChild(textArea); }} className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition duration-200"> Copy Again </button> </Modal> )}
        </div>
    );
};

// --- Auth Modal ---
const AuthModal = ({ auth, onLoginSuccess, onClose, isFirstUser }) => {
    // ... (Implementation unchanged - assume correct)
    const [isRegister, setIsRegister] = useState(isFirstUser); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => { e.preventDefault(); setError(''); setIsLoading(true); if (password.length < 6) { setError("Password must be >= 6 chars."); setIsLoading(false); return; } try { const fakeEmail = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`; if (isRegister) { const uc = await createUserWithEmailAndPassword(auth, fakeEmail, password); onLoginSuccess(uc.user, username.trim()); } else { const uc = await signInWithEmailAndPassword(auth, fakeEmail, password); onLoginSuccess(uc.user, username.trim()); } } catch (err) { console.error("Auth Error:", err); setError(err.message.replace('Firebase: Error (auth/', '').replace(').', '')); } finally { setIsLoading(false); } };
    return ( <Modal title={isRegister ? "Admin Registration" : "Login"} onClose={onClose}> <p className="text-sm text-gray-600 mb-6">{isRegister ? "Register the first Super Admin." : "Enter username and password."}</p> <form onSubmit={handleSubmit} className="space-y-4"> <div className="relative"> <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /> <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full p-3 h-12 border border-gray-300 rounded-lg pl-10 focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150"/> </div> <div className="relative"> <List className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /> <input type="password" placeholder="Password (Min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" className="w-full p-3 h-12 border border-gray-300 rounded-lg pl-10 focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150"/> </div> {error && <p className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">{error}</p>} <button type="submit" disabled={isLoading} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg font-display"> {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : (isRegister ? "Register Admin" : "Log In")} </button> </form> <button onClick={() => { setIsRegister(p => !p); setError(''); }} className="w-full mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium" disabled={isLoading}> {isRegister ? "Already have account? Log In" : "Register first Admin? Sign Up"} </button> </Modal> );
};

// --- Error Display ---
const ErrorDisplay = ({ error, onRetry, onDismiss }) => ( <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"> <div className="w-full max-w-md"> <div className="bg-white rounded-xl shadow-xl border-t-4 border-red-500 p-6 text-center"> <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto mb-4"><X className="w-8 h-8" /></div> <h2 className="text-xl font-bold text-gray-900 mb-2">Error Occurred</h2> <p className="text-gray-600 mb-4">{error.message}</p> <div className="text-xs text-gray-500 mb-4"><p>Context: {error.context}</p><p>Time: {new Date(error.timestamp).toLocaleString()}</p></div> <div className="flex gap-3"> {error.retryable && (<button onClick={onRetry} className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-150">Reload App</button>)} <button onClick={onDismiss} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-150">Dismiss</button> </div> </div> </div> </div> );

// --- Process Flow Display ---
const ProcessFlowDisplay = ({ step }) => { const steps = { initializing: { text: 'Initializing...', color: 'blue' }, authenticating: { text: 'Login required', color: 'orange' }, 'loading-data': { text: 'Loading data...', color: 'yellow' }, ready: { text: 'Ready', color: 'green' }, error: { text: 'Error', color: 'red' } }; const currentStep = steps[step] || steps.initializing; return ( <div className="fixed top-4 left-4 bg-white rounded-lg shadow p-2 z-50 text-xs flex items-center gap-2"> <div className={`w-2 h-2 rounded-full bg-${currentStep.color}-500`}></div> <span className="font-medium text-gray-700">{currentStep.text}</span> </div> ); };

// --- Home/Selector View ---
const HomeView = ({ role, userStoreId, stores, setView, setSelectedStoreId, userId }) => (
    <div className="p-4 space-y-6">
         <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100"> <h2 className="text-3xl font-bold font-display text-orange-600 mb-1">Sujata Mastani</h2> <p className="text-gray-600 text-sm">Logged in as {role.toUpperCase()}. Select outlet.</p> </div>
        <div className="space-y-4">
            {Object.keys(stores).length > 0 ? ( Object.entries(stores).sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB)).map(([id, name]) => { const isAssignedToStore = role === 'admin' || userStoreId === id; if (role === 'staff' && userStoreId !== id) return null; return ( <div key={id} className={`bg-white rounded-xl p-4 shadow-lg transition-shadow hover:shadow-xl border-l-4 ${ isAssignedToStore ? 'border-orange-600' : 'border-gray-300 opacity-80' }`}> <div className="flex items-center gap-3"> <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600"> <Home className="w-5 h-5" /> </div> <div className="flex-1"> <p className="font-display text-lg font-bold text-gray-900">{name}</p> {role === 'staff' && <span className="text-xs font-semibold text-green-600">Your Store</span>} </div> </div> <div className="border-t border-gray-200 mt-3 pt-3"> <div className="flex flex-wrap gap-3"> <button onClick={() => { setSelectedStoreId(id); setView('entry'); }} className="flex flex-1 items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-700 min-w-[120px]"> <List className="w-4 h-4 mr-2" /> Stock Entry </button> {role === 'admin' && ( <button onClick={() => { setSelectedStoreId(id); setView('admin'); }} className="flex flex-1 items-center justify-center rounded-lg border border-orange-600/50 bg-white px-4 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50 min-w-[120px]"> <User className="w-4 h-4 mr-2" /> Admin </button> )} </div> </div> </div> ); }) ) : ( <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center"> <div className="flex flex-col items-center gap-4"> <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Store className="w-8 h-8" /></div> <div> <h3 className="font-display text-xl font-bold text-gray-900 mb-2">No Stores Found</h3> <p className="text-gray-600 mb-4"> {role === 'admin' ? 'Create first store via Store Manager.' : 'Contact admin.'} </p> {role === 'admin' && ( <button onClick={() => setView('storemanager')} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 shadow-md flex items-center justify-center mx-auto"> <Store className="w-5 h-5 mr-2" /> Create Store </button> )} </div> </div> </div> )}
        </div>
        <p className="text-xs text-gray-500 pt-4 border-t border-gray-200 mt-4">User ID: {userId || 'N/A'}</p>
    </div>
);

 // --- Admin Functions View ---
const AdminFunctionsView = ({ stores, selectedStoreId, setView }) => {
    const storeName = stores[selectedStoreId] || 'Selected Store';
    const AdminButton = ({ icon: Icon, label, viewName }) => ( <button onClick={() => setView(viewName)} className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg transition-shadow hover:shadow-xl border-l-4 border-orange-600 text-center w-full"> <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 mb-3"><Icon className="w-6 h-6" /></div> <p className="font-display text-lg font-bold text-gray-900">{label}</p> </button> );
    return ( <div className="p-4 space-y-6"> <div className="text-center p-4 bg-white rounded-xl shadow-lg border-b-4 border-orange-600"> <h2 className="text-2xl font-bold font-display text-gray-900">Admin Functions</h2> <p className="text-gray-600 text-sm">for {storeName}</p> </div> <div className="grid grid-cols-2 gap-4"> <AdminButton icon={ShoppingCart} label="Order" viewName="order" /> <AdminButton icon={TrendingDown} label="Sold Report" viewName="sold" /> <AdminButton icon={UserPlus} label="User Manager" viewName="usermanager" /> <AdminButton icon={Store} label="Store Manager" viewName="storemanager" /> <AdminButton icon={Package} label="Item Manager" viewName="itemmanager" /> </div> </div> );
};

 // --- Navigation Bar ---
const NavBar = ({ currentView, role, selectedStoreId, setView, setSelectedStoreId }) => {
    const NavButton = ({ icon: Icon, label, active, onClick, disabled }) => ( <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center p-1 transition duration-200 flex-1 ${ active ? 'text-orange-600 font-bold' : 'text-gray-500 hover:text-orange-500' } ${disabled ? 'opacity-50' : ''}`}> <Icon className="w-6 h-6" /> <span className="text-[10px] mt-0.5">{label}</span> </button> );
    return ( <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] border-t border-gray-200"> <nav className="flex justify-around items-center h-16 max-w-lg mx-auto"> <NavButton icon={Home} label="Home" active={currentView === 'home'} onClick={() => { setView('home'); setSelectedStoreId(''); }} /> {selectedStoreId && <NavButton icon={List} label="Entry" active={currentView === 'entry'} onClick={() => setView('entry')} />} {role === 'admin' && ( <> <NavButton icon={Store} label="Stores" active={currentView === 'storemanager'} onClick={() => setView('storemanager')} /> <NavButton icon={UserPlus} label="Users" active={currentView === 'usermanager'} onClick={() => setView('usermanager')} /> <NavButton icon={Package} label="Items" active={currentView === 'itemmanager'} onClick={() => setView('itemmanager')} /> {selectedStoreId && ( <> <NavButton icon={TrendingDown} label="Sold" active={currentView === 'sold'} onClick={() => setView('sold')} /> <NavButton icon={ShoppingCart} label="Order" active={currentView === 'order'} onClick={() => setView('order')} /> </> )} </> )} </nav> </div> );
};

// --- Main Application Component ---

const App = () => {
    // --- State Declarations ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [role, setRole] = useState(null);
    const [userStoreId, setUserStoreId] = useState(null);
    const [stores, setStores] = useState({});
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isFirstUser, setIsFirstUser] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [view, setView] = useState('home');
    const [isSaving, setIsSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState(null);
    const [processStep, setProcessStep] = useState('initializing');
    const [storesLoaded, setStoresLoaded] = useState(false);
    const [masterStockListLoaded, setMasterStockListLoaded] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentStock, setCurrentStock] = useState({});
    const [yesterdayStock, setYesterdayStock] = useState({});
    const [orderQuantities, setOrderQuantities] = useState({});
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [masterStockList, setMasterStockList] = useState({});

    // --- Error Handling ---
    const handleError = (error, context = 'Unknown') => { console.error(`Error in ${context}:`, error); setError({ message: error.message || 'An unexpected error occurred', context, timestamp: new Date().toISOString(), retryable: !['permission-denied', 'unauthenticated', 'invalid-argument'].includes(error?.code) }); setProcessStep('error'); };
    const clearError = () => { setError(null); if (userId && storesLoaded && masterStockListLoaded) setProcessStep('ready'); };

    // --- Effects (Initialization, Auth, Listeners) ---

    // 1. Firebase Initialization & Auth Listener
    useEffect(() => {
        let unsubscribeAuth = () => {}; // Initialize with empty function
        const initializeFirebase = async () => {
             try {
                setProcessStep('initializing');
                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const authentication = getAuth(app);
                setDb(firestore); setAuth(authentication); setIsInitializing(false);

                const setupDocRef = doc(firestore, `artifacts/${appId}/public`, 'config');
                const setupDocSnap = await getDoc(setupDocRef);
                const isFirstRun = !setupDocSnap.exists();
                setIsFirstUser(isFirstRun); console.log("Is this the first user signup?", isFirstRun);

                const fetchUserProfile = async (user, username = null) => { try { if (!user || user.isAnonymous) { setRole(null); setUserStoreId(null); return; } setUserId(user.uid); const roleDocRef = doc(firestore, `artifacts/${appId}/users/${user.uid}/user_config`, 'profile'); const roleSnap = await getDoc(roleDocRef); if (roleSnap.exists()) { setRole(roleSnap.data().role); setUserStoreId(roleSnap.data().storeId || null); } else if (isFirstRun) { const defaultRole = 'admin'; await setDoc(roleDocRef, { role: defaultRole, username: username || user.email?.split('@')[0] || 'admin_user' }, { merge: true }); setRole(defaultRole); setUserStoreId(null); } else { console.warn("User profile not found, might need admin creation."); setRole(null); } } catch (error) { handleError(error, 'User Profile Fetch'); } };
                
                unsubscribeAuth = onAuthStateChanged(authentication, async (user) => {
                    try {
                        if (!user) {
                           setUserId(null); setRole(null); setUserStoreId(null); setShowAuthModal(true); setProcessStep('authenticating'); setIsAuthReady(true); return;
                        }
                        setUserId(user.uid); setShowAuthModal(false); setProcessStep('loading-data');
                        await fetchUserProfile(user); setIsAuthReady(true);
                        // Don't set ready yet, wait for stores and list
                    } catch (error) { handleError(error, 'Auth State Change'); }
                });
            } catch (error) { handleError(error, 'Firebase Init'); }
        };
        initializeFirebase();
        return () => unsubscribeAuth(); // Cleanup listener on unmount
    }, [appId]);

    // 2. Network Status Listener
    useEffect(() => { const handleOnline = () => setIsOnline(true); const handleOffline = () => setIsOnline(false); window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline); return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); }; }, []);

    // 3. Real-time Store Fetching
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !role) return; 
        const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
        const unsubscribeStores = onSnapshot(storesColRef, (snapshot) => { const newStores = {}; snapshot.forEach(doc => { newStores[doc.id] = doc.data().name; }); setStores(newStores); setStoresLoaded(true); console.log("Stores loaded:", Object.keys(newStores).length); if (masterStockListLoaded) setProcessStep('ready'); clearError(); }, (error) => { handleError(error, 'Store Fetch'); setStores({}); setStoresLoaded(true); });
        return () => unsubscribeStores();
    }, [db, appId, isAuthReady, userId, role, masterStockListLoaded]);

    // 4. Fetch Master Stock List from Firestore
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !role) return; 
        const listDocRef = doc(db, `artifacts/${appId}/public/data/master_stock_list`, 'current');
        const unsubscribeList = onSnapshot(listDocRef, (docSnap) => {
            let listToUse = DEFAULT_STOCK_LIST_STRUCTURE; 
            let needsUpdate = !docSnap.exists(); 
            if (docSnap.exists()) {
                const fetchedList = docSnap.data().list;
                if (fetchedList && typeof fetchedList === 'object' && Object.keys(fetchedList).length > 0) { listToUse = fetchedList; } 
                else { console.warn("Fetched master list empty/invalid."); needsUpdate = true; }
            } else { console.log("Master list doc not found."); }
            setMasterStockList(listToUse); 
            setCurrentStock(getEmptyStock(listToUse)); setYesterdayStock(getEmptyStock(listToUse)); setOrderQuantities(getEmptyStock(listToUse)); 
            setMasterStockListLoaded(true); 
            console.log("Master list loaded.");
            if (storesLoaded) setProcessStep('ready'); 
            clearError();
            if (needsUpdate && role === 'admin') { setDoc(listDocRef, { list: DEFAULT_STOCK_LIST_STRUCTURE }).catch(err => console.error("Failed to create default list:", err)); }
        }, (error) => {
            handleError(error, 'Master List Fetch'); console.warn("Error fetching master list, using default."); const defaultList = DEFAULT_STOCK_LIST_STRUCTURE; setMasterStockList(defaultList); setCurrentStock(getEmptyStock(defaultList)); setYesterdayStock(getEmptyStock(defaultList)); setOrderQuantities(getEmptyStock(defaultList)); setMasterStockListLoaded(true); if (storesLoaded) setProcessStep('ready'); 
        });
        return () => unsubscribeList();
    }, [db, appId, isAuthReady, userId, role, storesLoaded]);

    // 5. Set default admin storeId 
    useEffect(() => {
        if (role === 'admin' && !userStoreId && storesLoaded && Object.keys(stores).length > 0 && db && userId) {
            const defaultStoreId = Object.keys(stores)[0];
            const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
            updateDoc(roleDocRef, { storeId: defaultStoreId }).then(() => setUserStoreId(defaultStoreId)).catch(async (err) => { if (err.code === 'not-found') { try { await setDoc(roleDocRef, { role: 'admin', storeId: defaultStoreId, username: auth?.currentUser?.email?.split('@')[0] || 'admin_user' }, { merge: true }); setUserStoreId(defaultStoreId); } catch (createErr) { handleError(createErr, 'Admin Profile Creation'); } } else { handleError(err, 'Default Store Assign'); } });
        }
    }, [role, userStoreId, stores, storesLoaded, db, userId, appId, auth]);

    // 6. Update user's store if assigned store is deleted/invalid
    useEffect(() => {
        if (db && auth && userId && storesLoaded && Object.keys(stores).length > 0 && userStoreId && !stores[userStoreId]) {
            const newStoreId = Object.keys(stores)[0]; 
            const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
            updateDoc(roleDocRef, { storeId: newStoreId }).then(() => setUserStoreId(newStoreId)).catch(err => handleError(err, 'Store Reassignment'));
        }
    }, [stores, storesLoaded, db, auth, userId, appId, role, userStoreId]);

    // 7. Fetch Stock Data based on selected store and date
     const fetchStockData = useCallback(async (storeIdToFetch, dateToFetch) => { 
        if (!db || !storeIdToFetch || !masterStockListLoaded) return; 
        setLoadingData(true);
        const yesterdayDateToFetch = new Date(dateToFetch); yesterdayDateToFetch.setDate(yesterdayDateToFetch.getDate() - 1);
        const yesterdayDateString = yesterdayDateToFetch.toISOString().slice(0, 10);
        const emptyStock = getEmptyStock(masterStockList); 
        try {
            const todayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeIdToFetch}-${dateToFetch}`);
            const yesterdayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeIdToFetch}-${yesterdayDateString}`);
            const [todaySnap, yesterdaySnap] = await Promise.all([getDoc(todayDocRef), getDoc(yesterdayDocRef)]);
            
            const todayData = todaySnap.exists() ? todaySnap.data().stock : {};
            const yesterdayData = yesterdaySnap.exists() ? yesterdaySnap.data().stock : {};
            
            setCurrentStock({ ...emptyStock, ...todayData });
            setOrderQuantities({ ...emptyStock, ...todayData }); 
            setYesterdayStock({ ...emptyStock, ...yesterdayData });
            
        } catch (e) { handleError(e, "Stock Data Fetch"); setCurrentStock(emptyStock); setYesterdayStock(emptyStock); setOrderQuantities(emptyStock); } 
        finally { setLoadingData(false); }
    }, [db, appId, masterStockList, masterStockListLoaded]); 

    // Re-fetch when store OR date changes OR master list loads/changes
    useEffect(() => {
        if (db && userId && selectedStoreId && selectedDate && masterStockListLoaded) { 
            fetchStockData(selectedStoreId, selectedDate);
        } else if (masterStockListLoaded) { 
             const emptyStock = getEmptyStock(masterStockList); setCurrentStock(emptyStock); setYesterdayStock(emptyStock); setOrderQuantities(emptyStock);
         }
    }, [db, userId, selectedStoreId, selectedDate, fetchStockData, masterStockListLoaded, masterStockList]); 

    // 8. Staff Store Enforcement 
    useEffect(() => {
        if (role === 'staff' && storesLoaded && userStoreId && selectedStoreId !== userStoreId) {
            setSelectedStoreId(userStoreId); 
        }
         if (role === 'staff' && selectedStoreId && userStoreId && selectedStoreId !== userStoreId && view !== 'home') {
             setSelectedStoreId(userStoreId); setView('entry'); 
         }
    }, [role, selectedStoreId, userStoreId, view, storesLoaded]);


    // --- Core Functions ---

    const calculateSold = useCallback((category, item) => { const key = `${category}-${item}`; return (yesterdayStock[key] || 0) - (currentStock[key] || 0); }, [currentStock, yesterdayStock]);
    const soldStockSummary = useMemo(() => { let totalSold = 0; Object.keys(currentStock).forEach(key => { const [category, item] = key.split('-'); if (category && item && masterStockList[category]?.includes(item)) { const sold = calculateSold(category, item); if (sold > 0) totalSold += sold; } }); return Math.round(totalSold * 100) / 100; }, [currentStock, calculateSold, masterStockList]); // Round to 2 decimal places

    const saveStock = async () => {
        setIsSaving(true); 
        try {
            if (!db || !userId || !selectedStoreId || !masterStockListLoaded) throw new Error("App not ready/Store not selected.");
            const relevantStockData = {};
            Object.keys(masterStockList).forEach(cat => { masterStockList[cat]?.forEach(item => { const key = `${cat}-${item}`; relevantStockData[key] = currentStock[key] || 0; }); });
            const { sanitized, errors } = validateStockData(relevantStockData); 
            if (errors.length > 0) showToast(`Validation warnings: ${errors.slice(0, 3).join(', ')}`, 'warning'); 
            const totalItems = Object.values(sanitized).filter(v => v > 0).length;
            const totalQuantity = Object.values(sanitized).reduce((s, v) => s + (v || 0), 0);
            if (totalItems === 0) throw new Error("Enter at least one stock item."); 
            const confirmed = await showConfirm({ title: 'Confirm Stock', message: `Store: ${stores[selectedStoreId] || selectedStoreId}\nDate: ${selectedDate}\nItems: ${totalItems}\nTotal: ${totalQuantity}\n\nSave?`, confirmText: 'Save', cancelText: 'Cancel' });
            if (!confirmed) throw new Error("Save cancelled by user."); 

            await perfMonitor.measureAsync('saveStock', async () => {
                const docId = `${selectedStoreId}-${selectedDate}`;
                const docRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, docId);
                await retryOperation(async () => { await setDoc(docRef, { storeId: selectedStoreId, date: selectedDate, stock: sanitized, userId: userId, timestamp: new Date().toISOString() }); });
                storageBackup.save(`stock_${selectedStoreId}_${selectedDate}`, sanitized);
            });
             // Explicitly call fetchStockData after successful save to refresh sold report etc.
            await fetchStockData(selectedStoreId, selectedDate); 
        } catch (error) { 
            // Only handle error if it's not a user cancellation
            if (error.message !== "Save cancelled by user.") {
                handleError(error, 'Stock Saving'); 
                throw error; // Re-throw needed for caller toast
            } else {
                 console.log("Save cancelled by user."); // Log cancellation but don't show error toast
            }
        } finally { setIsSaving(false); }
    };

     const exportStockData = useCallback(() => {
         if (role !== 'admin') { handleError(new Error('Admin only'), 'Export'); return; }
         try {
             const storeName = stores[selectedStoreId] || selectedStoreId;
             const exportData = { store: storeName, date: selectedDate, exportTimestamp: new Date().toISOString(), currentStock: {}, yesterdayStock: {}, calculatedSold: {} };
             Object.keys(masterStockList).sort().forEach(category => {
                 masterStockList[category].sort().forEach(item => {
                     const key = `${category}-${item}`;
                     exportData.currentStock[key] = currentStock[key] || 0;
                     exportData.yesterdayStock[key] = yesterdayStock[key] || 0;
                     exportData.calculatedSold[key] = calculateSold(category, item);
                 });
             });
             const dataStr = JSON.stringify(exportData, null, 2); 
             const dataBlob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(dataBlob); const link = document.createElement('a'); link.href = url; link.download = `stock-data-${storeName.replace(/\s+/g, '_')}-${selectedDate}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
             showToast('Stock data exported.', 'success');
         } catch (error) { handleError(error, 'Data Export'); showToast('Export failed.', 'error'); }
     }, [role, stores, selectedStoreId, selectedDate, currentStock, yesterdayStock, masterStockList, calculateSold, showToast]);


    const generateOrderOutput = useCallback(() => {
        const storeName = stores[selectedStoreId] || selectedStoreId;
        let output = `${storeName}\nDate: ${getTodayDate()}\n\n`; // Add date to order output
        const sections = {};
        const miscItems = []; 
        const nonOrderedItems = [];

        Object.keys(masterStockList).sort().forEach(category => { sections[category] = []; }); 

        Object.keys(masterStockList).forEach(category => {
            masterStockList[category]?.sort().forEach(item => { 
                const key = `${category}-${item}`; 
                const quantity = orderQuantities[key] || ''; 
                // Only include if quantity is a positive number
                if (typeof quantity === 'number' && quantity > 0) { 
                    if (category === 'MISC' && item === 'Ice Cream Dabee') { 
                        miscItems.push(`${item} - ${quantity}`);
                    } else if (sections[category]) { 
                        sections[category].push(`${item} - ${quantity}`);
                    }
                } else {
                     if (sections[category] || category === 'MISC') { nonOrderedItems.push(`${category}: ${item}`); }
                }
            });
        });

        Object.keys(sections).sort().forEach(category => {
            if (sections[category].length > 0) {
                 output += `*${category}*\n`;
                 output += sections[category].join('\n'); 
                 output += '\n\n';
            }
        });
        
        if (miscItems.length > 0) { output += miscItems.join('\n'); output += '\n\n'; }
        // Optional: Include non-ordered items if needed
        // if (nonOrderedItems.length > 0) { output += `*ITEMS NOT ORDERED*\n`; output += nonOrderedItems.join('\n'); output += '\n\n'; }
        if (selectedStoreId === 'store-1' && stores['store-2']) { output += stores['store-2']; output += '\n'; } 

        return output.trim();
    }, [orderQuantities, selectedStoreId, stores, masterStockList]); 

    // --- Auth, Toast, Confirm Handlers ---
    const handleLogout = async () => { if (auth) { await signOut(auth); window.location.reload(); } };
    const handleAuthSuccess = (user, username) => { if (user) { const fetchProfile = async () => { const roleDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_config`, 'profile'); const roleSnap = await getDoc(roleDocRef); if (roleSnap.exists()) { setRole(roleSnap.data().role); setUserStoreId(roleSnap.data().storeId || null); } else if (isFirstUser) { const defaultRole = 'admin'; const defaultStoreId = Object.keys(stores).length > 0 ? Object.keys(stores)[0] : null; await setDoc(roleDocRef, { role: defaultRole, storeId: defaultStoreId, username: username }, { merge: true }); const setupDocRef = doc(db, `artifacts/${appId}/public`, 'config'); await setDoc(setupDocRef, { completed: true, firstAdminId: user.uid, timestamp: new Date().toISOString() }); setRole(defaultRole); setUserStoreId(defaultStoreId); setIsFirstUser(false); } setShowAuthModal(false); }; fetchProfile(); } };
    const showToast = useCallback((message, type = 'success') => { const id = Date.now() + Math.random(); setToasts(prev => [...prev, { id, message, type }]); }, []);
    const removeToast = useCallback((id) => { setToasts(prev => prev.filter(toast => toast.id !== id)); }, []);
    const showConfirm = useCallback((options) => new Promise((resolve) => { setConfirmDialog({ ...options, onConfirm: () => { setConfirmDialog(null); resolve(true); }, onCancel: () => { setConfirmDialog(null); resolve(false); } }); }), []);

    // --- View Rendering Logic ---

    if (error) { return <ErrorDisplay error={error} onRetry={() => window.location.reload()} onDismiss={clearError} />; }
    // Update loading condition to check for master list readiness as well
    if (!isAuthReady || isInitializing || !storesLoaded || !masterStockListLoaded || processStep !== 'ready') { return <LoadingSpinner text={processStep === 'loading-data' ? "Loading configuration..." : "Initializing..."} />; }
    if (!userId || !role) { return ( <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"> <div className="w-full max-w-md"> <div className="bg-white rounded-xl shadow-xl border-t-4 border-orange-600 p-6 text-center"> <h1 className="text-3xl font-bold font-display text-orange-600 mb-2">Sujata Mastani</h1> <p className="text-gray-600 mb-6">Inventory System</p> <button onClick={() => setShowAuthModal(true)} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition duration-150 shadow-md flex items-center justify-center text-lg font-display"> <User className="w-5 h-5 mr-2" /> Log In / Register </button> </div> </div> {showAuthModal && <AuthModal auth={auth} onClose={() => setShowAuthModal(false)} onLoginSuccess={handleAuthSuccess} isFirstUser={isFirstUser} />} </div> ); }
    if (loadingData && selectedStoreId) { return <LoadingSpinner text="Loading stock data..." />; } 

    // --- Main Renderer ---
    const renderView = () => {
        const storeName = stores[selectedStoreId] || 'Unknown Store';
        const isAdmin = role === 'admin';
        switch (view) {
            case 'home': return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />;
            case 'admin': if (!isAdmin || !selectedStoreId) return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />; return <AdminFunctionsView {...{ stores, selectedStoreId, setView }} />; 
            case 'storemanager': if (!isAdmin) return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />; return <StoreManagementView {...{ db, appId, stores, showToast, showConfirm }} />;
            case 'usermanager': if (!isAdmin) return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />; return <AdminUserManagementView {...{ db, appId, stores, auth, exportStockData, showToast }} />;
            case 'itemmanager': if (!isAdmin) return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />; return <ItemManagerView {...{ db, appId, masterStockList, showToast, showConfirm }} />; 
            case 'entry': if (!selectedStoreId) return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />; return <StockEntryView {...{ storeId: storeName, stockData: currentStock, setStockData: setCurrentStock, saveStock, isSaving, selectedDate, setSelectedDate, showToast, masterStockList }} />;
            case 'sold': if (!isAdmin || !selectedStoreId) return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />; return <StockSoldView {...{ currentStock, yesterdayStock, calculateSold, soldStockSummary, masterStockList }} />;
            case 'order': if (!isAdmin || !selectedStoreId) return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />; return <OrderingView {...{ currentStock, orderQuantities, setOrderQuantities, generateOrderOutput, showToast, masterStockList }} />;
            default: return <HomeView {...{ role, userStoreId, stores, setView, setSelectedStoreId, userId }} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased pb-20">
             {/* Show process flow only during loading stages */}
             {(processStep !== 'ready' && !error) && <ProcessFlowDisplay step={processStep} />}
             <ToastContainer toasts={toasts} removeToast={removeToast} />
             {confirmDialog && <ConfirmModal {...confirmDialog} />}
             {!isOnline && ( <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50"> <span className="text-sm font-medium">⚠️ Offline</span> </div> )}
             <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@700;800&display=swap'); body { font-family: 'Inter', sans-serif; background-color: #F8FAFC; } .font-display { font-family: 'Poppins', sans-serif; } @keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}} .animate-fadeIn{animation:fadeIn .5s ease-out} @keyframes slideInRight{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}} .animate-slideInRight{animation:slideInRight .3s ease-out} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0} input[type=number]{-moz-appearance:textfield;font-size:16px} @media screen and (max-width:768px){input,select{font-size:16px!important}}`}</style>
             <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md shadow-sm p-4 flex justify-between items-center border-b border-gray-200 h-[73px]"> <h1 className="text-xl font-bold font-display text-gray-900 tracking-wider truncate pr-2"> {selectedStoreId ? stores[selectedStoreId] : 'SUJATA MASTANI'} </h1> <div className="flex items-center space-x-3 shrink-0"> {role && ( <span className={`px-3 py-1 text-xs font-semibold rounded-full ${role === 'admin' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}> {role.toUpperCase()} </span> )} {userId && ( <button onClick={handleLogout} className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition duration-150 shadow-md" aria-label="Logout"> <LogOut className="w-5 h-5" /> </button> )} </div> </header>

            <main className="max-w-lg mx-auto pt-2 pb-4 overflow-y-auto">
                {renderView()}
            </main>

            {auth?.currentUser?.uid && <NavBar {...{currentView: view, role, selectedStoreId, setView, setSelectedStoreId}} />}
        </div>
    );
};

export default App;

