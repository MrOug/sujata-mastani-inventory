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

// --- Ordered List of Categories ---
const CATEGORY_ORDER = [
  'MILKSHAKE',
  'ICE CREAM',
  'TOPPINGS',
  'ICE CREAM DABBE',
  'MISC'
];

// The main list of stock items based on your paper and required output format
const MASTER_STOCK_LIST = {
  MILKSHAKE: [
    'Mango', 'Rose', 'Pineapple', 'Khus', 'Vanilla', 'Kesar', 'Chocolate', 'Butterscotch',
    'Kesar mango', 'Strawberry', 'Fresh Sitaphal (Seasonal)', 'Fresh Strawberry (Seasonal)',
  ],
  'ICE CREAM': [
    'Mango', 'Pista', 'Pineapple', 'Vanilla', 'Rose', 'Orange', 'Keshar Pista', 'Chocolate',
    'Strawberry', 'Butterscotch', 'Dry Anjir', 'Coffee Chips', 'Chocolate Fudge Badam',
    'Chocolate Choco Chips', 'Kaju Draksha', 'Gulkand Badam', 'Jagdalu', 'VOP', 'Peru',
    'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Mango Bites',
  ],
  TOPPINGS: [
    'Dry Fruit', 'Pista', 'Badam', 'Pista Powder', 'Cherry'
  ],
  'ICE CREAM DABBE': [
    'Ice Cream Dabee'
  ],
  MISC: [
    'Ice Cream Spoons', 'Paper Straw', 'Ice Creap Cup', 'Ice Cream Container'
  ]
};

// --- Utility Functions ---

const getEmptyStock = () => {
  const stock = {};
  CATEGORY_ORDER.forEach(category => {
    if (MASTER_STOCK_LIST[category]) {
      MASTER_STOCK_LIST[category].forEach(item => {
        const key = `${category}-${item}`; 
        stock[key] = 0;
      });
    }
  });
  return stock;
};

// Track stock status for MISC items (Available/Low Stock)
const getEmptyMiscStatus = () => {
  const status = {};
  if (MASTER_STOCK_LIST.MISC) {
    MASTER_STOCK_LIST.MISC.forEach(item => {
      status[`MISC-${item}`] = 'available'; // default to available
    });
  }
  return status;
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

// [Rest of your component code continues exactly the same until the useEffect for stores loading...]

// ====================
// 🔧 FIX #1: STORES LOADING WITH CLEANUP
// ====================

// Around line 1050 in your original code, replace the stores loading useEffect with this:

useEffect(() => {
    if (!db || !isAuthReady || !userId || !role) return;

    console.log("Starting store fetch - user authenticated with role:", role);
    const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
    
    // ✅ FIX: Added error handler and proper cleanup
    const unsubscribeStores = onSnapshot(
        storesColRef, 
        (snapshot) => {
            try {
                const newStores = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    newStores[doc.id] = {
                        name: data.name,
                        firmName: data.firmName || data.name,
                        areaCode: data.areaCode || '',
                        createdAt: data.createdAt
                    };
                });

                console.log("Stores loaded:", Object.keys(newStores).length, "stores");
                setStores(newStores);
                setStoresLoaded(true);
                clearError();
                
                setSelectedStoreId(prevId => {
                    if (prevId && !newStores[prevId]) {
                        console.log("Selected store was deleted, resetting selection");
                        return '';
                    }
                    return prevId;
                });
            } catch (error) {
                handleError(error, 'Store Data Processing');
            }
        }, 
        (error) => {
            // ✅ FIX: Added error handler for connection issues
            console.error("Error listening to stores:", error);
            handleError(error, 'Store Fetching');
            setStores({});
            setStoresLoaded(true);
            
            // Show user-friendly message
            showToast('Connection issue. Working offline.', 'warning');
        }
    );

    // ✅ FIX: Return cleanup function
    return () => {
        console.log("Unsubscribing from stores listener");
        unsubscribeStores();
    };
}, [db, appId, isAuthReady, userId, role]);

// ====================
// 🔧 FIX #2: ORDER HISTORY VIEW - CONVERT TO ONE-TIME FETCH
// ====================

const OrderHistoryView = ({ db, appId, selectedStoreId, stores, showToast }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // ✅ FIX: Changed from onSnapshot to getDocs (one-time read)
    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                // ✅ CHANGED: getDocs instead of onSnapshot
                const querySnapshot = await getDocs(ordersColRef);
                
                const ordersData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        ordersData.push({ id: doc.id, ...data });
                    }
                });

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
        
        // ✅ FIX: No cleanup needed since getDocs is one-time
    }, [db, appId, selectedStoreId]); // ✅ Re-fetch when store changes

    // [Rest of OrderHistoryView component stays the same...]
};

// ====================
// 🔧 FIX #3: ORDER STATS VIEW - CONVERT TO ONE-TIME FETCH
// ====================

const OrderStatsView = ({ db, appId, selectedStoreId, stores, showToast, masterStockList }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');
    const [dateOrders, setDateOrders] = useState([]);

    // ✅ FIX: Changed from onSnapshot to getDocs
    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
                // ✅ CHANGED: getDocs instead of onSnapshot
                const querySnapshot = await getDocs(ordersColRef);
                
                const ordersData = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeId === selectedStoreId) {
                        ordersData.push({ id: doc.id, ...data });
                    }
                });

                ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                setOrders(ordersData);
                
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
        
        // ✅ FIX: No cleanup needed
    }, [db, appId, selectedStoreId]);

    // [Rest of OrderStatsView component stays the same...]
};

// ====================
// 🔧 FIX #4: ADD GLOBAL ERROR BOUNDARY FOR FIRESTORE ERRORS
// ====================

// Add this inside your main App component's useEffect hooks:

useEffect(() => {
    // Global error handler for uncaught Firestore errors
    const handleGlobalError = (event) => {
        const error = event.reason || event.error;
        
        if (error && error.code) {
            // Handle Firestore-specific errors
            if (error.code === 'resource-exhausted') {
                showToast('Too many operations. Please slow down.', 'warning');
                event.preventDefault();
            } else if (error.code === 'unavailable') {
                showToast('Connection lost. Working offline.', 'warning');
                setIsOnline(false);
                event.preventDefault();
            } else if (error.code === 'permission-denied') {
                showToast('Permission denied. Please re-login.', 'error');
                event.preventDefault();
            }
        }
    };

    window.addEventListener('unhandledrejection', handleGlobalError);
    
    return () => {
        window.removeEventListener('unhandledrejection', handleGlobalError);
    };
}, []);

// ====================
// 🔧 FIX #5: ADD REFRESH BUTTON FOR ORDER VIEWS
// ====================

// In OrderHistoryView and OrderStatsView, add a manual refresh button:

const handleRefresh = async () => {
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

        ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        setOrders(ordersData);
        showToast('Orders refreshed', 'success');
    } catch (error) {
        console.error('Error refreshing orders:', error);
        showToast('Failed to refresh orders', 'error');
    } finally {
        setLoading(false);
    }
};

// Add this button to the view:
// <button onClick={handleRefresh} className="...">↻ Refresh</button>

```
