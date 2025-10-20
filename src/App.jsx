import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, onSnapshot, deleteDoc, getDocs, addDoc } from 'firebase/firestore';
// Replaced lucide icons with standard icon names for theme consistency
import { User, Home, List, ShoppingCart, Loader, TrendingDown, LogOut, UserPlus, X, Store, Trash2 } from 'lucide-react'; 

// Import components
import StockInput from './components/StockInput';
import Modal from './components/Modal';
import Toast from './components/Toast';
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';
import LoadingSpinner from './components/LoadingSpinner';
import SelectField from './components/SelectField';

// Import constants
import { INITIAL_STOCK_LIST, APP_CONFIG, USER_ROLES, VIEWS, TOAST_TYPES, MODAL_COLORS } from './constants';

// Import utility functions
import { validateStockData, validateUserCredentials, validateStoreData, RateLimiter } from './utils/validation-utils';
import { safeTransaction, retryOperation, DocumentCache } from './utils/firestore-utils';
import { storageBackup, recoverFromBackup } from './utils/storage-backup';
import { perfMonitor, getMemoryInfo, getNetworkSpeed } from './utils/performance-monitor'; 
import { useFirebase } from './hooks/useFirebase';

// --- Global Constants and Firebase Setup ---

// These global variables are provided by the canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : APP_CONFIG.DEFAULT_APP_ID;

// --- Utility Functions ---

const getEmptyStock = (stockList) => {
  const stock = {};
  Object.keys(stockList).forEach(category => {
    stockList[category].forEach(item => {
      const key = `${category}-${item}`; 
      stock[key] = 0;
    });
  });
  return stock;
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);
const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
};

// --- Reducer ---

const initialState = {
    stores: {},
    showAuthModal: false,
    toasts: [],
    confirmDialog: null,
    selectedStoreId: '',
    view: VIEWS.HOME,
    isSaving: false,
    loadingData: false,
    hasSaveError: false,
    appError: null,
    retryCount: 0,
    isRetrying: false,
    processStep: 'initializing',
    storesLoaded: false,
    isInitializing: true,
    isOnline: navigator.onLine,
    masterStockList: INITIAL_STOCK_LIST,
    currentStock: getEmptyStock(INITIAL_STOCK_LIST),
    yesterdayStock: getEmptyStock(INITIAL_STOCK_LIST),
    orderQuantities: getEmptyStock(INITIAL_STOCK_LIST),
    selectedDate: getTodayDate(),
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_STORES':
            return { ...state, stores: action.payload };
        case 'SET_SHOW_AUTH_MODAL':
            return { ...state, showAuthModal: action.payload };
        case 'ADD_TOAST':
            return { ...state, toasts: [...state.toasts, action.payload] };
        case 'REMOVE_TOAST':
            return { ...state, toasts: state.toasts.filter(toast => toast.id !== action.payload) };
        case 'SET_CONFIRM_DIALOG':
            return { ...state, confirmDialog: action.payload };
        case 'SET_SELECTED_STORE_ID':
            return { ...state, selectedStoreId: action.payload };
        case 'SET_VIEW':
            return { ...state, view: action.payload };
        case 'SET_IS_SAVING':
            return { ...state, isSaving: action.payload };
        case 'SET_LOADING_DATA':
            return { ...state, loadingData: action.payload };
        case 'SET_HAS_SAVE_ERROR':
            return { ...state, hasSaveError: action.payload };
        case 'SET_APP_ERROR':
            return { ...state, appError: action.payload };
        case 'SET_RETRY_COUNT':
            return { ...state, retryCount: action.payload };
        case 'SET_IS_RETRYING':
            return { ...state, isRetrying: action.payload };
        case 'SET_PROCESS_STEP':
            return { ...state, processStep: action.payload };
        case 'SET_STORES_LOADED':
            return { ...state, storesLoaded: action.payload };
        case 'SET_IS_INITIALIZING':
            return { ...state, isInitializing: action.payload };
        case 'SET_IS_ONLINE':
            return { ...state, isOnline: action.payload };
        case 'SET_MASTER_STOCK_LIST':
            return { ...state, masterStockList: action.payload };
        case 'SET_CURRENT_STOCK':
            return { ...state, currentStock: action.payload };
        case 'SET_YESTERDAY_STOCK':
            return { ...state, yesterdayStock: action.payload };
        case 'SET_ORDER_QUANTITIES':
            return { ...state, orderQuantities: action.payload };
        case 'SET_SELECTED_DATE':
            return { ...state, selectedDate: action.payload };
        default:
            return state;
    }
}

// --- Admin Store Management Component (NEW) ---
const InputField = ({ label, type = 'text', value, onChange, placeholder, minLength }) => (
    <label className="flex flex-col min-w-40 flex-1">
        <p className="text-sm font-semibold text-orange-700/80 leading-normal pb-2">{label}</p>
        <input 
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900 transition-all duration-300"
            type={type} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            minLength={minLength}
            required
        />
    </label>
);

const StoreManagementView = ({ db, appId, stores, showToast, showConfirm }) => {
    const [newStoreName, setNewStoreName] = useState('');
    const [isAddingStore, setIsAddingStore] = useState(false);

    const handleAddStore = async (e) => {
        e.preventDefault();
        setIsAddingStore(true);

        try {
            // VALIDATE STORE DATA
            const validatedStore = validateStoreData({ name: newStoreName });

            const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
            await addDoc(storesColRef, {
                name: validatedStore.name,
                createdAt: new Date().toISOString()
            });

            showToast(`Store "${validatedStore.name}" added successfully!`, 'success');
            setNewStoreName('');
        } catch (error) {
            console.error("Error adding store:", error);
            showToast(`Failed: ${error.message}`, 'error');
        } finally {
            setIsAddingStore(false);
        }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        try {
            const storeDocRef = doc(db, `artifacts/${appId}/public/data/stores`, storeId);
            await deleteDoc(storeDocRef);

            showToast(`Store "${storeName}" deleted successfully!`, 'success');
            
            // Note: Related data (stock entries, user assignments) will be cleaned 
            // up implicitly as the store ID will no longer be valid in the UI lists.
        } catch (error) {
            handleError(error, 'Store Deletion');
            showToast(`Failed to delete store: ${error.message}`, 'error');
        }
    };

    const handleDeleteClick = async (storeId, storeName) => {
        const confirmed = await showConfirm({
            title: 'Delete Store',
            message: `Are you sure you want to delete "${storeName}"? This action cannot be undone.`, 
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });
        
        if (confirmed) {
            await handleDeleteStore(storeId, storeName);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <Store className="w-6 h-6 mr-3 text-orange-600" /> Store Manager
            </h2>
            <p className="text-sm text-gray-600">Add or remove outlet locations from the system.</p>

            {/* --- Add Store Form --- */}
            <form onSubmit={handleAddStore} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-4 max-w-md mx-auto">
                <InputField
                    label="New Store Name"
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="e.g., Kothrud Outlet"
                />
                <button
                    type="submit"
                    disabled={isAddingStore}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg"
                >
                    {isAddingStore ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <Store className="w-5 h-5 mr-2" />}
                    Add New Store
                </button>
            </form>

            {/* --- Current Stores List --- */}
            <div className="pt-4">
                <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">Current Stores ({Object.keys(stores).length})</h3>
                <ul className="space-y-2">
                    {Object.entries(stores).map(([id, name]) => (
                        <li key={id} className="p-3 bg-white rounded-lg border border-gray-100 flex justify-between items-center text-gray-900">
                            <span className="flex-1">{name}</span>
                            <div className="flex items-center space-x-3">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full hidden sm:inline">{id}</span>
                                <button
                                    onClick={() => handleDeleteClick(id, name)}
                                    className="p-1 rounded-full text-red-600 hover:bg-red-100 transition duration-150"
                                    aria-label={`Delete ${name}`}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};



// --- Stock Item Management Component ---

const StockItemManagementView = ({ masterStockList, setMasterStockList, showToast, showConfirm }) => {
    const [newItemName, setNewItemName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('MILKSHAKE');
    const [isAddingItem, setIsAddingItem] = useState(false);

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsAddingItem(true);

        try {
            // VALIDATE ITEM NAME
            if (!newItemName.trim()) {
                showToast("Item name cannot be empty.", 'error');
                setIsAddingItem(false);
                return;
            }

            if (newItemName.trim().length > 100) {
                showToast("Item name too long (max 100 characters).", 'error');
                setIsAddingItem(false);
                return;
            }

            const sanitizedName = newItemName.trim().replace(/\s+/g, ' ');
            
            // Check if item already exists in category
            if (masterStockList[selectedCategory].includes(sanitizedName)) {
                showToast(`"${sanitizedName}" already exists in ${selectedCategory}.`, 'error');
                setIsAddingItem(false);
                return;
            }

            // Add item to category
            setMasterStockList(prev => ({
                ...prev,
                [selectedCategory]: [...prev[selectedCategory], sanitizedName]
            }));

            showToast(`"${sanitizedName}" added to ${selectedCategory} successfully!`, 'success');
            setNewItemName('');
        } catch (error) {
            console.error("Error adding item:", error);
            showToast(`Failed to add item: ${error.message}`, 'error');
        } finally {
            setIsAddingItem(false);
        }
    };

    const handleDeleteItem = async (category, itemName) => {
        const confirmed = await showConfirm({
            title: 'Delete Item',
            message: `Are you sure you want to delete "${itemName}" from ${category}? This action cannot be undone.`, 
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });
        
        if (confirmed) {
            try {
                setMasterStockList(prev => ({
                    ...prev,
                    [category]: prev[category].filter(item => item !== itemName)
                }));
                showToast(`"${itemName}" deleted from ${category} successfully!`, 'success');
            } catch (error) {
                console.error("Error deleting item:", error);
                showToast(`Failed to delete item: ${error.message}`, 'error');
            }
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <List className="w-6 h-6 mr-3 text-orange-600" /> Stock Item Manager
            </h2>
            <p className="text-sm text-gray-600">Add or remove items from each category in your inventory.</p>

            {/* Add Item Form */}
            <form onSubmit={handleAddItem} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-4 max-w-md mx-auto">
                <div className="flex space-x-4">
                    <SelectField
                        label="Category"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="MILKSHAKE">MILKSHAKE</option>
                        <option value="ICE CREAM">ICE CREAM</option>
                        <option value="TOPPINGS">TOPPINGS</option>
                        <option value="MISC">MISC</option>
                    </SelectField>
                </div>
                
                <InputField
                    label="New Item Name"
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., New Flavor"
                />
                
                <button
                    type="submit"
                    disabled={isAddingItem}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg"
                >
                    {isAddingItem ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <List className="w-5 h-5 mr-2" />}
                    Add Item
                </button>
            </form>

            {/* Current Items by Category */}
            <div className="space-y-4">
                {Object.keys(masterStockList).map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">
                            {category} ({masterStockList[category].length} items)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {masterStockList[category].map(item => (
                                <div key={item} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-900 flex-1">{item}</span>
                                    <button
                                        onClick={() => handleDeleteItem(category, item)}
                                        className="p-1 rounded-full text-red-600 hover:bg-red-100 transition duration-150 ml-2"
                                        aria-label={`Delete ${item}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Admin User Management Component ---

const AdminUserManagementView = ({ db, appId, stores, auth, exportStockData, showToast }) => {
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState(USER_ROLES.STAFF);
    const [storeId, setStoreId] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Set default storeId when stores are available
    useEffect(() => {
        if (Object.keys(stores).length > 0 && !storeId) {
            setStoreId(Object.keys(stores)[0]);
        }
    }, [stores, storeId]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);

        // VALIDATE CREDENTIALS
        const validationErrors = validateUserCredentials(newUsername, newPassword);
        if (validationErrors.length > 0) {
            showToast(validationErrors.join(', '), 'error');
            setIsCreating(false);
            return;
        }

        try {
            const fakeEmail = `${newUsername.toLowerCase().trim()}@sujata-mastani-inventory.local`;
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, newPassword);
            const newUser = userCredential.user;

            const userConfigRef = doc(db, `artifacts/${appId}/users/${newUser.uid}/user_config`, 'profile');
            await setDoc(userConfigRef, {
                role: newUserRole,
                storeId: storeId,
                username: newUsername.trim(),
            }, { merge: true });

            showToast(`User ${newUsername} created successfully!`, 'success');
            setNewUsername('');
            setNewPassword('');
        } catch (error) {
            console.error("Error creating user:", error);
            showToast(`Failed: ${error.message.replace('Firebase: Error (auth/', '').replace(').', '')}`, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <UserPlus className="w-6 h-6 mr-3 text-orange-600" /> User Manager
            </h2>
            <p className="text-sm text-gray-600">Securely create new staff/admin accounts and assign them to a store.</p>

            <form onSubmit={handleCreateUser} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-6 max-w-md mx-auto">
                <div className="flex flex-col gap-4">
                    <InputField
                        label="Username"
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g., staff.kothrud"
                    />
                    <InputField
                        label="Password (Min 6 chars)"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create a password"
                        minLength="6"
                    />
                </div>
                
                <div className="flex space-x-4">
                    <SelectField
                        label="Role"
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                    >
                        <option value={USER_ROLES.STAFF}>Staff</option>
                        <option value={USER_ROLES.ADMIN}>Admin</option>
                    </SelectField>
                    <SelectField
                        label="Store"
                        value={storeId}
                        onChange={(e) => setStoreId(e.target.value)}
                    >
                        {Object.entries(stores).map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </SelectField>
                </div>

                <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg"
                >
                    {isCreating ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                    Create User Account
                </button>
            </form>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Data Export</h3>
                <p className="text-sm text-gray-600 mb-4">Export current stock data as JSON file for backup or analysis.</p>
                <button
                    onClick={exportStockData}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/40 transition duration-200 flex items-center justify-center text-lg"
                >
                    📊 Export Stock Data
                </button>
            </div>
        </div>
    );
};

// --- Stock Management Components ---

/**
 * Stock Entry View (For Staff)
 */
const StockEntryView = ({ storeId, stockData, setStockData, saveStock, isSaving, selectedDate, setSelectedDate, showToast, masterStockList, hasSaveError }) => {
    const handleSave = async () => {
        try {
            await saveStock();
            showToast('Stock saved successfully!', 'success');
        } catch (e) {
            showToast(e.message || 'Error saving stock. Please try again.', 'error');
            console.error(e);
        }
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        const today = getTodayDate();
        
        // Validate that selected date is not in future
        if (newDate > today) {
            setStatus('Error: Cannot select future dates');
            setIsError(true);
            setTimeout(() => setStatus(''), 3000);
            return;
        }
        
        setSelectedDate(newDate);
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Closing Stock Entry</h2>
            <p className="text-sm text-gray-600">Enter the current stock count for **{storeId}**.</p>

            {/* Date Selector */}
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                </label>
                <input
                    type="date"
                    value={selectedDate}
                    max={getTodayDate()}
                    onChange={handleDateChange}
                    className="w-full p-3 text-base bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition duration-150"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum date: Today ({getTodayDate()})</p>
            </div>

            <div className="space-y-4">
                {Object.keys(masterStockList).map(category => (
                    // Updated section styling for Stitch UI
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">{category}</h3>
                        <div className="space-y-2">
                            {masterStockList[category].map(item => {
                                const key = `${category}-${item}`;
                                return (
                                    <StockInput
                                        key={key}
                                        label={item}
                                        value={stockData[key]}
                                        onChange={(value) => setStockData(prev => ({ ...prev, [key]: value }))}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 flex items-center justify-center disabled:opacity-50 text-xl font-display tracking-wide"
            >
                {isSaving ? (
                    <Loader className="animate-spin w-6 h-6 mr-2" />
                ) : (
                    <><List className="w-6 h-6 mr-2" /> Save Closing Stock</>
                )}
            </button>

            {/* Retry button for connection errors */}
            {hasSaveError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center mb-2">
                        <div className="w-5 h-5 text-red-600 mr-2">⚠️</div>
                        <p className="text-red-800 font-semibold">Save Failed</p>
                    </div>
                    <p className="text-red-700 text-sm mb-3">
                        There was a connection issue while saving. Your data is backed up locally.
                    </p>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isSaving ? (
                            <Loader className="animate-spin w-4 h-4 mr-2" />
                        ) : (
                            <><List className="w-4 h-4 mr-2" /> Retry Save</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

/**
 * Stock Sold Report View (New 4th Tab)
 */
const StockSoldView = ({ currentStock, yesterdayStock, calculateSold, soldStockSummary, masterStockList }) => {
    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Stock Sold Report</h2>
            <div className="flex flex-col items-center justify-center rounded-xl shadow-lg bg-white border border-gray-100 p-6">
                <p className="text-base font-semibold text-gray-600 font-display">TOTAL UNITS SOLD TODAY</p>
                <p className="text-6xl font-extrabold font-display text-orange-600 mt-1">{soldStockSummary}</p>
                <p className="text-xs text-gray-400 mt-2">Data as of {getTodayDate()}</p>
            </div>
            
            <p className="text-sm text-gray-500">
                Calculation: Yesterday's Closing Stock - Today's Current Stock.
            </p>

            <div className="space-y-4">
                {Object.keys(masterStockList).map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-red-600 border-b border-red-200 pb-2 mb-3">{category}</h3>
                        <div className="space-y-2">
                            {masterStockList[category].map(item => {
                                const key = `${category}-${item}`; 
                                const sold = calculateSold(category, item);
                                const current = currentStock[key] || 0;
                                const yesterday = yesterdayStock[key] || 0;

                                // Styling based on sale status
                                const isLoss = sold < 0;
                                const cardClass = isLoss ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';
                                const soldColor = isLoss ? 'text-red-700' : 'text-orange-600';

                                return (
                                    <div 
                                        key={key} 
                                        className={`flex items-center justify-between p-3 rounded-lg border ${cardClass}`}
                                    >
                                        <div className="flex-1">
                                            <p className="text-base font-semibold text-gray-900">{item}</p>
                                            <p className="text-xs text-gray-500">Yst: {yesterday} | Cur: {current}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className={`text-2xl font-bold font-display ${soldColor}`}>{sold}</p>
                                            <p className="text-xs text-gray-500">{isLoss ? 'LOSS/ERROR' : 'SOLD'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


/**
 * Admin Ordering View
 */
const OrderingView = ({ currentStock, orderQuantities, setOrderQuantities, generateOrderOutput, showToast, masterStockList }) => {
    const [showOutputModal, setShowOutputModal] = useState(false);

    const handleOutput = () => {
        const output = generateOrderOutput();

        // Fallback for copying to clipboard
        const textArea = document.createElement("textarea");
        textArea.value = output;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Order list copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy. Please copy manually.', 'error');
        }
        document.body.removeChild(textArea);
        setShowOutputModal(true);
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Order Management</h2>
            <p className="text-sm text-gray-600">
                Enter the required quantity for the next day. Current stock is shown below.
            </p>

            <div className="space-y-4">
                {Object.keys(masterStockList).map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">{category} (Order Qty)</h3>
                        <div className="space-y-2">
                            {masterStockList[category].map(item => {
                                const key = `${category}-${item}`;
                                const current = currentStock[key] || 0;

                                return (
                                    <div
                                        key={key}
                                        className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200`}
                                    >
                                        <div className="w-1/2">
                                            <p className="text-base font-semibold text-gray-900">{item}</p>
                                            <p className="text-xs text-orange-600">Current Stock: {current}</p>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={orderQuantities[key] || ''}
                                            onChange={(e) => setOrderQuantities(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                                            placeholder="Order"
                                            // Removed complex CSS hacks here; relying on global style block
                                            className="w-1/3 p-2 text-base text-right bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150 shadow-sm"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleOutput}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 flex items-center justify-center text-xl font-display tracking-wide"
            >
                <ShoppingCart className="w-6 h-6 mr-2" /> Generate Order List & Copy
            </button>

            {/* Output Modal */}
            {showOutputModal && (
                <Modal title="Order List Output" onClose={() => setShowOutputModal(false)}>
                    <p className="text-sm mb-4 text-gray-700">The order list has been copied to your clipboard. You can also copy it manually from here.</p>
                    <pre className="p-4 bg-gray-50 text-gray-900 text-sm overflow-x-scroll rounded-lg border border-gray-300 font-mono">{generateOrderOutput()}</pre>
                    <button
                        onClick={() => {
                            const output = generateOrderOutput();
                            const textArea = document.createElement("textarea");
                            textArea.value = output;
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            try {
                                document.execCommand('copy');
                                showToast('Order list re-copied to clipboard!', 'success');
                            } catch (err) {
                                showToast('Failed to copy. Please copy manually.', 'error');
                            }
                            document.body.removeChild(textArea);
                        }}
                        className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition duration-200"
                    >
                        Copy Order Again
                    </button>
                </Modal>
            )}
        </div>
    );
};


// --- Auth/Role Management Logic ---

const AuthModal = ({ auth, onLoginSuccess, onClose, isFirstUser }) => {
    const [isRegister, setIsRegister] = useState(isFirstUser);
    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        setIsLoading(true);

        if (authPassword.length < 6) {
             setAuthError("Password must be at least 6 characters.");
             setIsLoading(false);
             return;
        }

        try {
            // Use a dummy domain for Firebase Auth
            const fakeEmail = `${authUsername.toLowerCase().trim()}@sujata-mastani-inventory.local`;
            if (isRegister) {
                const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, authPassword);
                onLoginSuccess(userCredential.user, authUsername.trim());
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, authPassword);
                onLoginSuccess(userCredential.user, authUsername.trim());
            }
        } catch (err) {
            console.error("Auth Error:", err);
            setAuthError(err.message.replace('Firebase: Error (auth/', '').replace(').', ''));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title={isRegister ? "Admin Registration" : "Login"} onClose={onClose}>
            <p className="text-sm text-gray-600 mb-6">
                {isRegister ? "Register the first Super Admin account." : "Enter your assigned username and password."}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Username"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        required
                        className="w-full p-3 h-12 border border-gray-300 rounded-lg pl-10 focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150"
                    />
                </div>
                <div className="relative">
                    <List className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="password"
                        placeholder="Password (Min 6 characters)"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                        minLength="6"
                        className="w-full p-3 h-12 border border-gray-300 rounded-lg pl-10 focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150"
                    />
                </div>
                
                {authError && <p className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">{authError}</p>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg font-display"
                >
                    {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : (isRegister ? "Register Admin" : "Log In")}
                </button>
            </form>
            
            <button
                onClick={() => { setIsRegister(p => !p); setAuthError(''); }}
                className="w-full mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
                disabled={isLoading}
            >
                {isRegister ? "Already have an account? Log In" : "Need to register first Admin? Sign Up"}
            </button>
        </Modal>
    );
};


// --- Main Application Component ---

const App = () => {
    const { db, auth, userId, isAuthReady, userRole, userStoreId, isFirstUser } = useFirebase();
    const [state, dispatch] = useReducer(reducer, initialState);
    const { 
        stores, showAuthModal, toasts, confirmDialog, selectedStoreId, view, isSaving, loadingData, hasSaveError, 
        appError, retryCount, isRetrying, processStep, storesLoaded, isInitializing, isOnline, 
        masterStockList, currentStock, yesterdayStock, orderQuantities, selectedDate 
    } = state;
    
    // --- Error Handling Utilities ---
    const handleError = (error, context = 'Unknown') => {
        console.error(`Error in ${context}:`, error);
        dispatch({ type: 'SET_APP_ERROR', payload: {
            message: error.message || 'An unexpected error occurred',
            context,
            timestamp: new Date().toISOString(),
            retryable: true
        }});
        dispatch({ type: 'SET_PROCESS_STEP', payload: 'error' });
    };

    const clearError = () => {
        dispatch({ type: 'SET_APP_ERROR', payload: null });
        dispatch({ type: 'SET_RETRY_COUNT', payload: 0 });
        dispatch({ type: 'SET_IS_RETRYING', payload: false });
    };

    const retryOperation = async (operation, maxRetries = 3) => {
        if (retryCount >= maxRetries) {
            handleError(new Error('Maximum retry attempts reached'), 'Retry Operation');
            return false;
        }

        dispatch({ type: 'SET_IS_RETRYING', payload: true });
        dispatch({ type: 'SET_RETRY_COUNT', payload: state.retryCount + 1 });
        
        try {
            await operation();
            clearError();
            return true;
        } catch (error) {
            if (retryCount < maxRetries - 1) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                return retryOperation(operation, maxRetries);
            } else {
                handleError(error, 'Retry Operation');
                return false;
            }
        } finally {
            dispatch({ type: 'SET_IS_RETRYING', payload: false });
        }
    };
    
    // No hardcoded stores - only use Firestore data 

    // Network Status Monitoring
    useEffect(() => {
        const handleOnline = () => {
            dispatch({ type: 'SET_IS_ONLINE', payload: true });
            console.log('Network: Online');
            showToast('Connection restored!', 'success');
        };

        const handleOffline = () => {
            dispatch({ type: 'SET_IS_ONLINE', payload: false });
            console.log('Network: Offline');
            showToast('Connection lost. Some features may not work.', 'warning');
        };

        // Check Firestore connection periodically
        const checkConnection = async () => {
            if (db && isOnline) {
                try {
                    const testDoc = doc(db, '_connection_test', 'ping');
                    await getDoc(testDoc);
                    console.log('Firestore connection: OK');
                } catch (error) {
                    console.warn('Firestore connection check failed:', error);
                    if (error.message.includes('NS_BINDING_ABORTED') || error.message.includes('network')) {
                        showToast('Database connection unstable. Please check your internet.', 'warning');
                    }
                }
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Check connection every 30 seconds
        const connectionInterval = setInterval(checkConnection, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(connectionInterval);
        };
    }, [db, isOnline, showToast]); 

    // 2. Real-time Store Fetching (Runs only after DB, Auth, user authentication, AND role is loaded)
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !userRole) return; // Wait for role to be loaded before fetching stores

        console.log("Starting store fetch - user authenticated with role:", userRole);
        const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
        
        const unsubscribeStores = onSnapshot(storesColRef, async (snapshot) => {
            try {
                const newStores = {};
                snapshot.forEach(doc => {
                    newStores[doc.id] = doc.data().name;
                });

                console.log("Stores loaded:", Object.keys(newStores).length, "stores");
                dispatch({ type: 'SET_STORES', payload: newStores });
                dispatch({ type: 'SET_STORES_LOADED', payload: true }); // Mark stores as loaded
                clearError(); // Clear any previous errors
            } catch (error) {
                handleError(error, 'Store Data Processing');
            }
        }, (error) => {
            console.error("Error listening to stores:", error);
            handleError(error, 'Store Fetching');
            dispatch({ type: 'SET_STORES', payload: {} }); // Set empty stores on error
            dispatch({ type: 'SET_STORES_LOADED', payload: true }); // Mark stores as loaded even on error
        });

        return () => {
            console.log("Unsubscribing from stores listener");
            unsubscribeStores();
        };
    }, [db, appId, isAuthReady, userId, userRole]); // Added userRole to dependencies

    // 3. Set default storeId for admins after stores are loaded
    useEffect(() => {
        if (userRole === 'admin' && !userStoreId && Object.keys(stores).length > 0 && db && userId) {
            const setDefaultStoreId = async () => {
                const defaultStoreId = Object.keys(stores)[0];
                const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
                try {
                    // Try to update existing document first
                    await updateDoc(roleDocRef, { storeId: defaultStoreId });
                    dispatch({ type: 'SET_USER_STORE_ID', payload: defaultStoreId });
                    console.log("Set default storeId for admin:", defaultStoreId);
                } catch (error) {
                    // If document doesn't exist, create it with setDoc
                    if (error.code === 'not-found') {
                        try {
                            await setDoc(roleDocRef, { 
                                role: 'admin', 
                                storeId: defaultStoreId,
                                email: auth?.currentUser?.email || null
                            }, { merge: true });
                            dispatch({ type: 'SET_USER_STORE_ID', payload: defaultStoreId });
                            console.log("Created profile with default storeId for admin:", defaultStoreId);
                        } catch (createError) {
                            console.error("Error creating profile with default storeId:", createError);
                            handleError(createError, 'Admin Profile Creation');
                        }
                    } else {
                        console.error("Error setting default storeId:", error);
                        handleError(error, 'Default Store Assignment');
                    }
                }
            };
            setDefaultStoreId();
        }
    }, [userRole, userStoreId, stores, db, userId, appId, auth]);

    // Logic to update user's initial store ID if their profile was created before stores loaded
    useEffect(() => {
        if (db && auth && userId && Object.keys(stores).length > 0 && userStoreId) {
            // Check if the user's assigned store still exists
            if (!stores[userStoreId]) {
                const updateStoreId = async () => {
                    try {
                        // Ensure stores array is not empty
                        const availableStores = Object.keys(stores);
                        if (availableStores.length === 0) {
                            console.warn("No stores available for reassignment");
                            return;
                        }

                        const newStoreId = availableStores[0];
                        const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
                        
                        // Try to update existing document first
                        await updateDoc(roleDocRef, { storeId: newStoreId });
                        dispatch({ type: 'SET_USER_STORE_ID', payload: newStoreId });
                        console.log(`Updated user store ID from ${userStoreId} to ${newStoreId}`);
                    } catch (error) {
                        // If document doesn't exist, create it with setDoc
                        if (error.code === 'not-found') {
                            try {
                                const availableStores = Object.keys(stores);
                                if (availableStores.length === 0) {
                                    console.warn("No stores available for profile creation");
                                    return;
                                }

                                const newStoreId = availableStores[0];
                                const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
                                await setDoc(roleDocRef, { 
                                    role: userRole || 'staff', 
                                    storeId: newStoreId,
                                    email: auth?.currentUser?.email || null
                                }, { merge: true });
                                dispatch({ type: 'SET_USER_STORE_ID', payload: newStoreId });
                                console.log(`Created profile with store ID: ${newStoreId}`);
                            } catch (createError) {
                                console.error("Error creating profile with new store ID:", createError);
                                handleError(createError, 'Store Reassignment Profile Creation');
                            }
                        } else {
                            console.error("Error updating store ID:", error);
                            handleError(error, 'Store Reassignment');
                        }
                    }
                };
                updateStoreId();
            }
        }
    }, [stores, db, auth, userId, appId, userRole]); // Added role to dependencies


    const calculateSold = useCallback((category, item) => {
        const key = `${category}-${item}`;
        const current = currentStock[key] || 0;
        const yesterday = yesterdayStock[key] || 0;
        // Sold stock = Yesterday's closing stock - Today's current stock
        // This represents what was sold during the day
        return yesterday - current;
    }, [currentStock, yesterdayStock]);

    const soldStockSummary = useMemo(() => {
        let totalSold = 0;
        Object.keys(currentStock).forEach(key => {
            const [category, item] = key.split('-');
            if (category && item) {
                const sold = calculateSold(category, item);
                if (sold > 0) totalSold += sold;
            }
        });
        return totalSold;
    }, [currentStock, calculateSold]);
    
    // 3. Data Fetching (Current & Yesterday's Stock)
    const fetchStockData = useCallback(async (storeId) => {
        if (!db || !storeId) return;

        dispatch({ type: 'SET_LOADING_DATA', payload: true });
        const todayDate = getTodayDate();
        const yesterdayDate = getYesterdayDate();

        try {
            const todayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeId}-${todayDate}`);
            const yesterdayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeId}-${yesterdayDate}`);

            const todaySnap = await getDoc(todayDocRef);
            if (todaySnap.exists()) {
                const data = todaySnap.data().stock;
                dispatch({ type: 'SET_CURRENT_STOCK', payload: data });
            } else {
                dispatch({ type: 'SET_CURRENT_STOCK', payload: getEmptyStock(masterStockList) });
                dispatch({ type: 'SET_ORDER_QUANTITIES', payload: getEmptyStock(masterStockList) });
            }

            const yesterdaySnap = await getDoc(yesterdayDocRef);
            if (yesterdaySnap.exists()) {
                dispatch({ type: 'SET_YESTERDAY_STOCK', payload: yesterdaySnap.data().stock });
            } else {
                dispatch({ type: 'SET_YESTERDAY_STOCK', payload: getEmptyStock(masterStockList) });
            }
        } catch (e) {
            console.error("Error fetching stock data:", e);
        } finally {
            dispatch({ type: 'SET_LOADING_DATA', payload: false });
        }
    }, [db, masterStockList]);

    // Re-fetch data whenever store or auth state changes
    useEffect(() => {
        if (userRole === 'staff' && userStoreId && selectedStoreId !== userStoreId) {
            dispatch({ type: 'SET_SELECTED_STORE_ID', payload: userStoreId });
        }

        if (db && userId && selectedStoreId) {
            fetchStockData(selectedStoreId);
        }
    }, [db, userId, selectedStoreId, fetchStockData, userRole, userStoreId]);

    // Prevent staff from accessing wrong stores via render-time redirect
    useEffect(() => {
        if (userRole === 'staff' && selectedStoreId && selectedStoreId !== userStoreId && view !== 'home') {
            dispatch({ type: 'SET_SELECTED_STORE_ID', payload: userStoreId });
            dispatch({ type: 'SET_VIEW', payload: 'entry' });
        }
    }, [userRole, selectedStoreId, userStoreId, view]);

    // 4. Data Saving (Staff Action)
    const saveStock = async () => {
        try {
            if (!db || !userId || !selectedStoreId) {
                throw new Error("Database or Store not initialized.");
            }

            // VALIDATE STOCK DATA
            const { sanitized, errors } = validateStockData(currentStock);
            
            if (errors.length > 0) {
                showToast(`Validation warnings: ${errors.slice(0, 3).join(', ')}`, 'warning');
            }

            // Count items
            const totalItems = Object.values(sanitized).filter(value => value > 0).length;
            const totalQuantity = Object.values(sanitized).reduce((sum, value) => sum + (value || 0), 0);

            if (totalItems === 0) {
                throw new Error("Please enter at least one stock item before saving.");
            }

            // Confirmation
            const confirmed = await showConfirm({
                title: 'Confirm Stock Entry',
                message: `Store: ${stores[selectedStoreId] || selectedStoreId}\nDate: ${selectedDate}\nItems: ${totalItems}\nTotal: ${totalQuantity}\n\nSave?`, 
                confirmText: 'Save Stock',
                cancelText: 'Cancel',
                confirmColor: 'orange'
            });

            if (!confirmed) return;

            dispatch({ type: 'SET_IS_SAVING', payload: true });

            // SAVE WITH PERFORMANCE MONITORING AND ENHANCED ERROR HANDLING
            await perfMonitor.measureAsync('saveStock', async () => {
                const date = selectedDate;
                const docId = `${selectedStoreId}-${date}`;
                const docRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, docId);

                // ENHANCED RETRY LOGIC FOR FIRESTORE CONNECTION ISSUES
                let lastError;
                const maxRetries = 5;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        console.log(`Save attempt ${attempt}/${maxRetries}`);
                        
                        await setDoc(docRef, {
                            storeId: selectedStoreId,
                            date: date,
                            stock: sanitized,
                            userId: userId,
                            timestamp: new Date().toISOString()
                        });

                        // BACKUP TO LOCAL STORAGE
                        storageBackup.save(`stock_${selectedStoreId}_${date}`, sanitized);
                        
                        console.log("Stock saved successfully on attempt", attempt);
                        break; // Success, exit retry loop
                        
                    } catch (error) {
                        lastError = error;
                        console.warn(`Save attempt ${attempt} failed:`, error);
                        
                        // Check if it's a connection-related error
                        const isConnectionError = 
                            error.code === 'unavailable' ||
                            error.code === 'deadline-exceeded' ||
                            error.code === 'aborted' ||
                            error.message.includes('NS_BINDING_ABORTED') ||
                            error.message.includes('network') ||
                            error.message.includes('timeout') ||
                            error.message.includes('connection');
                        
                        if (!isConnectionError) {
                            // Non-connection error, don't retry
                            throw error;
                        }
                        
                        if (attempt < maxRetries) {
                            // Wait before retrying (exponential backoff)
                            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s
                            console.log(`Retrying in ${delay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                
                // If we get here and lastError exists, all retries failed
                if (lastError) {
                    throw new Error(`Failed to save after ${maxRetries} attempts. Last error: ${lastError.message}`);
                }
            });

            showToast('Stock saved successfully!', 'success');
            dispatch({ type: 'SET_HAS_SAVE_ERROR', payload: false }); // Clear any previous save errors
        } catch (error) {
            console.error('Stock save error:', error);
            
            // Enhanced error messages for different error types
            let errorMessage = 'Error saving stock';
            let isConnectionError = false;
            
            if (error.message.includes('NS_BINDING_ABORTED') || error.message.includes('network')) {
                errorMessage = 'Network connection lost. Please check your internet connection and try again.';
                isConnectionError = true;
            } else if (error.message.includes('permission-denied')) {
                errorMessage = 'Permission denied. Please contact your administrator.';
            } else if (error.message.includes('unauthenticated')) {
                errorMessage = 'Authentication expired. Please log in again.';
            } else if (error.message.includes('Failed to save after')) {
                errorMessage = 'Unable to save due to connection issues. Please try again later.';
                isConnectionError = true;
            } else {
                errorMessage = error.message || 'Unknown error occurred while saving.';
            }
            
            // Set save error state for connection issues
            if (isConnectionError) {
                dispatch({ type: 'SET_HAS_SAVE_ERROR', payload: true });
            }
            
            handleError(error, 'Stock Saving');
            showToast(errorMessage, 'error');
        } finally {
            dispatch({ type: 'SET_IS_SAVING', payload: false });
        }
    };

    // 6. Data Export Function (Admin Action)
    const exportStockData = useCallback(() => {
        if (userRole !== 'admin') {
            handleError(new Error('Only admins can export data'), 'Data Export');
            return;
        }

        try {
            const storeName = stores[selectedStoreId] || selectedStoreId;
            const exportData = {
                store: storeName,
                date: selectedDate,
                exportTimestamp: new Date().toISOString(),
                currentStock: currentStock,
                yesterdayStock: yesterdayStock,
                calculatedSold: {},
                summary: {
                    totalCurrentItems: Object.values(currentStock).filter(v => v > 0).length,
                    totalCurrentQuantity: Object.values(currentStock).reduce((sum, v) => sum + (v || 0), 0),
                    totalYesterdayItems: Object.values(yesterdayStock).filter(v => v > 0).length,
                    totalYesterdayQuantity: Object.values(yesterdayStock).reduce((sum, v) => sum + (v || 0), 0)
                }
            };

            // Calculate sold stock for each item
            Object.keys(masterStockList).forEach(category => {
                masterStockList[category].forEach(item => {
                    const key = `${category}-${item}`;
                    const current = currentStock[key] || 0;
                    const yesterday = yesterdayStock[key] || 0;
                    exportData.calculatedSold[key] = yesterday - current;
                });
            });

            // Create and download JSON file
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `stock-data-${storeName}-${selectedDate}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('Stock data exported successfully');
        } catch (error) {
            handleError(error, 'Data Export');
        }
    }, [userRole, stores, selectedStoreId, selectedDate, currentStock, yesterdayStock, masterStockList]);

    // 5. Order Output Generation (Admin Action)
    const generateOrderOutput = useCallback(() => {
        const storeName = stores[selectedStoreId] || selectedStoreId;
        let output = `${storeName}\n`;

        // Generate MILKSHAKE section
        if (masterStockList.MILKSHAKE && masterStockList.MILKSHAKE.length > 0) {
            output += ` *MILKSHAKE* `;
            const milkshakeItems = masterStockList.MILKSHAKE.map(item => {
                const key = `MILKSHAKE-${item}`;
                const quantity = orderQuantities[key] || 0;
                return `${item} - ${quantity}`;
            });
            output += milkshakeItems.join(' - ') + ' -\n';
        }

        // Generate ICE CREAM section
        if (masterStockList['ICE CREAM'] && masterStockList['ICE CREAM'].length > 0) {
            output += ` *ICE CREAM*`;
            const iceCreamItems = masterStockList['ICE CREAM'].map(item => {
                const key = `ICE CREAM-${item}`;
                const quantity = orderQuantities[key] || 0;
                return `${item} - ${quantity}`;
            });
            output += iceCreamItems.join(' - ') + ' -\n';
        }

        // Generate TOPPINGS section
        if (masterStockList.TOPPINGS && masterStockList.TOPPINGS.length > 0) {
            output += ` *TOPPINGS* `;
            const toppingItems = masterStockList.TOPPINGS.map(item => {
                const key = `TOPPINGS-${item}`;
                const quantity = orderQuantities[key] || 0;
                return `${item} - ${quantity}`;
            });
            output += toppingItems.join(' - ') + ' -\n';
        }

        // Generate MISC section
        if (masterStockList.MISC && masterStockList.MISC.length > 0) {
            const miscItems = masterStockList.MISC.map(item => {
                const key = `MISC-${item}`;
                const quantity = orderQuantities[key] || 0;
                return `${item} - ${quantity}`;
            });
            output += miscItems.join(' - ') + ' -\n';
        }

        output += '\n';

        // Output logic for Kumar Parisar only if Venkateshwara Hospitality (store-1) is selected
        if (selectedStoreId === 'store-1' && stores['store-2']) {
            output += stores['store-2'];
            output += '\n';
        }

        return output.trim();
    }, [orderQuantities, selectedStoreId, stores, masterStockList]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            window.location.reload(); 
        }
    };

    // Toast helper functions
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    }, []);

    const removeToast = useCallback((id) => {
        dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, []);

    const showConfirm = useCallback((options) => {
        return new Promise((resolve) => {
            dispatch({ type: 'SET_CONFIRM_DIALOG', payload: {
                ...options,
                onConfirm: () => {
                    dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
                    resolve(true);
                },
                onCancel: () => {
                    dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
                    resolve(false);
                }
            }});
        });
    }, []);

    const handleAuthSuccess = (user, username) => {
        if (user) {
            const fetchProfile = async () => {
                const roleDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_config`, 'profile');
                const roleSnap = await getDoc(roleDocRef);
                
                if (roleSnap.exists()) {
                    dispatch({ type: 'SET_USER_ROLE', payload: roleSnap.data().role });
                    dispatch({ type: 'SET_USER_STORE_ID', payload: roleSnap.data().storeId || null });
                } else {
                    // This is the first admin registration flow
                    const defaultRole = 'admin'; 
                    const defaultStoreId = Object.keys(stores).length > 0 ? Object.keys(stores)[0] : null;
                    
                    // Create the user profile
                    await setDoc(roleDocRef, { role: defaultRole, storeId: defaultStoreId, username: username }, { merge: true });
                    
                    // *** SET THE SETUP COMPLETE FLAG ***
                    const setupDocRef = doc(db, `artifacts/${appId}/public`, 'config');
                    await setDoc(setupDocRef, {
                        completed: true,
                        firstAdminId: user.uid,
                        timestamp: new Date().toISOString()
                    });

                    dispatch({ type: 'SET_USER_ROLE', payload: defaultRole });
                    dispatch({ type: 'SET_USER_STORE_ID', payload: defaultStoreId });
                    dispatch({ type: 'SET_IS_FIRST_USER', payload: false }); // Update state to prevent future registrations
                }
                dispatch({ type: 'SET_SHOW_AUTH_MODAL', payload: false });
            };
            fetchProfile();
        }
    };

    // --- Error Display Component ---
    const ErrorDisplay = ({ error, onRetry, onDismiss }) => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-xl shadow-xl border-t-4 border-red-500 p-6 text-center">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto mb-4">
                        <X className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-4">{error.message}</p>
                    <div className="text-xs text-gray-500 mb-4">
                        <p>Context: {error.context}</p>
                        <p>Time: {new Date(error.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-3">
                        {error.retryable && (
                            <button
                                onClick={onRetry}
                                disabled={isRetrying}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-150"
                            >
                                {isRetrying ? 'Retrying...' : 'Try Again'}
                            </button>
                        )}
                        <button
                            onClick={onDismiss}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-150"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- Process Flow Display ---
    const ProcessFlowDisplay = ({ step }) => {
        const steps = {
            'initializing': { text: 'Initializing Firebase...', color: 'blue' },
            'authenticating': { text: 'Please log in to continue', color: 'orange' },
            'loading-data': { text: 'Loading your data...', color: 'green' },
            'ready': { text: 'Ready!', color: 'green' },
            'error': { text: 'Error occurred', color: 'red' }
        };

        const currentStep = steps[step] || steps['initializing'];
        
        return (
            <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${currentStep.color}-500`}></div>
                    <span className="text-sm font-medium text-gray-700">{currentStep.text}</span>
                </div>
            </div>
        );
    };

    // --- View Rendering Logic ---

    // Show error screen if there's an error
    if (appError) {
        return (
            <>
                <ProcessFlowDisplay step="error" />
                <ErrorDisplay 
                    error={appError} 
                    onRetry={() => retryOperation(() => window.location.reload())}
                    onDismiss={clearError}
                />
            </>
        );
    }

    if (!isAuthReady || processStep === 'initializing') {
        return (
            <>
                <ProcessFlowDisplay step={processStep} />
                <LoadingSpinner />
            </>
        );
    }

    // Show loading only for data fetching, not initial setup
    if (loadingData && selectedStoreId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin w-10 h-10 mb-4 text-orange-600 mx-auto" />
                    <p className="text-xl font-display text-gray-700">Loading stock data...</p>
                </div>
            </div>
        );
    }

    // If no user is authenticated, show login screen immediately
    if (!userId || !userRole) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-xl shadow-xl border-t-4 border-orange-600 p-6 text-center">
                        <h1 className="text-3xl font-bold font-display text-orange-600 mb-2">Sujata Mastani</h1>
                        <p className="text-gray-600 mb-6">Inventory Management System</p>
                        <p className="text-gray-700 font-medium mb-4">Please log in or register the Super Admin account to access the app features.</p>
                        <button
                            onClick={() => dispatch({ type: 'SET_SHOW_AUTH_MODAL', payload: true })}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition duration-150 shadow-md flex items-center justify-center text-lg font-display"
                        >
                            <User className="w-5 h-5 mr-2" /> Log In / Register
                        </button>
                    </div>
                </div>
                
                {showAuthModal && (
                    <AuthModal 
                        auth={auth} 
                        onClose={() => dispatch({ type: 'SET_SHOW_AUTH_MODAL', payload: false })}
                        onLoginSuccess={handleAuthSuccess}
                        isFirstUser={isFirstUser}
                    />
                )}
            </div>
        );
    }

    // If stores haven't loaded yet but user is authenticated, show minimal loading
    if (!storesLoaded && userId && userRole) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin w-10 h-10 mb-4 text-orange-600 mx-auto" />
                    <p className="text-xl font-display text-gray-700">Loading stores...</p>
                </div>
            </div>
        );
    }

    // --- Home/Selector View ---
    const HomeView = () => (
        <div className="p-4 space-y-6">
             <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-3xl font-bold font-display text-orange-600 mb-1">Sujata Mastani</h2>
                <p className="text-gray-600 text-sm">{userRole ? `Logged in as ${userRole.toUpperCase()}. Select your outlet.` : 'Secure Login Required'}</p>
            </div>

            <div className="space-y-4">
                {Object.entries(stores).length > 0 ? (
                    Object.entries(stores).map(([id, name]) => {
                        const isAssignedToStore = userRole === 'admin' || userStoreId === id;
                        
                        if (userRole === 'staff' && userStoreId !== id) return null;

                        return (
                            <div 
                                key={id} 
                                className={`bg-white rounded-xl p-4 shadow-lg transition-shadow hover:shadow-xl border-l-4 ${isAssignedToStore ? 'border-orange-600' : 'border-gray-300 opacity-80'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                                        <Home className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-display text-lg font-bold text-gray-900">{name}</p>
                                        {userRole === 'staff' && <span className="text-xs font-semibold text-green-600">Your Assigned Store</span>}
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 mt-3 pt-3">
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => { dispatch({ type: 'SET_SELECTED_STORE_ID', payload: id }); dispatch({ type: 'SET_VIEW', payload: 'entry' }); }}
                                            className="flex flex-1 items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-700"
                                        >
                                            <List className="w-4 h-4 mr-2" /> Stock Entry
                                        </button>
                                        {userRole === 'admin' && (
                                            <button
                                                onClick={() => { dispatch({ type: 'SET_SELECTED_STORE_ID', payload: id }); dispatch({ type: 'SET_VIEW', payload: 'admin' }); }}
                                                className="flex flex-1 items-center justify-center rounded-lg border border-orange-600/50 bg-white px-4 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
                                            >
                                                <User className="w-4 h-4 mr-2" /> Admin Functions
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                <Store className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-bold text-gray-900 mb-2">No Stores Found</h3>
                                <p className="text-gray-600 mb-4">
                                    {userRole === 'admin' 
                                        ? 'Create your first store to get started with inventory management.'
                                        : 'No stores have been assigned to you yet. Contact your administrator.'
                                    }
                                </p>
                                {userRole === 'admin' && (
                                    <button
                                        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'storemanager' })}
                                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 shadow-md flex items-center justify-center mx-auto"
                                    >
                                        <Store className="w-5 h-5 mr-2" /> Create Store
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <p className="text-xs text-gray-500 pt-4 border-t border-gray-200 mt-4">
                User ID: {userId || 'N/A'}
            </p>
        </div>
    );

    // --- Admin Functions View ---
    const AdminFunctionsView = () => {
        const storeName = stores[selectedStoreId] || 'Selected Store';
        
        const AdminButton = ({ icon: Icon, label, viewName }) => (
            <button
                onClick={() => dispatch({ type: 'SET_VIEW', payload: viewName })}
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg transition-shadow hover:shadow-xl border-l-4 border-orange-600 text-center w-full"
            >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 mb-3">
                    <Icon className="w-6 h-6" />
                </div>
                <p className="font-display text-lg font-bold text-gray-900">{label}</p>
            </button>
        );

        return (
            <div className="p-4 space-y-6">
                <div className="text-center p-4 bg-white rounded-xl shadow-lg border-b-4 border-orange-600">
                    <h2 className="text-2xl font-bold font-display text-gray-900">Admin Functions</h2>
                    <p className="text-gray-600 text-sm">for {storeName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <AdminButton icon={ShoppingCart} label="Order" viewName="order" />
                    <AdminButton icon={TrendingDown} label="Sold Report" viewName="sold" />
                    <AdminButton icon={UserPlus} label="User Manager" viewName="usermanager" />
                    <AdminButton icon={Store} label="Store Manager" viewName="storemanager" />
                    <AdminButton icon={List} label="Item Manager" viewName="itemmanager" />
                </div>
            </div>
        );
    };

    // --- Navigation Bar (Footer) ---
    const NavBar = ({ currentView }) => (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200">
            <nav className="flex justify-around items-center h-16 max-w-lg mx-auto">
                <NavButton
                    icon={Home}
                    label="Home"
                    active={currentView === 'home'}
                    onClick={() => { dispatch({ type: 'SET_VIEW', payload: 'home' }); dispatch({ type: 'SET_SELECTED_STORE_ID', payload: '' }); }}
                />

                {selectedStoreId && (
                    <NavButton
                        icon={List}
                        label="Entry"
                        active={currentView === 'entry'}
                        onClick={() => dispatch({ type: 'SET_VIEW', payload: 'entry' })}
                    />
                )}

                {userRole === 'admin' && (
                    <>
                        <NavButton
                            icon={Store} // New Store Management Button
                            label="Stores"
                            active={currentView === 'storemanager'}
                            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'storemanager' })}
                        />
                        <NavButton
                            icon={UserPlus}
                            label="Users"
                            active={currentView === 'usermanager'}
                            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'usermanager' })}
                        />
                        <NavButton
                            icon={List}
                            label="Items"
                            active={currentView === 'itemmanager'}
                            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'itemmanager' })}
                        />
                        
                        {selectedStoreId && (
                            <>
                                <NavButton
                                    icon={TrendingDown}
                                    label="Sold"
                                    active={currentView === 'sold'}
                                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'sold' })}
                                />
                                <NavButton
                                    icon={ShoppingCart}
                                    label="Order"
                                    active={currentView === 'order'}
                                    onClick={() => dispatch({ type: 'SET_VIEW', payload: 'order' })}
                                />
                            </>
                        )}
                    </>
                )}
            </nav>
        </div>
    );

    const NavButton = ({ icon: Icon, label, active, onClick, disabled }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center p-1 transition duration-200 w-1/5 ${active ? 'text-orange-600 font-bold' : 'text-gray-500 hover:text-orange-500'} ${disabled ? 'opacity-50' : ''}`}
        >
            <Icon className="w-6 h-6" />
            <span className="text-xs mt-0.5">{label}</span>
        </button>
    );

    // --- Main Renderer ---
    const renderView = () => {
        if (view === 'home') {
            return <HomeView />;
        }
        
        const storeName = stores[selectedStoreId] || 'Unknown Store';
        const isAdmin = userRole === 'admin';

        // Staff access control is now handled in useEffect above
        switch (view) {
            case 'admin': // ADD THIS NEW CASE
                if (!isAdmin) return <HomeView />;
                return <AdminFunctionsView />;
            case 'storemanager':
                if (!isAdmin) return <HomeView />;
                return <StoreManagementView db={db} appId={appId} stores={stores} showToast={showToast} showConfirm={showConfirm} />;
            case 'usermanager':
                if (!isAdmin) return <HomeView />;
                return <AdminUserManagementView db={db} appId={appId} stores={stores} auth={auth} exportStockData={exportStockData} showToast={showToast} />;
            case 'itemmanager':
                if (!isAdmin) return <HomeView />;
                return <StockItemManagementView masterStockList={masterStockList} setMasterStockList={(list) => dispatch({ type: 'SET_MASTER_STOCK_LIST', payload: list })} showToast={showToast} showConfirm={showConfirm} />;
            case 'entry':
                return (
                    <StockEntryView
                        storeId={storeName}
                        stockData={currentStock}
                        setStockData={(data) => dispatch({ type: 'SET_CURRENT_STOCK', payload: data })}
                        saveStock={saveStock}
                        isSaving={isSaving}
                        selectedDate={selectedDate}
                        setSelectedDate={(date) => dispatch({ type: 'SET_SELECTED_DATE', payload: date })}
                        showToast={showToast}
                        masterStockList={masterStockList}
                        hasSaveError={hasSaveError}
                    />
                );
            case 'sold':
                if (!isAdmin) return <HomeView />;
                return (
                    <StockSoldView
                        currentStock={currentStock}
                        yesterdayStock={yesterdayStock}
                        calculateSold={calculateSold}
                        soldStockSummary={soldStockSummary}
                        masterStockList={masterStockList}
                    />
                );
            case 'order':
                if (!isAdmin) return <HomeView />;
                return (
                    <OrderingView
                        currentStock={currentStock}
                        orderQuantities={orderQuantities}
                        setOrderQuantities={(quantities) => dispatch({ type: 'SET_ORDER_QUANTITIES', payload: quantities })}
                        generateOrderOutput={generateOrderOutput}
                        showToast={showToast}
                        masterStockList={masterStockList}
                    />
                );
            default:
                return <HomeView />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased pb-20">
            {/* Only show ProcessFlowDisplay when not ready or in error state */}
            {(processStep !== 'ready' || appError) && <ProcessFlowDisplay step={processStep} />}
            
            {/* Toast Container and Confirmation Modal */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            {confirmDialog && <ConfirmModal {...confirmDialog} />}
            
            {/* Network Status Banner */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
                    <span className="text-sm font-medium">⚠️ You are offline. Some features may not work.</span>
                </div>
            )}
            
            <style>
            {`
                /* Font imports */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@700;800&display=swap');
                
                body {
                    font-family: 'Inter', sans-serif;
                    background-color: #F8FAFC; 
                }
                .font-display {
                    font-family: 'Poppins', sans-serif; 
                }
                
                /* Global CSS Hacks */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
                
                /* Toast Animations */
                @keyframes slideInRight {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .animate-slideInRight {
                    animation: slideInRight 0.3s ease-out;
                }

                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
                
                /* Global Number Input Reset */
                input[type="number"]::-webkit-inner-spin-button, 
                input[type="number"]::-webkit-outer-spin-button { 
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                    font-size: 16px; /* Prevent iOS zoom on focus */
                }
                
                /* Mobile-specific styles to prevent zoom */
                @media screen and (max-width: 768px) {
                    input[type="number"], input[type="date"], input[type="email"], input[type="password"], input[type="text"] {
                        font-size: 16px !important;
                    }
                }
            `}
            </style>

            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
                <h1 className="text-xl font-bold font-display text-gray-900 tracking-wider">
                    {selectedStoreId ? stores[selectedStoreId] : 'SUJATA MASTANI'}
                </h1>
                <div className="flex items-center space-x-3">
                    {userRole && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${userRole === 'admin' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {userRole.toUpperCase()}
                        </span>
                    )}
                    {userId && (
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition duration-150 shadow-md"
                            aria-label="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-lg mx-auto pt-2 pb-4 overflow-y-auto">
                {renderView()}
            </main>

            {auth?.currentUser?.uid && <NavBar currentView={view} />}
        </div>
    );
};

export default App;