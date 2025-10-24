import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
// Replaced lucide icons with standard icon names for theme consistency
import { User, Home, List, ShoppingCart, Loader, TrendingDown, LogOut, UserPlus, X, Store, Trash2 } from 'lucide-react'; 

// Import utility functions
import { validateStockData, validateUserCredentials, validateStoreData, RateLimiter } from './utils/validation-utils';
import { safeTransaction, retryOperation, DocumentCache } from './utils/firestore-utils';
import { storageBackup, recoverFromBackup } from './utils/storage-backup';
import { perfMonitor, getMemoryInfo, getNetworkSpeed } from './utils/performance-monitor'; 

// --- Global Constants and Firebase Setup ---

// These global variables are provided by the canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sujata-mastani-inventory';

// Default Firebase configuration
const defaultFirebaseConfig = {
    apiKey: "AIzaSyDZt6n1QSGLq_PyLDYQlayFwMK0Qv7gpmE",
    authDomain: "sujata-inventory.firebaseapp.com",
    projectId: "sujata-inventory",
    storageBucket: "sujata-inventory.firebasestorage.app",
    messagingSenderId: "527916478889",
    appId: "1:527916478889:web:7043c7d45087ee452bd4b8",
    measurementId: "G-BC3JXRWDVH"
};

// Parse and validate Firebase config
let firebaseConfig = defaultFirebaseConfig;
try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        const parsedConfig = JSON.parse(__firebase_config);
        // Ensure all required fields are present
        firebaseConfig = {
            apiKey: parsedConfig.apiKey || defaultFirebaseConfig.apiKey,
            authDomain: parsedConfig.authDomain || defaultFirebaseConfig.authDomain,
            projectId: parsedConfig.projectId || defaultFirebaseConfig.projectId,
            storageBucket: parsedConfig.storageBucket || defaultFirebaseConfig.storageBucket,
            messagingSenderId: parsedConfig.messagingSenderId || defaultFirebaseConfig.messagingSenderId,
            appId: parsedConfig.appId || defaultFirebaseConfig.appId,
            measurementId: parsedConfig.measurementId || defaultFirebaseConfig.measurementId
        };
    }
} catch (error) {
    console.warn('Failed to parse __firebase_config, using default config:', error);
}

// Validate Firebase config before use
if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !firebaseConfig.appId) {
    console.error('Invalid Firebase configuration:', firebaseConfig);
    throw new Error('Firebase configuration is missing required fields');
}

console.log('Firebase Config Loaded:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey
});

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; 

// The main list of stock items based on your paper and required output format
const MASTER_STOCK_LIST = {
  MILKSHAKE: [
    'Mango', 'Rose', 'Pineapple', 'Khus', 'Vanilla', 'Kesar', 'Chocolate', 'Butterscotch',
    'Kesar Mango', 'Strawberry', 'Fresh Sitaphal (Seasonal)', 'Fresh Strawberry (Seasonal)',
  ],
  'ICE CREAM': [
    'Mango', 'Pista', 'Pineapple', 'Vanilla', 'Rose', 'Orange', 'Keshar Pista', 'Chocolate',
    'Strawberry', 'Butterscotch', 'Dry Anjir', 'Coffee Chips', 'Chocolate Fudge Badam',
    'Chocolate Choco Chips', 'Kaju Draksha', 'Gulkand', 'Jagdalu', 'VOP', 'Peru',
    'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Mango Bites',
  ],
  TOPPINGS: [
    'Dry Fruit', 'Pista', 'Badam', 'Pista Powder', 'Cherry'
  ],
  MISC: [
    'Ice Cream Dabee', 'Ice Cream Spoons', 'Paper Straw', 'Ice Creap Cup', 'Ice Cream Container'
  ]
};

// --- Utility Functions ---

const getEmptyStock = () => {
  const stock = {};
  Object.keys(MASTER_STOCK_LIST).forEach(category => {
    MASTER_STOCK_LIST[category].forEach(item => {
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

// --- Custom Components ---

/**
 * Custom Input component for consistent styling
 */
const StockInput = ({ label, value, onChange, placeholder = '0' }) => (
    // Updated Input Styling for Stitch UI
    <div className="flex items-center justify-between p-3 bg-white rounded-lg mb-2 border border-gray-100">
        <label className="text-sm font-medium text-gray-800 w-1/2 overflow-hidden whitespace-nowrap text-ellipsis pr-2">{label}</label>
        <input
            type="number"
            min="0"
            step="0.01"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder={placeholder}
            // Removed complex CSS hacks here; relying on global style block
            className="w-1/3 p-2 text-base text-right bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150 shadow-inner"
        />
    </div>
);

/**
 * Universal Modal Component (Used instead of alert/confirm)
 */
const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative border border-orange-100">
            <h3 className="text-2xl font-bold font-display text-orange-700 border-b border-gray-200 pb-3 mb-4">{title}</h3>
            {children}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-orange-600 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>
    </div>
);

/**
 * Toast Notification Component
 */
const Toast = ({ message, type = 'success', onClose }) => {
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);
    
    return (
        <div className="fixed top-4 right-4 z-50 animate-slideInRight">
            <div className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}>
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-xl font-bold">
                    {icons[type]}
                </div>
                <p className="flex-1 font-medium">{message}</p>
                <button 
                    onClick={onClose}
                    className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

/**
 * Toast Container - manages multiple toasts
 */
const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

/**
 * Confirmation Modal Component (replaces browser confirm)
 */
const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'orange' }) => {
    const colorClasses = {
        orange: 'bg-orange-600 hover:bg-orange-700',
        red: 'bg-red-600 hover:bg-red-700',
        green: 'bg-green-600 hover:bg-green-700'
    };
    
    return (
        <Modal title={title} onClose={onCancel}>
            <p className="text-gray-700 mb-6 text-base leading-relaxed">{message}</p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition duration-150"
                >
                    {cancelText}
                </button>
                <button
                    onClick={onConfirm}
                    className={`flex-1 py-3 ${colorClasses[confirmColor]} text-white font-bold rounded-xl transition duration-150 shadow-lg`}
                >
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
};

/**
 * Loading state component
 */
const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 text-orange-600">
        <Loader className="animate-spin w-10 h-10 mb-4 text-orange-600" />
        <p className="text-xl font-display text-gray-700">Initializing Secure App...</p>
    </div>
);

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
    const [isAdding, setIsAdding] = useState(false);

    const handleAddStore = async (e) => {
        e.preventDefault();
        setIsAdding(true);

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
            setIsAdding(false);
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
            console.error("Error deleting store:", error);
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
                    disabled={isAdding}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg"
                >
                    {isAdding ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <Store className="w-5 h-5 mr-2" />}
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


// --- Admin User Management Component ---

const AdminUserManagementView = ({ db, appId, stores, auth, exportStockData, showToast }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('staff');
    const [storeId, setStoreId] = useState(Object.keys(stores)[0]);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);

        // VALIDATE CREDENTIALS
        const validationErrors = validateUserCredentials(username, password);
        if (validationErrors.length > 0) {
            showToast(validationErrors.join(', '), 'error');
            setIsCreating(false);
            return;
        }

        try {
            const fakeEmail = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
            const newUser = userCredential.user;

            const userConfigRef = doc(db, `artifacts/${appId}/users/${newUser.uid}/user_config`, 'profile');
            await setDoc(userConfigRef, {
                role: role,
                storeId: storeId,
                username: username.trim(),
            }, { merge: true });

            showToast(`User ${username} created successfully!`, 'success');
            setUsername('');
            setPassword('');
        } catch (error) {
            console.error("Error creating user:", error);
            showToast(`Failed: ${error.message.replace('Firebase: Error (auth/', '').replace(').', '')}`, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const SelectField = ({ label, value, onChange, children }) => (
        <label className="flex flex-col min-w-40 flex-1">
            <p className="text-sm font-semibold text-orange-700/80 leading-normal pb-2">{label}</p>
            <select
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900 transition-all duration-300"
                value={value}
                onChange={onChange}
            >
                {children}
            </select>
        </label>
    );

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
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g., staff.kothrud"
                    />
                    <InputField
                        label="Password (Min 6 chars)"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        minLength="6"
                    />
                </div>
                
                <div className="flex space-x-4">
                    <SelectField
                        label="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
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
const StockEntryView = ({ storeId, stockData, setStockData, saveStock, isSaving, selectedDate, setSelectedDate, showToast, masterStockList }) => {
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
const OrderingView = ({ currentStock, orderQuantities, setOrderQuantities, generateOrderOutput, showToast, masterStockList, db, appId, selectedStoreId, stores }) => {
    const [showOutputModal, setShowOutputModal] = useState(false);
    const [nextDayInfo, setNextDayInfo] = useState(null);
    const [weatherInfo, setWeatherInfo] = useState(null);
    const [loadingWeather, setLoadingWeather] = useState(true);

    // Load next day info and weather on component mount
    useEffect(() => {
        const loadNextDayInfo = async () => {
            // Import dynamically to avoid initial load issues
            const { getNextDayInfo } = await import('./utils/calendar-utils');
            const { getWeatherForecast, getWeatherEmoji, getBusinessRecommendation } = await import('./utils/weather-utils');
            
            const info = getNextDayInfo();
            setNextDayInfo(info);
            
            setLoadingWeather(true);
            const weather = await getWeatherForecast();
            setWeatherInfo({
                ...weather,
                emoji: getWeatherEmoji(weather.icon || weather.mockData?.icon),
                recommendation: getBusinessRecommendation(weather)
            });
            setLoadingWeather(false);
        };
        
        loadNextDayInfo();
    }, []);

    const saveOrderToFirestore = async (orderData, output) => {
        if (!db || !selectedStoreId) return;
        
        try {
            const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
            await addDoc(ordersColRef, {
                storeId: selectedStoreId,
                storeName: stores[selectedStoreId] || selectedStoreId,
                orderDate: new Date().toISOString(),
                deliveryDate: nextDayInfo?.date?.toISOString() || new Date().toISOString(),
                orderQuantities: orderData,
                orderText: output,
                weather: weatherInfo,
                holidays: nextDayInfo?.holidays || [],
                timestamp: new Date().toISOString()
            });
            console.log('Order saved to Firestore');
        } catch (error) {
            console.error('Error saving order:', error);
        }
    };

    const handleOutput = async () => {
        const output = generateOrderOutput();

        // Save to Firestore
        await saveOrderToFirestore(orderQuantities, output);

        // Fallback for copying to clipboard
        const textArea = document.createElement("textarea");
        textArea.value = output;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Order saved and copied to clipboard!', 'success');
        } catch (err) {
            showToast('Order saved but failed to copy. Please copy manually.', 'error');
        }
        document.body.removeChild(textArea);
        setShowOutputModal(true);
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Order Management</h2>
            
            {/* Next Day Information Card */}
            {nextDayInfo && (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl shadow-lg border border-orange-200">
                    <h3 className="text-lg font-bold text-orange-800 mb-2">📅 Ordering for Tomorrow</h3>
                    <div className="space-y-2">
                        <p className="text-base font-semibold text-gray-900">
                            {nextDayInfo.dateStr} - <span className="text-orange-600">{nextDayInfo.dayName}</span>
                        </p>
                        
                        {nextDayInfo.isWeekend && (
                            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg inline-block text-sm font-medium">
                                🎉 Weekend - Higher demand expected!
                            </div>
                        )}
                        
                        {nextDayInfo.holidays.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {nextDayInfo.holidays.map((holiday, idx) => (
                                    <div key={idx} className={`${holiday.type === 'public' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'} px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}>
                                        <span>🎊</span>
                                        <span>{holiday.name}</span>
                                        <span className="text-xs">({holiday.type === 'public' ? 'Public Holiday' : 'Festival'})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Weather Forecast Card */}
            {weatherInfo && (
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl shadow-lg border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-800 mb-2">🌤️ Weather Forecast for Tomorrow</h3>
                    {loadingWeather ? (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Loader className="animate-spin w-4 h-4" />
                            <span>Loading weather...</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {nextDayInfo && (
                                <p className="text-xs font-semibold text-blue-700 mb-1">
                                    For {nextDayInfo.dateStr} ({nextDayInfo.dayName})
                                </p>
                            )}
                            <div className="flex items-center gap-3">
                                <span className="text-4xl">{weatherInfo.emoji}</span>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {weatherInfo.temp || weatherInfo.mockData?.temp}°C
                                    </p>
                                    <p className="text-sm text-gray-600 capitalize">
                                        {weatherInfo.description || weatherInfo.mockData?.description}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 text-sm text-gray-700">
                                <span>Min: {weatherInfo.tempMin || weatherInfo.mockData?.tempMin}°C</span>
                                <span>Max: {weatherInfo.tempMax || weatherInfo.mockData?.tempMax}°C</span>
                                <span>Humidity: {weatherInfo.humidity || weatherInfo.mockData?.humidity}%</span>
                            </div>
                            
                            {weatherInfo.recommendation && (
                                <div className={`bg-${weatherInfo.recommendation.color}-100 text-${weatherInfo.recommendation.color}-800 px-3 py-2 rounded-lg text-sm font-medium mt-2`}>
                                    {weatherInfo.recommendation.message}
                                </div>
                            )}
                            
                            {weatherInfo.success && (
                                <p className="text-xs text-gray-500 mt-2">
                                    ℹ️ Data from Open-Meteo (IMD & Global Met Services)
                                </p>
                            )}
                            {!weatherInfo.success && (
                                <p className="text-xs text-gray-500 mt-2">
                                    ℹ️ Using estimated weather data. Service temporarily unavailable.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

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


/**
 * Order Statistics View - Detailed breakdown of daily orders
 */
const OrderStatsView = ({ db, appId, selectedStoreId, stores, showToast, masterStockList }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [dateOrders, setDateOrders] = useState([]);

    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                const querySnapshot = await getDocs(ordersColRef);
                
                const ordersData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        ordersData.push({ id: doc.id, ...data });
                    }
                });

                // Sort by order date descending (newest first)
                ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                setOrders(ordersData);
                
                // Set today's date as default
                if (ordersData.length > 0) {
                    const latestDate = new Date(ordersData[0].orderDate).toISOString().split('T')[0];
                    setSelectedDate(latestDate);
                }
            } catch (error) {
                console.error('Error loading orders:', error);
                showToast('Failed to load order statistics', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, [db, appId, selectedStoreId]);

    // Get unique dates from orders
    const uniqueDates = useMemo(() => {
        const dates = orders.map(order => new Date(order.orderDate).toISOString().split('T')[0]);
        return [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
    }, [orders]);

    // Get orders for selected date
    useEffect(() => {
        if (selectedDate) {
            const filtered = orders.filter(order => {
                const orderDate = new Date(order.orderDate).toISOString().split('T')[0];
                return orderDate === selectedDate;
            });
            setDateOrders(filtered);
        }
    }, [selectedDate, orders]);

    // Calculate totals for selected date
    const dateSummary = useMemo(() => {
        if (dateOrders.length === 0) return null;

        const totalsByItem = {};
        let grandTotal = 0;

        dateOrders.forEach(order => {
            if (order.orderQuantities) {
                Object.entries(order.orderQuantities).forEach(([key, qty]) => {
                    if (qty > 0) {
                        totalsByItem[key] = (totalsByItem[key] || 0) + qty;
                        grandTotal += qty;
                    }
                });
            }
        });

        return {
            totalsByItem,
            grandTotal,
            orderCount: dateOrders.length
        };
    }, [dateOrders]);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-3 text-orange-600" /> Order Statistics
            </h2>
            <p className="text-sm text-gray-600">
                Daily breakdown of ordered items for <span className="font-semibold">{stores[selectedStoreId]}</span>
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                    <span className="text-gray-600">Loading order statistics...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No orders found for this store</p>
                    <p className="text-sm text-gray-500 mt-2">Order statistics will appear here once you generate orders</p>
                </div>
            ) : (
                <>
                    {/* Date Selector */}
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Date
                        </label>
                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full p-3 text-base bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition duration-150"
                        >
                            {uniqueDates.map(date => (
                                <option key={date} value={date}>
                                    {formatDate(date)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Summary Card */}
                    {dateSummary && (
                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl shadow-lg border border-orange-200">
                            <h3 className="text-lg font-bold text-orange-800 mb-4">Summary for {formatDate(selectedDate)}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Total Orders</p>
                                    <p className="text-3xl font-bold text-orange-600">{dateSummary.orderCount}</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Total Items</p>
                                    <p className="text-3xl font-bold text-green-600">{dateSummary.grandTotal}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Individual Orders */}
                    {dateOrders.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">Orders on this day ({dateOrders.length})</h3>
                            {dateOrders.map((order, idx) => (
                                <div key={order.id} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-base font-semibold text-gray-900">Order #{idx + 1}</h4>
                                        <span className="text-sm text-gray-500">{formatTime(order.orderDate)}</span>
                                    </div>
                                    
                                    {order.holidays && order.holidays.length > 0 && (
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            {order.holidays.map((holiday, hidx) => (
                                                <span key={hidx} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                                    🎊 {holiday.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {order.weather && (
                                        <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                                            <span>{order.weather.emoji}</span>
                                            <span>{order.weather.temp || order.weather.mockData?.temp}°C</span>
                                            <span className="text-gray-400">•</span>
                                            <span>{order.weather.description || order.weather.mockData?.description}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Detailed Item Breakdown */}
                    {dateSummary && dateSummary.totalsByItem && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">Item Breakdown</h3>
                            {Object.keys(masterStockList).map(category => {
                                const categoryItems = masterStockList[category]
                                    .map(item => {
                                        const key = `${category}-${item}`;
                                        const qty = dateSummary.totalsByItem[key] || 0;
                                        return { item, qty, key };
                                    })
                                    .filter(item => item.qty > 0);

                                if (categoryItems.length === 0) return null;

                                const categoryTotal = categoryItems.reduce((sum, item) => sum + item.qty, 0);

                                return (
                                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-lg font-bold text-orange-700">{category}</h4>
                                            <span className="text-sm font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                                                Total: {categoryTotal}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {categoryItems.map(({ item, qty, key }) => (
                                                <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                                    <span className="text-gray-900 font-medium">{item}</span>
                                                    <span className="text-orange-600 font-bold text-lg">{qty}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

/**
 * Order History View - See past orders
 */
const OrderHistoryView = ({ db, appId, selectedStoreId, stores, showToast }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                const querySnapshot = await getDocs(ordersColRef);
                
                const ordersData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        ordersData.push({ id: doc.id, ...data });
                    }
                });

                // Sort by order date descending (newest first)
                ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                setOrders(ordersData);
            } catch (error) {
                console.error('Error loading orders:', error);
                showToast('Failed to load order history', 'error');
            } finally {
                setLoading(false);
            }
        };

        loadOrders();
    }, [db, appId, selectedStoreId]);

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTotalItems = (orderQuantities) => {
        if (!orderQuantities) return 0;
        return Object.values(orderQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <ShoppingCart className="w-6 h-6 mr-3 text-orange-600" /> Order History
            </h2>
            <p className="text-sm text-gray-600">
                View past orders for <span className="font-semibold">{stores[selectedStoreId]}</span>
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader className="animate-spin w-8 h-8 text-orange-600 mr-3" />
                    <span className="text-gray-600">Loading order history...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No orders found for this store</p>
                    <p className="text-sm text-gray-500 mt-2">Orders will appear here once you generate them</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-sm text-gray-500">Ordered on</p>
                                    <p className="text-base font-semibold text-gray-900">{formatDate(order.orderDate)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Delivery Date</p>
                                    <p className="text-base font-semibold text-orange-600">
                                        {new Date(order.deliveryDate).toLocaleDateString('en-IN')}
                                    </p>
                                </div>
                            </div>

                            {order.holidays && order.holidays.length > 0 && (
                                <div className="mb-2">
                                    {order.holidays.map((holiday, idx) => (
                                        <span key={idx} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2 mb-1">
                                            🎊 {holiday.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {order.weather && (
                                <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                                    <span>{order.weather.emoji}</span>
                                    <span>{order.weather.temp || order.weather.mockData?.temp}°C</span>
                                    <span className="text-gray-400">•</span>
                                    <span>{order.weather.description || order.weather.mockData?.description}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Total Items:</span> {getTotalItems(order.orderQuantities)}
                                </p>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <Modal title="Order Details" onClose={() => setSelectedOrder(null)}>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Order Date</p>
                            <p className="text-base font-semibold">{formatDate(selectedOrder.orderDate)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Delivery Date</p>
                            <p className="text-base font-semibold text-orange-600">
                                {new Date(selectedOrder.deliveryDate).toLocaleDateString('en-IN')}
                            </p>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <p className="text-sm font-medium text-gray-700 mb-2">Order List:</p>
                            <pre className="p-4 bg-gray-50 text-gray-900 text-sm rounded-lg border border-gray-200 whitespace-pre-wrap font-mono">
                                {selectedOrder.orderText}
                            </pre>
                        </div>
                        <button
                            onClick={() => {
                                const textArea = document.createElement("textarea");
                                textArea.value = selectedOrder.orderText;
                                document.body.appendChild(textArea);
                                textArea.select();
                                try {
                                    document.execCommand('copy');
                                    showToast('Order copied to clipboard!', 'success');
                                } catch (err) {
                                    showToast('Failed to copy', 'error');
                                }
                                document.body.removeChild(textArea);
                            }}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
                        >
                            Copy Order List
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};


// --- Auth/Role Management Logic ---

/**
 * Login Screen - For existing users
 */
const LoginScreen = ({ auth, onLoginSuccess, onSwitchToRegister }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (password.length < 6) {
             setError("Password must be at least 6 characters.");
             setIsLoading(false);
             return;
        }

        try {
            const fakeEmail = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
                const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
                onLoginSuccess(userCredential.user, username.trim());
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.message.includes('user-not-found') || err.message.includes('wrong-password') 
                ? 'Invalid username or password' 
                : 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-orange-100">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-orange-600">Login</h1>
                        <p className="text-gray-600 mt-2">Welcome back to Sujata Mastani!</p>
                    </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                placeholder="Enter your username"
                    />
                </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                placeholder="Enter your password"
                    />
                </div>
                
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                <button
                    type="submit"
                    disabled={isLoading}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center"
                >
                            {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : 'Log In'}
                </button>
            </form>
            
                    <div className="mt-6 text-center">
            <button
                            onClick={onSwitchToRegister}
                            className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                            Need to register? Sign Up
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Registration Screen - With OTP Verification
 */
const RegisterScreen = ({ auth, onLoginSuccess, onSwitchToLogin }) => {
    const [step, setStep] = useState(1); // 1: Details, 2: OTP
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOTP, setGeneratedOTP] = useState('');
    const [otpTimestamp, setOtpTimestamp] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [devModeOTP, setDevModeOTP] = useState(''); // For displaying OTP in dev mode

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            // Import OTP utilities
            const { generateOTP, sendOTP } = await import('./utils/otp-utils');
            
            const newOTP = generateOTP();
            setGeneratedOTP(newOTP);
            setOtpTimestamp(Date.now());

            const result = await sendOTP('+919922422233', newOTP);
            
            if (result.success) {
                setStep(2);
                setError('');
                // Store OTP for dev mode display
                if (result.isDevelopment) {
                    setDevModeOTP(newOTP);
                }
            } else {
                setError('Failed to send OTP. Please try again.');
            }
        } catch (err) {
            console.error('OTP Error:', err);
            setError('Error sending OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { verifyOTP, isOTPExpired } = await import('./utils/otp-utils');
            
            if (isOTPExpired(otpTimestamp)) {
                setError('OTP has expired. Please request a new one.');
                setStep(1);
                setIsLoading(false);
                return;
            }

            if (!verifyOTP(otp, generatedOTP)) {
                setError('Invalid OTP. Please try again.');
                setIsLoading(false);
                return;
            }

            // OTP verified - create admin account
            const fakeEmail = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
            const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
            onLoginSuccess(userCredential.user, username.trim());
        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.message.includes('email-already-in-use') 
                ? 'Username already exists' 
                : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-orange-100">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <UserPlus className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold font-display text-orange-600">Register Admin</h1>
                        <p className="text-gray-600 mt-2">Step {step} of 2</p>
                    </div>

                    {step === 1 ? (
                        <form onSubmit={handleRequestOTP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                    placeholder="Choose a username"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                    placeholder="Min 6 characters"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength="6"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition"
                                    placeholder="Re-enter password"
                                />
                            </div>

                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <p className="text-sm text-orange-800">
                                    📱 OTP will be sent via WhatsApp to: <strong>+91 99224 22233</strong>
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : 'Send OTP via WhatsApp'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-gray-700 mb-2">OTP sent via WhatsApp to:</p>
                                <p className="text-lg font-bold text-orange-600">+91 99224 22233</p>
                                <p className="text-sm text-gray-500 mt-2">Valid for 5 minutes</p>
                                
                                {devModeOTP ? (
                                    <div className="mt-3 p-4 bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-400 rounded-lg">
                                        <p className="text-xs text-orange-800 font-semibold mb-2">🔓 DEVELOPMENT MODE</p>
                                        <p className="text-2xl font-bold text-orange-600 tracking-widest">{devModeOTP}</p>
                                        <p className="text-xs text-orange-700 mt-2">Copy this OTP above ⬆️</p>
                                    </div>
                                ) : (
                                    <div className="mt-3 p-2 bg-orange-50 rounded-lg">
                                        <p className="text-xs text-orange-700">💡 Check your WhatsApp messages</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    maxLength="6"
                                    className="w-full p-4 text-center text-2xl font-bold border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition tracking-widest"
                                    placeholder="000000"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || otp.length !== 6}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : 'Verify & Register'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep(1); setError(''); setOtp(''); }}
                                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
                            >
                                ← Back to registration
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <button
                            onClick={onSwitchToLogin}
                            className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                            Already have an account? Log In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main Application Component ---

const App = () => {
    // Firebase State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false); // Start as NOT ready
    const [role, setRole] = useState(null); 
    const [userStoreId, setUserStoreId] = useState(null); 
    const [stores, setStores] = useState({}); // Dynamic stores state

    // UI State
    const [showAuthModal, setShowAuthModal] = useState(false); // Start with auth modal hidden
    const [isFirstUser, setIsFirstUser] = useState(false);
    const [authScreen, setAuthScreen] = useState('login'); // 'login' or 'register'
    
    // Toast State
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);
    
    // App State
    const [selectedStoreId, setSelectedStoreId] = useState(''); 
    const [view, setView] = useState('home'); 
    const [isSaving, setIsSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    
    // Error Handling State
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    
    // Process Flow State
    const [processStep, setProcessStep] = useState('initializing'); // initializing, authenticating, loading-data, ready, error
    const [storesLoaded, setStoresLoaded] = useState(false); // Track if stores have been attempted to load
    const [isInitializing, setIsInitializing] = useState(true); // Track Firebase initialization
    const [isOnline, setIsOnline] = useState(navigator.onLine); // Track network status

    // Data State
    const [currentStock, setCurrentStock] = useState(getEmptyStock());
    const [yesterdayStock, setYesterdayStock] = useState(getEmptyStock());
    const [orderQuantities, setOrderQuantities] = useState(getEmptyStock());
    const [selectedDate, setSelectedDate] = useState(getTodayDate()); // Date selector for stock entry
    const [masterStockList, setMasterStockList] = useState(MASTER_STOCK_LIST); // Dynamic stock list
    
    // Auto-switch to register screen if it's the first user
    useEffect(() => {
        if (isFirstUser && authScreen === 'login') {
            setAuthScreen('register');
        }
    }, [isFirstUser, authScreen]);
    
    // --- Error Handling Utilities ---
    const handleError = (error, context = 'Unknown') => {
        console.error(`Error in ${context}:`, error);
        setError({
            message: error.message || 'An unexpected error occurred',
            context,
            timestamp: new Date().toISOString(),
            retryable: true
        });
        setProcessStep('error');
    };

    const clearError = () => {
        setError(null);
        setRetryCount(0);
        setIsRetrying(false);
    };

    const retryOperation = async (operation, maxRetries = 3) => {
        if (retryCount >= maxRetries) {
            handleError(new Error('Maximum retry attempts reached'), 'Retry Operation');
            return false;
        }

        setIsRetrying(true);
        setRetryCount(prev => prev + 1);
        
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
            setIsRetrying(false);
        }
    };
    
    // No hardcoded stores - only use Firestore data 

    // 1. Firebase Initialization and Authentication 
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                setProcessStep('initializing');
                
                // Log config for debugging
                console.log('Initializing Firebase with config:', {
                    projectId: firebaseConfig.projectId,
                    authDomain: firebaseConfig.authDomain,
                    hasRequiredFields: !!(firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.appId)
                });
                
                // Validate config one more time
                if (!firebaseConfig || !firebaseConfig.projectId) {
                    throw new Error('Firebase configuration is invalid - missing projectId');
                }
                
                const app = initializeApp(firebaseConfig);
                console.log('Firebase app initialized successfully');
                
                const firestore = getFirestore(app);
                const authentication = getAuth(app);
                setDb(firestore);
                setAuth(authentication);
                setIsInitializing(false);
                console.log('Firebase services ready');

                // --- Securely check if the app has been set up ---
                const setupDocRef = doc(firestore, `artifacts/${appId}/public`, 'config');
                const setupDocSnap = await getDoc(setupDocRef);

                // If the setup document does NOT exist, it's the first run.
                const isFirstRun = !setupDocSnap.exists();
                setIsFirstUser(isFirstRun);
                console.log("Is this the first user signup?", isFirstRun);

                // --- User Auth and Role Fetching ---
                const fetchUserProfile = async (user, username = null) => {
                    try {
                        if (!user || user.isAnonymous) {
                            setRole(null);
                            setUserStoreId(null);
                            return;
                        }
                        setUserId(user.uid);
                        const roleDocRef = doc(firestore, `artifacts/${appId}/users/${user.uid}/user_config`, 'profile');
                        const roleSnap = await getDoc(roleDocRef);
                        if (roleSnap.exists()) {
                            setRole(roleSnap.data().role);
                            setUserStoreId(roleSnap.data().storeId || null);
                        } else {
                            const defaultRole = 'admin'; 
                            await setDoc(roleDocRef, { role: defaultRole, username: username || user.email.split('@')[0] }, { merge: true });
                            setRole(defaultRole);
                            setUserStoreId(null);
                        }
                    } catch (error) {
                        handleError(error, 'User Profile Fetch');
                    }
                };

                const unsubscribeAuth = onAuthStateChanged(authentication, async (user) => {
                    try {
                        if (!user) {
                            setUserId(null);
                            setRole(null);
                            setUserStoreId(null);
                            setShowAuthModal(true);
                            setProcessStep('authenticating');
                            setIsAuthReady(true);
                            return;
                        }
                        
                        setUserId(user.uid);
                        setShowAuthModal(false);
                        setProcessStep('loading-data');
                        
                        await fetchUserProfile(user);
                        setIsAuthReady(true);
                        setProcessStep('ready');
                    } catch (error) {
                        handleError(error, 'Authentication State Change');
                    }
                });

                return () => unsubscribeAuth();
            } catch (error) {
                handleError(error, 'Firebase Initialization');
            }
        };

        initializeFirebase();
    }, []);

    // Network Status Monitoring
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            console.log('Network: Online');
        };

        const handleOffline = () => {
            setIsOnline(false);
            console.log('Network: Offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []); 

    // 2. Real-time Store Fetching (Runs only after DB, Auth, user authentication, AND role is loaded)
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !role) return; // Wait for role to be loaded before fetching stores

        console.log("Starting store fetch - user authenticated with role:", role);
        const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
        
        const unsubscribeStores = onSnapshot(storesColRef, async (snapshot) => {
            try {
                const newStores = {};
                snapshot.forEach(doc => {
                    newStores[doc.id] = doc.data().name;
                });

                console.log("Stores loaded:", Object.keys(newStores).length, "stores");
                setStores(newStores);
                setStoresLoaded(true); // Mark stores as loaded
                clearError(); // Clear any previous errors
            } catch (error) {
                handleError(error, 'Store Data Processing');
            }
        }, (error) => {
            console.error("Error listening to stores:", error);
            handleError(error, 'Store Fetching');
            setStores({}); // Set empty stores on error
            setStoresLoaded(true); // Mark stores as loaded even on error
        });

        return () => {
            console.log("Unsubscribing from stores listener");
            unsubscribeStores();
        };
    }, [db, appId, isAuthReady, userId, role]); // Added role to dependencies

    // 3. Set default storeId for admins after stores are loaded
    useEffect(() => {
        if (role === 'admin' && !userStoreId && Object.keys(stores).length > 0 && db && userId) {
            const setDefaultStoreId = async () => {
                const defaultStoreId = Object.keys(stores)[0];
                const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
                try {
                    // Try to update existing document first
                    await updateDoc(roleDocRef, { storeId: defaultStoreId });
                    setUserStoreId(defaultStoreId);
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
                            setUserStoreId(defaultStoreId);
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
    }, [role, userStoreId, stores, db, userId, appId, auth]);

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
                        setUserStoreId(newStoreId);
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
                                    role: role || 'staff', 
                                    storeId: newStoreId,
                                    email: auth?.currentUser?.email || null
                                }, { merge: true });
                                setUserStoreId(newStoreId);
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
    }, [stores, db, auth, userId, appId, role]); // Added role to dependencies

    // Load and listen to master stock list from Firestore
    useEffect(() => {
        if (!db || !isAuthReady) return;

        const listDocRef = doc(db, `artifacts/${appId}/public`, 'master_stock_list');
        
        const unsubscribeList = onSnapshot(listDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.list) {
                    setMasterStockList(data.list);
                    console.log('Master stock list loaded from Firestore');
                }
            } else {
                // If document doesn't exist, create it with the default list
                setDoc(listDocRef, {
                    list: MASTER_STOCK_LIST,
                    lastUpdated: new Date().toISOString()
                }).then(() => {
                    console.log('Created initial master stock list in Firestore');
                }).catch(error => {
                    console.error('Error creating master stock list:', error);
                });
            }
        }, (error) => {
            console.error('Error listening to master stock list:', error);
        });

        return () => unsubscribeList();
    }, [db, appId, isAuthReady]);

    // Update helper functions when masterStockList changes
    const getEmptyStockDynamic = useCallback(() => {
        const stock = {};
        Object.keys(masterStockList).forEach(category => {
            masterStockList[category].forEach(item => {
                const key = `${category}-${item}`;
                stock[key] = 0;
            });
        });
        return stock;
    }, [masterStockList]);

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

        setLoadingData(true);
        const todayDate = getTodayDate();
        const yesterdayDate = getYesterdayDate();

        try {
            const todayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeId}-${todayDate}`);
            const yesterdayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeId}-${yesterdayDate}`);

            const todaySnap = await getDoc(todayDocRef);
            if (todaySnap.exists()) {
                const data = todaySnap.data().stock;
                setCurrentStock(data);
            } else {
                setCurrentStock(getEmptyStock());
                setOrderQuantities(getEmptyStock());
            }

            const yesterdaySnap = await getDoc(yesterdayDocRef);
            if (yesterdaySnap.exists()) {
                setYesterdayStock(yesterdaySnap.data().stock);
            } else {
                setYesterdayStock(getEmptyStock());
            }
        } catch (e) {
            console.error("Error fetching stock data:", e);
        } finally {
            setLoadingData(false);
        }
    }, [db]);

    // Re-fetch data whenever store or auth state changes
    useEffect(() => {
        if (role === 'staff' && userStoreId && selectedStoreId !== userStoreId) {
            setSelectedStoreId(userStoreId);
        }

        if (db && userId && selectedStoreId) {
            fetchStockData(selectedStoreId);
        }
    }, [db, userId, selectedStoreId, fetchStockData, role, userStoreId]);

    // Prevent staff from accessing wrong stores via render-time redirect
    useEffect(() => {
        if (role === 'staff' && selectedStoreId && selectedStoreId !== userStoreId && view !== 'home') {
            setSelectedStoreId(userStoreId);
            setView('entry');
        }
    }, [role, selectedStoreId, userStoreId, view]);

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

            setIsSaving(true);

            // SAVE WITH PERFORMANCE MONITORING
            await perfMonitor.measureAsync('saveStock', async () => {
                const date = selectedDate;
                const docId = `${selectedStoreId}-${date}`;
                const docRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, docId);

                // USE RETRY LOGIC
                await retryOperation(async () => {
                    await setDoc(docRef, {
                        storeId: selectedStoreId,
                        date: date,
                        stock: sanitized,
                        userId: userId,
                        timestamp: new Date().toISOString()
                    });
                });

                // BACKUP TO LOCAL STORAGE
                storageBackup.save(`stock_${selectedStoreId}_${date}`, sanitized);
            });

            showToast('Stock saved successfully!', 'success');
        } catch (error) {
            handleError(error, 'Stock Saving');
            showToast(error.message || 'Error saving stock', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // 6. Data Export Function (Admin Action)
    const exportStockData = useCallback(() => {
        if (role !== 'admin') {
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
    }, [role, stores, selectedStoreId, selectedDate, currentStock, yesterdayStock, masterStockList]);

    // 5. Order Output Generation (Admin Action)
    const generateOrderOutput = useCallback(() => {
        const storeName = stores[selectedStoreId] || selectedStoreId;
        let output = `${storeName}\n\n`;

        const sections = {
            'MILKSHAKE': [],
            'ICE CREAM': [],
            'TOPPINGS': [],
        };
        const miscItems = [];
        const nonOrderedItems = [];

        Object.keys(masterStockList).forEach(category => {
            masterStockList[category].forEach(item => {
                const key = `${category}-${item}`; 
                const quantity = orderQuantities[key] || ''; 
                if (quantity !== 0 && quantity !== '') {
                    if (sections[category]) {
                        sections[category].push(`${item} - ${quantity}`);
                    } else if (category === 'MISC' && item === 'Ice Cream Dabee') {
                        miscItems.push(`${item} - ${quantity}`);
                    }
                } else {
                    // Track items that have not been ordered
                    if (sections[category]) {
                        nonOrderedItems.push(`${category}: ${item}`);
                    } else if (category === 'MISC') {
                        nonOrderedItems.push(`MISC: ${item}`);
                    }
                }
            });
        });

        if (sections.MILKSHAKE.length > 0) {
            output += `*MILKSHAKE*\n`;
            output += sections.MILKSHAKE.join('\n');
            output += '\n\n';
        }

        if (sections['ICE CREAM'].length > 0) {
            output += `*ICE CREAM*\n`;
            output += sections['ICE CREAM'].join('\n');
            output += '\n\n';
        }

        if (sections.TOPPINGS.length > 0) {
            output += `*TOPPINGS*\n`;
            output += sections.TOPPINGS.join('\n');
            output += '\n\n';
        }

        if (miscItems.length > 0) {
             output += miscItems.join('\n');
             output += '\n\n';
        }

        // Add non-ordered items section
        if (nonOrderedItems.length > 0) {
            output += `*ITEMS NOT ORDERED*\n`;
            output += nonOrderedItems.join('\n');
            output += '\n\n';
        }

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
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showConfirm = useCallback((options) => {
        return new Promise((resolve) => {
            setConfirmDialog({
                ...options,
                onConfirm: () => {
                    setConfirmDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    const handleAuthSuccess = (user, username) => {
        if (user) {
            const fetchProfile = async () => {
                const roleDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_config`, 'profile');
                const roleSnap = await getDoc(roleDocRef);
                
                if (roleSnap.exists()) {
                    setRole(roleSnap.data().role);
                    setUserStoreId(roleSnap.data().storeId || null);
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

                    setRole(defaultRole);
                    setUserStoreId(defaultStoreId);
                    setIsFirstUser(false); // Update state to prevent future registrations
                }
                setShowAuthModal(false);
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
    if (error) {
        return (
            <>
                <ProcessFlowDisplay step="error" />
                <ErrorDisplay 
                    error={error} 
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

    // If no user is authenticated, show login or register screen
    if (!userId || !role) {
        if (authScreen === 'register') {
        return (
                <RegisterScreen
                        auth={auth} 
                        onLoginSuccess={handleAuthSuccess}
                    onSwitchToLogin={() => setAuthScreen('login')}
                />
            );
        } else {
            return (
                <LoginScreen
                    auth={auth}
                    onLoginSuccess={handleAuthSuccess}
                    onSwitchToRegister={() => setAuthScreen('register')}
                />
            );
        }
    }

    // If stores haven't loaded yet but user is authenticated, show minimal loading
    if (!storesLoaded && userId && role) {
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
                <p className="text-gray-600 text-sm">{role ? `Logged in as ${role.toUpperCase()}. Select your outlet.` : 'Secure Login Required'}</p>
            </div>

            <div className="space-y-4">
                {Object.entries(stores).length > 0 ? (
                    Object.entries(stores).map(([id, name]) => {
                        const isAssignedToStore = role === 'admin' || userStoreId === id;
                        
                        if (role === 'staff' && userStoreId !== id) return null;

                        return (
                            <div 
                                key={id} 
                                className={`bg-white rounded-xl p-4 shadow-lg transition-shadow hover:shadow-xl border-l-4 ${
                                    isAssignedToStore ? 'border-orange-600' : 'border-gray-300 opacity-80'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                                        <Home className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-display text-lg font-bold text-gray-900">{name}</p>
                                        {role === 'staff' && <span className="text-xs font-semibold text-green-600">Your Assigned Store</span>}
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 mt-3 pt-3">
                                        <button
                                            onClick={() => { setSelectedStoreId(id); setView('entry'); }}
                                        className="w-full flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-700"
                                        >
                                        <List className="w-4 h-4 mr-2" /> Open Store
                                        </button>
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
                                    {role === 'admin' 
                                        ? 'Create your first store to get started with inventory management.'
                                        : 'No stores have been assigned to you yet. Contact your administrator.'
                                    }
                                </p>
                                {role === 'admin' && (
                                    <button
                                        onClick={() => setView('storemanager')}
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


    // --- Navigation Bar (Footer) ---
    const NavBar = ({ currentView }) => (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t border-gray-200">
            <nav className="flex justify-around items-center h-16 max-w-lg mx-auto">
                <NavButton
                    icon={Home}
                    label="Home"
                    active={currentView === 'home'}
                    onClick={() => { setView('home'); setSelectedStoreId(''); }}
                />

                {selectedStoreId && (
                    <NavButton
                        icon={List}
                        label="Entry"
                        active={currentView === 'entry'}
                        onClick={() => setView('entry')}
                    />
                )}

                {selectedStoreId && role === 'admin' && (
                    <>
                        <NavButton
                            icon={ShoppingCart}
                            label="Order"
                            active={currentView === 'order'}
                            onClick={() => setView('order')}
                        />
                        <NavButton
                            icon={List}
                            label="History"
                            active={currentView === 'orderhistory'}
                            onClick={() => setView('orderhistory')}
                        />
                        <NavButton
                            icon={TrendingDown}
                            label="Sold"
                            active={currentView === 'sold'}
                            onClick={() => setView('sold')}
                        />
                    </>
                )}

                {role === 'admin' && (
                    <>
                        <NavButton
                            icon={Store}
                            label="Stores"
                            active={currentView === 'storemanager'}
                            onClick={() => setView('storemanager')}
                        />
                        <NavButton
                            icon={UserPlus}
                            label="Users"
                            active={currentView === 'usermanager'}
                            onClick={() => setView('usermanager')}
                        />
                                <NavButton
                            icon={List}
                            label="Items"
                            active={currentView === 'itemmanager'}
                            onClick={() => setView('itemmanager')}
                        />
                    </>
                )}
            </nav>
        </div>
    );

    const NavButton = ({ icon: Icon, label, active, onClick, disabled }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col items-center p-1 transition duration-200 w-1/5 ${
                active ? 'text-orange-600 font-bold' : 'text-gray-500 hover:text-orange-500'
            } ${disabled ? 'opacity-50' : ''}`}
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
        const isAdmin = role === 'admin';

        // Staff access control is now handled in useEffect above
        switch (view) {
            case 'storemanager':
                if (!isAdmin) return <HomeView />;
                return <StoreManagementView db={db} appId={appId} stores={stores} showToast={showToast} showConfirm={showConfirm} />;
            case 'usermanager':
                if (!isAdmin) return <HomeView />;
                return <AdminUserManagementView db={db} appId={appId} stores={stores} auth={auth} exportStockData={exportStockData} showToast={showToast} />;
            case 'itemmanager':
                if (!isAdmin) return <HomeView />;
                return <ItemManagerView 
                    db={db} 
                    appId={appId} 
                    masterStockList={masterStockList} 
                    showToast={showToast} 
                    showConfirm={showConfirm}
                    onUpdateMasterList={setMasterStockList}
                />;
            case 'entry':
                return (
                    <StockEntryView
                        storeId={storeName}
                        stockData={currentStock}
                        setStockData={setCurrentStock}
                        saveStock={saveStock}
                        isSaving={isSaving}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        showToast={showToast}
                        masterStockList={masterStockList}
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
                        setOrderQuantities={setOrderQuantities}
                        generateOrderOutput={generateOrderOutput}
                        showToast={showToast}
                        masterStockList={masterStockList}
                        db={db}
                        appId={appId}
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                    />
                );
            case 'orderstats':
                if (!isAdmin) return <HomeView />;
                return (
                    <OrderStatsView
                        db={db}
                        appId={appId}
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        showToast={showToast}
                        masterStockList={masterStockList}
                    />
                );
            case 'orderhistory':
                if (!isAdmin) return <HomeView />;
                return (
                    <OrderHistoryView
                        db={db}
                        appId={appId}
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        showToast={showToast}
                    />
                );
            default:
                return <HomeView />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased pb-20">
            {/* Only show ProcessFlowDisplay when not ready or in error state */}
            {(processStep !== 'ready' || error) && <ProcessFlowDisplay step={processStep} />}
            
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
                    {role && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${role === 'admin' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {role.toUpperCase()}
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

// --- Item Management Component ---
const ItemManagerView = ({ db, appId, masterStockList: initialMasterStockList, showToast, showConfirm, onUpdateMasterList }) => {
    // Local state for edits, only save to Firestore on explicit save action
    const [localList, setLocalList] = useState(() => JSON.parse(JSON.stringify(initialMasterStockList))); // Deep copy for local edits
    const [isSavingList, setIsSavingList] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [editingItem, setEditingItem] = useState(null); // { category: string, oldName: string } | null
    const [editingItemName, setEditingItemName] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({}); // Track which categories are expanded

    // Reset local state if the initial list changes (e.g., Firestore update via snapshot)
    useEffect(() => {
        setLocalList(JSON.parse(JSON.stringify(initialMasterStockList)));
        // Initialize all categories as expanded
        const expanded = {};
        Object.keys(initialMasterStockList).forEach(cat => { expanded[cat] = true; });
        setExpandedCategories(expanded);
        // Set default category
        if (!selectedCategory && Object.keys(initialMasterStockList).length > 0) {
            setSelectedCategory(Object.keys(initialMasterStockList)[0]);
        }
    }, [initialMasterStockList]);

    const handleAddItem = async () => {
        if (!newItemName.trim() || !selectedCategory) {
            showToast('Please enter an item name and select a category', 'error');
            return;
        }

        // Check if item already exists
        if (localList[selectedCategory]?.includes(newItemName.trim())) {
            showToast('Item already exists in this category', 'warning');
            return;
        }

        const updatedList = { ...localList };
        if (!updatedList[selectedCategory]) {
            updatedList[selectedCategory] = [];
        }
        updatedList[selectedCategory] = [...updatedList[selectedCategory], newItemName.trim()];
        
        setLocalList(updatedList);
        setNewItemName('');
        showToast(`Item "${newItemName.trim()}" added to ${selectedCategory}`, 'success');
    };

    const handleDeleteItem = async (category, item) => {
        const confirmed = await showConfirm({
            title: 'Delete Item',
            message: `Are you sure you want to delete "${item}" from ${category}? This will affect all stock entries.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmColor: 'red'
        });

        if (!confirmed) return;

        const updatedList = { ...localList };
        updatedList[category] = updatedList[category].filter(i => i !== item);
        
        setLocalList(updatedList);
        showToast(`Item "${item}" deleted from ${category}`, 'success');
    };

    const handleEditItem = (category, item) => {
        setEditingItem({ category, oldName: item });
        setEditingItemName(item);
    };

    const handleSaveEdit = async () => {
        if (!editingItem || !editingItemName.trim()) {
            showToast('Please enter a valid item name', 'error');
            return;
        }

        const { category, oldName } = editingItem;
        const newName = editingItemName.trim();

        // Check if new name already exists (and is different from old name)
        if (newName !== oldName && localList[category]?.includes(newName)) {
            showToast('Item with this name already exists in this category', 'warning');
            return;
        }

        const updatedList = { ...localList };
        const index = updatedList[category].indexOf(oldName);
        if (index !== -1) {
            updatedList[category][index] = newName;
        }
        
        setLocalList(updatedList);
        setEditingItem(null);
        setEditingItemName('');
        showToast(`Item renamed from "${oldName}" to "${newName}"`, 'success');
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditingItemName('');
    };

    const handleSaveAll = async () => {
        const confirmed = await showConfirm({
            title: 'Save Changes',
            message: 'This will update the master stock list for all stores. Are you sure?',
            confirmText: 'Save',
            cancelText: 'Cancel',
            confirmColor: 'orange'
        });

        if (!confirmed) return;

        setIsSavingList(true);
        try {
            // Save to Firestore
            const listDocRef = doc(db, `artifacts/${appId}/public`, 'master_stock_list');
            await setDoc(listDocRef, {
                list: localList,
                lastUpdated: new Date().toISOString()
            });

            // Call parent callback to update the app state
            if (onUpdateMasterList) {
                onUpdateMasterList(localList);
            }

            showToast('Master stock list updated successfully!', 'success');
        } catch (error) {
            console.error('Error saving master stock list:', error);
            showToast(`Failed to save: ${error.message}`, 'error');
        } finally {
            setIsSavingList(false);
        }
    };

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900 flex items-center">
                <List className="w-6 h-6 mr-3 text-orange-600" /> Item Manager
            </h2>
            <p className="text-sm text-gray-600">Add, edit, or remove items from categories.</p>

            {/* Add Item Form */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 space-y-4">
                <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2">Add New Item</h3>
                <div className="space-y-3">
                    <label className="flex flex-col">
                        <span className="text-sm font-semibold text-orange-700/80 pb-2">Category</span>
                        <select
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 p-3 text-base font-normal leading-normal text-gray-900"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {Object.keys(localList).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col">
                        <span className="text-sm font-semibold text-orange-700/80 pb-2">Item Name</span>
                        <input
                            type="text"
                            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="e.g., Mango"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddItem();
                                }
                            }}
                        />
                    </label>
                    <button
                        onClick={handleAddItem}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition duration-200"
                    >
                        Add Item
                    </button>
                </div>
            </div>

            {/* Items List by Category */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2">Current Items</h3>
                {Object.keys(localList).map(category => (
                    <div key={category} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => toggleCategory(category)}
                            className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition"
                        >
                            <h4 className="text-lg font-bold text-gray-900">{category}</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                    {localList[category]?.length || 0} items
                                </span>
                                <span className="text-gray-500">
                                    {expandedCategories[category] ? '▼' : '▶'}
                                </span>
                            </div>
                        </button>
                        
                        {expandedCategories[category] && (
                            <div className="p-4 pt-0 space-y-2">
                                {localList[category]?.length > 0 ? (
                                    localList[category].map(item => (
                                        <div key={item} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center">
                                            {editingItem?.category === category && editingItem?.oldName === item ? (
                                                <div className="flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600"
                                                        value={editingItemName}
                                                        onChange={(e) => setEditingItemName(e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleSaveEdit();
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-lg transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="flex-1 text-gray-900">{item}</span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditItem(category, item)}
                                                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(category, item)}
                                                            className="p-1 rounded-full text-red-600 hover:bg-red-100 transition duration-150"
                                                            aria-label={`Delete ${item}`}
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No items in this category</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Save All Changes Button */}
            <button
                onClick={handleSaveAll}
                disabled={isSavingList}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition duration-200 flex items-center justify-center disabled:opacity-50 text-xl"
            >
                {isSavingList ? (
                    <Loader className="animate-spin w-6 h-6 mr-2" />
                ) : (
                    'Save All Changes'
                )}
            </button>
        </div>
    );
};

export default App;
