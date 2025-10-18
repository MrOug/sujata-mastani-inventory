import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
// Replaced lucide icons with standard icon names for theme consistency
import { User, Home, List, ShoppingCart, Loader, TrendingDown, LogOut, UserPlus, X, Store, Trash2 } from 'lucide-react'; 

// --- Global Constants and Firebase Setup ---

// These global variables are provided by the canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sujata-mastani-inventory';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyDZt6n1QSGLq_PyLDYQlayFwMK0Qv7gpmE",
    authDomain: "sujata-inventory.firebaseapp.com",
    projectId: "sujata-inventory",
    storageBucket: "sujata-inventory.firebasestorage.app",
    messagingSenderId: "527916478889",
    appId: "1:527916478889:web:7043c7d45087ee452bd4b8",
    measurementId: "G-BC3JXRWDVH"
};
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
            step="1"
            value={value || ''}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
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

const StoreManagementView = ({ db, appId, stores }) => {
    const [newStoreName, setNewStoreName] = useState('');
    const [message, setMessage] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [storeToDelete, setStoreToDelete] = useState(null); // State for delete confirmation modal

    const handleAddStore = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsAdding(true);

        if (!newStoreName.trim()) {
            setMessage("Error: Store name cannot be empty.");
            setIsAdding(false);
            return;
        }

        try {
            const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
            // Use addDoc to let Firestore generate a unique ID
            await addDoc(storesColRef, {
                name: newStoreName.trim(),
                createdAt: new Date().toISOString()
            });

            setMessage(`Store "${newStoreName}" added successfully!`);
            setNewStoreName('');
        } catch (error) {
            console.error("Error adding store:", error);
            setMessage(`Error: Failed to add store: ${error.message}`);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteStore = async (storeId, storeName) => {
        setStoreToDelete(null); // Close the modal immediately
        setMessage('');
        
        try {
            const storeDocRef = doc(db, `artifacts/${appId}/public/data/stores`, storeId);
            await deleteDoc(storeDocRef);

            setMessage(`Store "${storeName}" deleted successfully!`);
            
            // Note: Related data (stock entries, user assignments) will be cleaned 
            // up implicitly as the store ID will no longer be valid in the UI lists.
        } catch (error) {
            console.error("Error deleting store:", error);
            setMessage(`Error: Failed to delete store: ${error.message}`);
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

            {message && <p className={`text-center p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</p>}
        
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
                                    onClick={() => setStoreToDelete({ id, name })}
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
            
            {/* --- Confirmation Modal --- */}
            {storeToDelete && (
                <Modal 
                    title="Confirm Deletion" 
                    onClose={() => setStoreToDelete(null)}
                >
                    <p className="mb-6 text-gray-700">
                        Are you sure you want to delete **{storeToDelete.name}**? This action cannot be undone and will remove the store from all lists.
                        Existing stock and user data assigned to this store will remain in the database but will be unlinked.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setStoreToDelete(null)}
                            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleDeleteStore(storeToDelete.id, storeToDelete.name)}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition duration-150"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};


// --- Admin User Management Component ---

const AdminUserManagementView = ({ db, appId, stores, auth }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('staff');
    const [storeId, setStoreId] = useState(Object.keys(stores)[0]);
    const [message, setMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsCreating(true);

        if (password.length < 6) {
             setMessage("Error: Password must be at least 6 characters long.");
             setIsCreating(false);
             return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;

            const userConfigRef = doc(db, `artifacts/${appId}/users/${newUser.uid}/user_config`, 'profile');
            await setDoc(userConfigRef, {
                role: role,
                storeId: storeId,
                email: email,
            }, { merge: true });

            setMessage(`User ${email} created successfully with role: ${role} and store: ${stores[storeId]}!`);
            setEmail('');
            setPassword('');
        } catch (error) {
            console.error("Error creating user:", error);
            setMessage(`Error: ${error.message.replace('Firebase: Error (auth/', '').replace(').', '')}`);
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
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@outlet.com"
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

            {message && <p className={`text-center p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</p>}
        </div>
    );
};

// --- Stock Management Components ---

/**
 * Stock Entry View (For Staff)
 */
const StockEntryView = ({ storeId, stockData, setStockData, saveStock, isSaving }) => {
    const [status, setStatus] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSave = async () => {
        try {
            await saveStock();
            setStatus('Stock saved successfully!');
            setIsError(false);
            setTimeout(() => setStatus(''), 3000);
        } catch (e) {
            setStatus(e.message || 'Error saving stock. Please try again.');
            setIsError(true);
            console.error(e);
            setTimeout(() => setStatus(''), 5000);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Closing Stock Entry</h2>
            <p className="text-sm text-gray-600">Enter the current stock count for **{storeId}** ({getTodayDate()}).</p>

            <div className="space-y-4">
                {Object.keys(MASTER_STOCK_LIST).map(category => (
                    // Updated section styling for Stitch UI
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">{category}</h3>
                        <div className="space-y-2">
                            {MASTER_STOCK_LIST[category].map(item => {
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
            {status && (
                <p className={`text-center p-3 text-sm rounded-lg mt-2 ${
                    isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                    {status}
                </p>
            )}
        </div>
    );
};

/**
 * Stock Sold Report View (New 4th Tab)
 */
const StockSoldView = ({ currentStock, yesterdayStock, calculateSold, soldStockSummary }) => {
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
                {Object.keys(MASTER_STOCK_LIST).map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-red-600 border-b border-red-200 pb-2 mb-3">{category}</h3>
                        <div className="space-y-2">
                            {MASTER_STOCK_LIST[category].map(item => {
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
const OrderingView = ({ currentStock, orderQuantities, setOrderQuantities, generateOrderOutput }) => {
    const [showOutputModal, setShowOutputModal] = useState(false);
    
    const handleOutput = () => {
        const output = generateOrderOutput();
        
        if (navigator.clipboard.writeText) {
            navigator.clipboard.writeText(output).then(() => {
                setShowOutputModal('Order list copied to clipboard!');
            }).catch(() => {
                setShowOutputModal('Could not copy to clipboard. Showing in modal instead.');
            });
        } else {
            setShowOutputModal('Could not copy to clipboard. Showing in modal instead.');
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display text-gray-900">Order Management</h2>
            <p className="text-sm text-gray-600">
                Enter the required quantity for the next day. Current stock is shown below.
            </p>

            <div className="space-y-4">
                {Object.keys(MASTER_STOCK_LIST).map(category => (
                    <div key={category} className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-orange-700 border-b border-orange-200 pb-2 mb-3">{category} (Order Qty)</h3>
                        <div className="space-y-2">
                            {MASTER_STOCK_LIST[category].map(item => {
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
                                            step="1"
                                            value={orderQuantities[key] || ''}
                                            onChange={(e) => setOrderQuantities(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
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
            {typeof showOutputModal === 'string' && (
                <Modal title="Order List Output" onClose={() => setShowOutputModal(false)}>
                    <p className="text-sm mb-4 text-gray-700">{showOutputModal}</p>
                    <pre className="p-4 bg-gray-50 text-gray-900 text-sm overflow-x-scroll rounded-lg border border-gray-300 font-mono">{generateOrderOutput()}</pre>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(generateOrderOutput()).then(() => {
                                setShowOutputModal('Order list copied to clipboard!');
                            });
                        }}
                        className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition duration-200"
                    >
                        Copy Order
                    </button>
                </Modal>
            )}
        </div>
    );
};


// --- Auth/Role Management Logic ---

const AuthModal = ({ auth, onLoginSuccess, onClose, isFirstUser }) => {
    const [isRegister, setIsRegister] = useState(isFirstUser);
    const [email, setEmail] = useState('');
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
            if (isRegister) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                onLoginSuccess(userCredential.user);
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                onLoginSuccess(userCredential.user);
            }
        } catch (err) {
            console.error("Auth Error:", err);
            setError(err.message.replace('Firebase: Error (auth/', '').replace(').', ''));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title={isRegister ? "Admin Registration" : "Staff/Admin Login"} onClose={onClose}>
            <p className="text-sm text-gray-600 mb-6">
                {isRegister 
                    ? "Register the first account (Super Admin). Use a secure email and password."
                    : "Enter your assigned email and password to log in."
                }
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="email"
                        placeholder="Email (User ID)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-3 h-12 border border-gray-300 rounded-lg pl-10 focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150"
                    />
                </div>
                <div className="relative">
                    <List className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="password"
                        placeholder="Password (Min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        className="w-full p-3 h-12 border border-gray-300 rounded-lg pl-10 focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150"
                    />
                </div>
                
                {error && <p className="text-red-500 text-sm p-2 bg-red-50 rounded-lg">{error}</p>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-600/40 transition duration-200 disabled:opacity-50 flex items-center justify-center text-lg font-display"
                >
                    {isLoading ? <Loader className="animate-spin w-5 h-5 mr-2" /> : (isRegister ? "Register Admin" : "Log In")}
                </button>
            </form>
            
            <button
                onClick={() => { setIsRegister(p => !p); setError(''); }}
                className="w-full mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
                disabled={isLoading}
            >
                {isRegister ? "Already have an account? Log In" : "Need to register the first Admin? Sign Up"}
            </button>
        </Modal>
    );
};


// --- Main Application Component ---

const App = () => {
    // Firebase State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(true); // Start as ready to show page immediately
    const [role, setRole] = useState(null); 
    const [userStoreId, setUserStoreId] = useState(null); 
    const [stores, setStores] = useState({}); // Dynamic stores state

    // UI State
    const [showAuthModal, setShowAuthModal] = useState(true); // Start with auth modal visible
    const [isFirstUser, setIsFirstUser] = useState(false);
    
    // App State
    const [selectedStoreId, setSelectedStoreId] = useState(''); 
    const [view, setView] = useState('home'); 
    const [isSaving, setIsSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    // Data State
    const [currentStock, setCurrentStock] = useState(getEmptyStock());
    const [yesterdayStock, setYesterdayStock] = useState(getEmptyStock());
    const [orderQuantities, setOrderQuantities] = useState(getEmptyStock());
    
    // No hardcoded stores - only use Firestore data 

    // 1. Firebase Initialization and Authentication 
    useEffect(() => {
        console.log("Firebase config:", firebaseConfig); // Debug log
        
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authentication = getAuth(app);
            setDb(firestore);
            setAuth(authentication);
            console.log("Firebase initialized successfully"); // Debug log

            // --- User Auth and Role Fetching ---
            const fetchUserProfile = async (user) => {
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
                    // Don't set storeId during profile creation - it will be set later when stores are loaded
                    await setDoc(roleDocRef, { role: defaultRole, email: user.email }, { merge: true });
                    setRole(defaultRole);
                    setUserStoreId(null); // Will be set when stores are loaded
                }
            };

            const unsubscribeAuth = onAuthStateChanged(authentication, async (user) => {
                console.log("Auth state changed:", user ? "User logged in" : "No user");
                
                if (!user) {
                    // No user - show login screen
                    setUserId(null);
                    setRole(null);
                    setUserStoreId(null);
                    setShowAuthModal(true);
                    setIsAuthReady(true);
                    return;
                }
                
                // User is logged in - fetch their profile
                setUserId(user.uid);
                setShowAuthModal(false);
                
                try {
                    await fetchUserProfile(user);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
                
                setIsAuthReady(true);
            });

            return () => unsubscribeAuth();
        } catch (e) {
            console.error("Firebase initialization failed:", e);
            setIsAuthReady(true);
        }
    }, []); 

    // 2. Real-time Store Fetching (Runs only after DB, Auth, user authentication, AND role is loaded)
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !role) return; // Wait for role to be loaded before fetching stores

        console.log("Starting store fetch - user authenticated with role:", role);
        const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
        const unsubscribeStores = onSnapshot(storesColRef, async (snapshot) => {
            const newStores = {};
            snapshot.forEach(doc => {
                newStores[doc.id] = doc.data().name;
            });

            console.log("Stores loaded:", Object.keys(newStores).length, "stores");
            // Always use stores from Firestore, no fallback
            setStores(newStores);
        }, (error) => {
            // This is the error handler for insufficient permissions
            console.error("Error listening to stores:", error);
            setStores({}); // No fallback - empty stores list
        });

        return () => unsubscribeStores();
    }, [db, appId, isAuthReady, userId, role]); // Added role to dependencies

    // 3. Set default storeId for admins after stores are loaded
    useEffect(() => {
        if (role === 'admin' && !userStoreId && Object.keys(stores).length > 0 && db && userId) {
            const setDefaultStoreId = async () => {
                const defaultStoreId = Object.keys(stores)[0];
                const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
                try {
                    await updateDoc(roleDocRef, { storeId: defaultStoreId });
                    setUserStoreId(defaultStoreId);
                    console.log("Set default storeId for admin:", defaultStoreId);
                } catch (error) {
                    console.error("Error setting default storeId:", error);
                }
            };
            setDefaultStoreId();
        }
    }, [role, userStoreId, stores, db, userId, appId]);

    // Logic to update user's initial store ID if their profile was created before stores loaded
    useEffect(() => {
        if (db && auth && userId && Object.keys(stores).length > 0 && userStoreId) {
            // Check if the user's assigned store still exists
            if (!stores[userStoreId]) {
                const updateStoreId = async () => {
                    const newStoreId = Object.keys(stores)[0];
                    const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
                    try {
                        await updateDoc(roleDocRef, { storeId: newStoreId });
                        setUserStoreId(newStoreId);
                    } catch (error) {
                        console.error("Error updating store ID:", error);
                    }
                };
                updateStoreId();
            }
        }
    }, [stores, db, auth, userId, appId]); // Removed userStoreId from deps to prevent loop


    const calculateSold = useCallback((category, item) => {
        const key = `${category}-${item}`;
        const current = currentStock[key] || 0;
        const yesterday = yesterdayStock[key] || 0;
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
        if (!db || !userId || !selectedStoreId) throw new Error("Database or Store not initialized.");

        // Validate stock data
        const hasValidData = Object.values(currentStock).some(value => value > 0);
        if (!hasValidData) {
            throw new Error("Please enter at least one stock item before saving.");
        }

        // Sanitize stock data - ensure all values are valid numbers
        const sanitizedStock = {};
        Object.keys(currentStock).forEach(key => {
            const value = currentStock[key];
            sanitizedStock[key] = (typeof value === 'number' && !isNaN(value) && value >= 0) ? value : 0;
        });

        setIsSaving(true);
        const date = getTodayDate();
        const docId = `${selectedStoreId}-${date}`;
        const docRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, docId);

        try {
            await setDoc(docRef, {
                storeId: selectedStoreId,
                date: date,
                stock: sanitizedStock, 
                userId: userId,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error saving stock:", e);
            throw e;
        } finally {
            setIsSaving(false);
        }
    };

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

        Object.keys(MASTER_STOCK_LIST).forEach(category => {
            MASTER_STOCK_LIST[category].forEach(item => {
                const key = `${category}-${item}`; 
                const quantity = orderQuantities[key] || ''; 
                if (quantity !== 0 && quantity !== '') {
                    if (sections[category]) {
                        sections[category].push(`${item} - ${quantity}`);
                    } else if (category === 'MISC' && item === 'Ice Cream Dabee') {
                        miscItems.push(`${item} - ${quantity}`);
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

        // Output logic for Kumar Parisar only if Venkateshwara Hospitality (store-1) is selected
        if (selectedStoreId === 'store-1' && stores['store-2']) {
            output += stores['store-2'];
            output += '\n';
        }


        return output.trim();
    }, [orderQuantities, selectedStoreId, stores]);

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            window.location.reload(); 
        }
    };

    const handleAuthSuccess = (user) => {
        if (user) {
            const fetchProfile = async () => {
                const roleDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_config`, 'profile');
                const roleSnap = await getDoc(roleDocRef);
                
                if (roleSnap.exists()) {
                    setRole(roleSnap.data().role);
                    setUserStoreId(roleSnap.data().storeId || null);
                } else {
                    const defaultRole = 'admin'; 
                    // Use the first store from the dynamically loaded list for the initial admin
                    const defaultStoreId = Object.keys(stores).length > 0 ? Object.keys(stores)[0] : Object.keys(initialStores)[0]; 
                    await setDoc(roleDocRef, { role: defaultRole, storeId: defaultStoreId, email: user.email }, { merge: true });
                    setRole(defaultRole);
                    setUserStoreId(defaultStoreId);
                }
                setShowAuthModal(false);
            };
            fetchProfile();
        }
    };

    // --- View Rendering Logic ---

    if (!isAuthReady) {
        return <LoadingSpinner />;
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
    if (!userId || !role) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-xl shadow-xl border-t-4 border-orange-600 p-6 text-center">
                        <h1 className="text-3xl font-bold font-display text-orange-600 mb-2">Sujata Mastani</h1>
                        <p className="text-gray-600 mb-6">Inventory Management System</p>
                        <p className="text-gray-700 font-medium mb-4">Please log in or register the Super Admin account to access the app features.</p>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition duration-150 shadow-md flex items-center justify-center text-lg font-display"
                        >
                            <User className="w-5 h-5 mr-2" /> Log In / Register
                        </button>
                    </div>
                </div>
                
                {showAuthModal && (
                    <AuthModal 
                        auth={auth} 
                        onClose={() => setShowAuthModal(false)}
                        onLoginSuccess={handleAuthSuccess}
                        isFirstUser={isFirstUser}
                    />
                )}
            </div>
        );
    }

    // If stores haven't loaded yet but user is authenticated, show minimal loading
    if (Object.keys(stores).length === 0 && userId && role) {
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
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => { setSelectedStoreId(id); setView('entry'); }}
                                            className="flex flex-1 items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-700"
                                        >
                                            <List className="w-4 h-4 mr-2" /> Stock Entry
                                        </button>
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => { setSelectedStoreId(id); setView('order'); }}
                                                className="flex flex-1 items-center justify-center rounded-lg border border-orange-600/50 bg-white px-4 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
                                            >
                                                <ShoppingCart className="w-4 h-4 mr-2" /> Admin Order
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

                {role === 'admin' && (
                    <>
                        <NavButton
                            icon={Store} // New Store Management Button
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
                        
                        {selectedStoreId && (
                            <>
                                <NavButton
                                    icon={TrendingDown}
                                    label="Sold"
                                    active={currentView === 'sold'}
                                    onClick={() => setView('sold')}
                                />
                                <NavButton
                                    icon={ShoppingCart}
                                    label="Order"
                                    active={currentView === 'order'}
                                    onClick={() => setView('order')}
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
                return <StoreManagementView db={db} appId={appId} stores={stores} />;
            case 'usermanager':
                if (!isAdmin) return <HomeView />;
                return <AdminUserManagementView db={db} appId={appId} stores={stores} auth={auth} />;
            case 'entry':
                return (
                    <StockEntryView
                        storeId={storeName}
                        stockData={currentStock}
                        setStockData={setCurrentStock}
                        saveStock={saveStock}
                        isSaving={isSaving}
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
                    />
                );
            default:
                return <HomeView />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased pb-20">
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
                
                /* Global Number Input Reset */
                input[type="number"]::-webkit-inner-spin-button, 
                input[type="number"]::-webkit-outer-spin-button { 
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
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
                    {auth && auth.currentUser && !auth.currentUser.isAnonymous && (
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
