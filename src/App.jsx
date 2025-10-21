import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection, 
    addDoc, 
    onSnapshot, 
    deleteDoc,
    writeBatch
} from 'firebase/firestore';
import { User, Home, List, ShoppingCart, Loader, TrendingDown, LogOut, UserPlus, X, Store, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react'; 

// --- Constants (from constants.js) ---
const INITIAL_STOCK_LIST = {
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
const USER_ROLES = { ADMIN: 'admin', STAFF: 'staff' };
const VIEWS = { HOME: 'home', ENTRY: 'entry', SOLD: 'sold', ORDER: 'order', ADMIN_FUNCTIONS: 'admin_functions', STORE_MANAGER: 'storemanager', USER_MANAGER: 'usermanager', ITEM_MANAGER: 'itemmanager' };

// --- Firebase Setup ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id').replace(/\//g, '_');

// --- Utility Functions ---
const getEmptyStock = (stockList) => {
  const stock = {};
  Object.keys(stockList).forEach(category => {
    stockList[category].forEach(item => {
      stock[`${category}-${item}`] = 0;
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

// --- Child Components ---

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-screen bg-gray-50 text-orange-600">
    <Loader className="animate-spin w-10 h-10 mb-4 text-orange-600" />
    <p className="text-xl font-display text-gray-700">{message}</p>
  </div>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm">
    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative border border-orange-100">
      <h3 className="text-2xl font-bold font-display text-orange-700 border-b border-gray-200 pb-3 mb-4">
        {title}
      </h3>
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

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmColor = 'orange' }) => {
  const colorClasses = {
    orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/40',
    red: 'bg-red-600 hover:bg-red-700 shadow-red-600/40',
  };
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-gray-700 mb-6 text-base leading-relaxed whitespace-pre-wrap">{message}</p>
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

const Toast = ({ message, type = 'success', onClose }) => {
    const icons = { success: '✓', error: '✗', warning: '⚠' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500' };
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);
    return (
        <div className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md animate-slideInRight`}>
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-xl font-bold">{icons[type]}</div>
            <p className="flex-1 font-medium">{message}</p>
            <button onClick={onClose} className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition"><X className="w-5 h-5" /></button>
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map(toast => <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />)}
    </div>
);

const StockInput = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg mb-2 border border-gray-100">
        <label className="text-sm font-medium text-gray-800 w-1/2 overflow-hidden whitespace-nowrap text-ellipsis pr-2">{label}</label>
        <input
            type="number"
            min="0"
            step="0.01"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="w-1/3 p-2 text-base text-right bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-600 focus:border-orange-600 transition duration-150 shadow-inner"
        />
    </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, minLength }) => (
    <label className="flex flex-col min-w-40 flex-1">
        <p className="text-sm font-semibold text-orange-700/80 leading-normal pb-2">{label}</p>
        <input 
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900 transition-all duration-300"
            type={type} value={value} onChange={onChange} placeholder={placeholder} minLength={minLength} required
        />
    </label>
);

const SelectField = ({ label, value, onChange, children }) => (
    <label className="flex flex-col min-w-40 flex-1">
        <p className="text-sm font-semibold text-orange-700/80 leading-normal pb-2">{label}</p>
        <select
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900 transition-all duration-300"
            value={value} onChange={onChange}
        >
            {children}
        </select>
    </label>
);

// --- Sub-Views and Components ---

const AuthModal = ({ auth, onLoginSuccess, onClose, isFirstUser }) => {
    const [isRegister, setIsRegister] = useState(isFirstUser);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }
        const email = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
        try {
            const userCredential = isRegister
                ? await createUserWithEmailAndPassword(auth, email, password)
                : await signInWithEmailAndPassword(auth, email, password);
            onLoginSuccess(userCredential.user, username.trim());
        } catch (err) {
            setError(err.message.replace('Firebase: Error (auth/', '').replace(').', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title={isRegister ? "Admin Registration" : "Login"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label="Username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g., staff.kothrud" />
                <InputField label="Password (Min 6 chars)" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="******" minLength="6" />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50">{loading ? 'Processing...' : (isRegister ? 'Register' : 'Log In')}</button>
            </form>
            {!isFirstUser && <button onClick={() => setIsRegister(p => !p)} className="w-full mt-4 text-sm text-orange-600">{isRegister ? "Already have an account? Log In" : "Need to register? Sign Up"}</button>}
        </Modal>
    );
};

const StockEntryView = ({ storeName, stockData, setStockData, saveStock, isSaving, selectedDate, setSelectedDate, masterStockList, hasSaveError }) => (
    <div className="p-4 space-y-6">
        <h2 className="text-2xl font-bold font-display text-gray-900">Closing Stock for {storeName}</h2>
        <InputField label="Select Date" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        {Object.keys(masterStockList).map(category => (
            <div key={category} className="bg-white p-4 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-orange-700 border-b pb-2 mb-3">{category}</h3>
                {masterStockList[category].map(item => (
                    <StockInput key={`${category}-${item}`} label={item} value={stockData[`${category}-${item}`]} onChange={val => setStockData(p => ({ ...p, [`${category}-${item}`]: val }))} />
                ))}
            </div>
        ))}
        <button onClick={saveStock} disabled={isSaving} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Stock'}</button>
        {hasSaveError && <button onClick={saveStock} className="w-full mt-2 py-2 bg-red-600 text-white font-bold rounded-lg">Retry Save</button>}
    </div>
);

const StockSoldView = ({ currentStock, yesterdayStock, calculateSold, soldStockSummary, masterStockList }) => (
    <div className="p-4 space-y-6">
        <h2 className="text-2xl font-bold font-display">Stock Sold Report</h2>
        <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <p className="text-6xl font-extrabold text-orange-600">{soldStockSummary}</p>
            <p className="text-base text-gray-600">Total Units Sold Today</p>
        </div>
        {Object.keys(masterStockList).map(category => (
            <div key={category} className="bg-white p-4 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-red-600 border-b pb-2 mb-3">{category}</h3>
                {masterStockList[category].map(item => {
                    const key = `${category}-${item}`;
                    const sold = calculateSold(key);
                    return (
                        <div key={key} className={`flex justify-between items-center p-3 rounded-lg ${sold < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <div>
                                <p className="font-semibold">{item}</p>
                                <p className="text-xs text-gray-500">Yst: {yesterdayStock[key] || 0} | Cur: {currentStock[key] || 0}</p>
                            </div>
                            <p className={`text-2xl font-bold ${sold < 0 ? 'text-red-700' : 'text-orange-600'}`}>{sold}</p>
                        </div>
                    );
                })}
            </div>
        ))}
    </div>
);

const OrderingView = ({ currentStock, orderQuantities, setOrderQuantities, stores, selectedStoreId, showToast, masterStockList }) => {
    const generateOrderOutput = () => {
      let output = `${stores[selectedStoreId] || 'Selected Store'}\n\n`;
      Object.keys(masterStockList).forEach(category => {
          output += `*${category.toUpperCase()}*\n`;
          masterStockList[category].forEach(item => {
              const key = `${category}-${item}`;
              const qty = orderQuantities[key] || 0;
              if (qty > 0) {
                  output += `${item} - ${qty}\n`;
              }
          });
          output += '\n';
      });
      return output;
    };

    const handleCopy = async () => {
        const output = generateOrderOutput();
        try {
            await navigator.clipboard.writeText(output);
            showToast('Order copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for older browsers or insecure contexts
            const textArea = document.createElement("textarea");
            textArea.value = output;
            textArea.style.position = "fixed";
            textArea.style.top = "-9999px";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
              showToast('Order copied to clipboard!', 'success');
            } catch (copyErr) {
              showToast('Failed to copy. Please copy manually.', 'error');
            } finally {
               document.body.removeChild(textArea);
            }
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display">Order Management</h2>
            {Object.keys(masterStockList).map(category => (
                <div key={category} className="bg-white p-4 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-orange-700 border-b pb-2 mb-3">{category}</h3>
                    {masterStockList[category].map(item => {
                        const key = `${category}-${item}`;
                        return (
                            <div key={key} className="flex items-center justify-between p-3">
                                <div>
                                    <p className="font-semibold">{item}</p>
                                    <p className="text-xs text-gray-500">Current: {currentStock[key] || 0}</p>
                                </div>
                                <input type="number" min="0" value={orderQuantities[key] || ''} onChange={e => setOrderQuantities(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))} className="w-1/3 p-2 text-right border rounded" />
                            </div>
                        );
                    })}
                </div>
            ))}
            <button onClick={handleCopy} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl">Generate & Copy Order</button>
        </div>
    );
};

const AdminUserManagementView = ({ db, appId, stores, auth, showToast }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(USER_ROLES.STAFF);
    const [storeId, setStoreId] = useState(Object.keys(stores)[0] || '');
    const [loading, setLoading] = useState(false);

    const handleCreate = async e => {
        e.preventDefault();
        setLoading(true);
        const email = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const profileRef = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}/user_config/profile`);
            await setDoc(profileRef, { role, storeId, username: username.trim() });
            showToast('User created successfully!', 'success');
            setUsername(''); setPassword('');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleCreate} className="p-4 space-y-4">
            <h2 className="text-2xl font-bold font-display">User Manager</h2>
            <InputField label="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <SelectField label="Role" value={role} onChange={e => setRole(e.target.value)}>
                <option value={USER_ROLES.STAFF}>Staff</option>
                <option value={USER_ROLES.ADMIN}>Admin</option>
            </SelectField>
            <SelectField label="Store" value={storeId} onChange={e => setStoreId(e.target.value)}>
                {Object.entries(stores).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </SelectField>
            <button type="submit" disabled={loading} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl">{loading ? 'Creating...' : 'Create User'}</button>
        </form>
    );
};

const StoreManagementView = ({ db, appId, stores, showToast, showConfirm }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/stores`), { name: name.trim(), createdAt: new Date().toISOString() });
            showToast('Store added!', 'success');
            setName('');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, storeName) => {
        const confirmed = await showConfirm({ title: 'Delete Store', message: `Delete "${storeName}"?`, confirmColor: 'red' });
        if (confirmed) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/stores`, id));
                showToast('Store deleted.', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display">Store Manager</h2>
            <form onSubmit={handleAdd} className="space-y-4">
                <InputField label="New Store Name" value={name} onChange={e => setName(e.target.value)} />
                <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl">{loading ? 'Adding...' : 'Add Store'}</button>
            </form>
            <div>
                <h3 className="text-lg font-bold mt-6 mb-2">Current Stores</h3>
                {Object.entries(stores).map(([id, storeName]) => (
                    <div key={id} className="flex justify-between items-center p-3 bg-white rounded-lg shadow mb-2">
                        <span>{storeName}</span>
                        <button onClick={() => handleDelete(id, storeName)} className="text-red-500"><Trash2 /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StockItemManagementView = ({ db, appId, masterStockList, showToast, showConfirm }) => {
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState('MILKSHAKE');
    const [loading, setLoading] = useState(false);
    
    const stockListRef = doc(db, `artifacts/${appId}/public/config/settings/masterStockList`);

    const handleSave = async (newList) => {
        setLoading(true);
        try {
            await setDoc(stockListRef, { list: newList });
            showToast('Item list updated!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async e => {
        e.preventDefault();
        const newList = { ...masterStockList };
        newList[category] = [...(newList[category] || []), itemName.trim()];
        await handleSave(newList);
        setItemName('');
    };

    const handleDelete = async (cat, item) => {
        const confirmed = await showConfirm({ title: 'Delete Item', message: `Delete "${item}"?`, confirmColor: 'red' });
        if (confirmed) {
            const newList = { ...masterStockList };
            newList[cat] = newList[cat].filter(i => i !== item);
            await handleSave(newList);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display">Stock Item Manager</h2>
            <form onSubmit={handleAdd} className="space-y-4">
                <SelectField label="Category" value={category} onChange={e => setCategory(e.target.value)}>
                    {Object.keys(masterStockList).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </SelectField>
                <InputField label="New Item Name" value={itemName} onChange={e => setItemName(e.target.value)} />
                <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl">{loading ? 'Adding...' : 'Add Item'}</button>
            </form>
             {Object.keys(masterStockList).map(cat => (
                <div key={cat} className="bg-white p-4 rounded-xl shadow-lg mt-4">
                    <h3 className="text-lg font-bold text-orange-700 border-b pb-2 mb-3">{cat}</h3>
                    {masterStockList[cat].map(item => (
                        <div key={item} className="flex justify-between items-center p-2">
                            <span>{item}</span>
                            <button onClick={() => handleDelete(cat, item)} className="text-red-500"><Trash2 size={18} /></button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const NavBar = ({ currentView, setView, role, onHomeClick }) => {
    const NavButton = ({ icon, label, view, ...props }) => (
        <button {...props} onClick={() => setView(view)} className={`flex flex-col items-center p-1 w-1/5 ${currentView === view ? 'text-orange-600' : 'text-gray-500'}`}>
            {React.createElement(icon, { className: "w-6 h-6" })}
            <span className="text-xs">{label}</span>
        </button>
    );
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] flex justify-around h-16 max-w-lg mx-auto">
            <button onClick={onHomeClick} className={`flex flex-col items-center p-1 w-1/5 ${currentView === VIEWS.HOME ? 'text-orange-600' : 'text-gray-500'}`}>
                <Home className="w-6 h-6" />
                <span className="text-xs">Home</span>
            </button>
            {role === USER_ROLES.ADMIN && <NavButton icon={ShieldCheck} label="Admin" view={VIEWS.ADMIN_FUNCTIONS} />}
            {/* Add more nav buttons as needed */}
        </nav>
    );
};

// --- Main App Logic ---
const App = () => {
    // Core State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState({ role: null, storeId: null });
    const [appStatus, setAppStatus] = useState('initializing'); // initializing, authenticating, loading, ready, error
    const [appError, setAppError] = useState(null);

    // Data State
    const [stores, setStores] = useState({});
    const [masterStockList, setMasterStockList] = useState(INITIAL_STOCK_LIST);
    const [currentStock, setCurrentStock] = useState({});
    const [yesterdayStock, setYesterdayStock] = useState({});
    const [orderQuantities, setOrderQuantities] = useState({});

    // UI State
    const [view, setView] = useState(VIEWS.HOME);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [isSaving, setIsSaving] = useState(false);
    const [hasSaveError, setHasSaveError] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isFirstUser, setIsFirstUser] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);

    // Derived State
    const { role, storeId: assignedStoreId } = userProfile;

    // --- Toast & Confirmation Callbacks ---
    const showToast = useCallback((message, type = 'success') => {
        setToasts(prev => [...prev, { id: Date.now(), message, type }]);
    }, []);
    const removeToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);
    const showConfirm = useCallback(options => {
        return new Promise(resolve => {
            setConfirmDialog({
                ...options,
                onConfirm: () => { setConfirmDialog(null); resolve(true); },
                onCancel: () => { setConfirmDialog(null); resolve(false); }
            });
        });
    }, []);

    // --- Error Handling ---
    const handleError = (error, context = 'Unknown') => {
        console.error(`Error in ${context}:`, error);
        setAppError({ message: error.message || 'An unexpected error occurred.', context });
        setAppStatus('error');
    };

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authentication = getAuth(app);
            setDb(firestore);
            setAuth(authentication);

            const unsubscribe = onAuthStateChanged(authentication, async (authUser) => {
                if (authUser) {
                    setUser(authUser);
                } else {
                    setUser(null);
                    setUserProfile({ role: null, storeId: null });
                    try {
                        const setupDocRef = doc(firestore, `artifacts/${appId}/public/config/settings/setup`);
                        const setupDocSnap = await getDoc(setupDocRef);
                        setIsFirstUser(!setupDocSnap.exists());
                    } catch (error) {
                        console.warn("Could not check for first user setup (likely due to permissions for anonymous users, this is normal):", error.message);
                        setIsFirstUser(false);
                    }
                    setAppStatus('authenticating');
                    setShowAuthModal(true);
                }
            });
            return () => unsubscribe();
        } catch (error) {
            handleError(error, 'Firebase Initialization');
        }
    }, []);

    // --- User Profile, Stores, and Master Stock List Fetching ---
    useEffect(() => {
        if (!db || !user) return;

        const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_config/profile`);
        const storesRef = collection(db, `artifacts/${appId}/public/data/stores`);
        const stockListRef = doc(db, `artifacts/${appId}/public/config/settings/masterStockList`);

        const unsubProfile = onSnapshot(profileRef, 
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setUserProfile({ role: data.role, storeId: data.storeId });
                }
            }, 
            (err) => handleError(err, 'Profile Listener')
        );

        const unsubStores = onSnapshot(storesRef, 
            (snapshot) => {
                const newStores = {};
                snapshot.forEach(doc => newStores[doc.id] = doc.data().name);
                setStores(newStores);
            }, 
            (err) => handleError(err, 'Stores Listener')
        );
        
        const unsubStockList = onSnapshot(stockListRef, (snap) => {
            if (snap.exists()) {
                setMasterStockList(snap.data().list);
            }
            // NOTE: Removed automatic creation of the master stock list.
            // This was likely causing permission errors for non-admin users on first load.
            // The document is now created/updated only within the Admin's Item Management view.
        }, (err) => handleError(err, 'Stock List Listener'));

        return () => {
            unsubProfile();
            unsubStores();
            unsubStockList();
        };
    }, [db, user]);

    // --- Data Loading Trigger ---
    useEffect(() => {
        if (role && (role === USER_ROLES.ADMIN ? selectedStoreId : assignedStoreId)) {
            setAppStatus('loading');
            const storeToLoad = role === USER_ROLES.ADMIN ? selectedStoreId : assignedStoreId;
            
            const todayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeToLoad}-${selectedDate}`);
            const yesterdayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeToLoad}-${getYesterdayDate()}`);
            
            let initialLoadsPending = 2; // Counter for initial data from listeners
            const onInitialLoadDone = () => {
                initialLoadsPending--;
                if (initialLoadsPending <= 0) {
                    setAppStatus('ready');
                }
            };

            const unsubToday = onSnapshot(todayDocRef, (snap) => {
                setCurrentStock(snap.exists() ? { ...getEmptyStock(masterStockList), ...snap.data().stock } : getEmptyStock(masterStockList));
                onInitialLoadDone();
            }, (err) => { handleError(err, `Today's Stock Listener`); onInitialLoadDone(); });
            
            const unsubYesterday = onSnapshot(yesterdayDocRef, (snap) => {
                setYesterdayStock(snap.exists() ? { ...getEmptyStock(masterStockList), ...snap.data().stock } : getEmptyStock(masterStockList));
                onInitialLoadDone();
            }, (err) => { handleError(err, `Yesterday's Stock Listener`); onInitialLoadDone(); });
            
            return () => {
                unsubToday();
                unsubYesterday();
            };
        }
    }, [db, role, assignedStoreId, selectedStoreId, selectedDate, masterStockList]);
    
    // --- Business Logic ---
    const calculateSold = useCallback((key) => {
        const current = currentStock[key] || 0;
        const yesterday = yesterdayStock[key] || 0;
        return yesterday - current;
    }, [currentStock, yesterdayStock]);

    const soldStockSummary = useMemo(() => {
        return Object.keys(masterStockList).reduce((total, category) => {
            const categoryTotal = masterStockList[category].reduce((catTotal, item) => {
                const key = `${category}-${item}`;
                const sold = calculateSold(key);
                return catTotal + (sold > 0 ? sold : 0);
            }, 0);
            return total + categoryTotal;
        }, 0);
    }, [calculateSold, masterStockList]);

    // --- Actions ---
    const handleLogout = () => signOut(auth).catch(err => handleError(err, 'Logout'));

    const handleAuthSuccess = async (authUser, username) => {
        if (!isFirstUser) {
            setShowAuthModal(false);
            return;
        }
        const profileRef = doc(db, `artifacts/${appId}/users/${authUser.uid}/user_config/profile`);
        const setupRef = doc(db, `artifacts/${appId}/public/config/settings/setup`);
        const batch = writeBatch(db);
        batch.set(profileRef, { role: USER_ROLES.ADMIN, storeId: null, username });
        batch.set(setupRef, { setupComplete: true, timestamp: new Date().toISOString() });
        await batch.commit();
        setIsFirstUser(false);
        setShowAuthModal(false);
    };

    const saveStock = async () => {
        const storeToSave = role === USER_ROLES.ADMIN ? selectedStoreId : assignedStoreId;
        if (!storeToSave) return showToast('No store selected.', 'error');

        const confirmed = await showConfirm({
            title: 'Confirm Stock Entry',
            message: `Save stock for ${stores[storeToSave]} on ${selectedDate}?`,
            confirmText: 'Save',
            confirmColor: 'orange'
        });
        if (!confirmed) return;

        setIsSaving(true);
        setHasSaveError(false);
        const docRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeToSave}-${selectedDate}`);
        try {
            await setDoc(docRef, {
                storeId: storeToSave,
                date: selectedDate,
                stock: currentStock,
                userId: user.uid,
                timestamp: new Date().toISOString()
            });
            showToast('Stock saved successfully!', 'success');
        } catch (error) {
            setHasSaveError(true);
            handleError(error, 'Save Stock');
            showToast('Failed to save stock. Check connection.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- Render Logic ---
    if (appStatus === 'initializing' || (user && !role)) {
        return <LoadingSpinner message="Initializing App..." />;
    }
    if (appStatus === 'error') {
        return <div className="p-4 text-center text-red-500">Error: {appError.message} ({appError.context})</div>;
    }
    if (appStatus === 'authenticating') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                {showAuthModal && <AuthModal auth={auth} onLoginSuccess={handleAuthSuccess} onClose={() => setShowAuthModal(false)} isFirstUser={isFirstUser} />}
            </div>
        );
    }
    
    const storeName = stores[selectedStoreId] || 'Select Store';

    const renderView = () => {
        if (!role) return <LoadingSpinner message="Loading user profile..." />;

        if (view === VIEWS.HOME || (role === USER_ROLES.STAFF && !assignedStoreId) || (role === USER_ROLES.ADMIN && Object.keys(stores).length > 0 && !selectedStoreId)) {
            return (
                <div className="p-4 space-y-4">
                    {Object.entries(stores).map(([id, name]) => {
                        if (role === USER_ROLES.STAFF && id !== assignedStoreId) return null;
                        return (
                            <div key={id} className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-orange-600">
                                <p className="font-display text-lg font-bold text-gray-900">{name}</p>
                                <div className="flex gap-3 mt-3">
                                    <button onClick={() => { setSelectedStoreId(id); setView(VIEWS.ENTRY); }} className="flex-1 bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">Stock Entry</button>
                                    {role === USER_ROLES.ADMIN && <button onClick={() => { setSelectedStoreId(id); setView(VIEWS.ADMIN_FUNCTIONS); }} className="flex-1 border border-orange-600 text-orange-600 font-bold py-2 px-4 rounded-lg">Admin</button>}
                                </div>
                            </div>
                        );
                    })}
                    {role === USER_ROLES.ADMIN && Object.keys(stores).length === 0 && (
                        <div className="text-center p-4 bg-white rounded-xl shadow">
                            <p>No stores found. Go to Admin to create one.</p>
                        </div>
                    )}
                </div>
            );
        }
        
        switch (view) {
            case VIEWS.ENTRY:
                return <StockEntryView storeName={storeName} stockData={currentStock} setStockData={setCurrentStock} saveStock={saveStock} isSaving={isSaving} selectedDate={selectedDate} setSelectedDate={setSelectedDate} masterStockList={masterStockList} hasSaveError={hasSaveError} />;
            case VIEWS.ADMIN_FUNCTIONS:
                return (
                    <div className="p-4 grid grid-cols-2 gap-4">
                        <button onClick={() => setView(VIEWS.SOLD)} className="p-4 bg-white rounded-xl shadow-lg text-center font-bold">Sold Report</button>
                        <button onClick={() => setView(VIEWS.ORDER)} className="p-4 bg-white rounded-xl shadow-lg text-center font-bold">Ordering</button>
                        <button onClick={() => setView(VIEWS.USER_MANAGER)} className="p-4 bg-white rounded-xl shadow-lg text-center font-bold">Users</button>
                        <button onClick={() => setView(VIEWS.STORE_MANAGER)} className="p-4 bg-white rounded-xl shadow-lg text-center font-bold">Stores</button>
                        <button onClick={() => setView(VIEWS.ITEM_MANAGER)} className="p-4 bg-white rounded-xl shadow-lg text-center font-bold">Items</button>
                    </div>
                );
            case VIEWS.SOLD:
                 return <StockSoldView currentStock={currentStock} yesterdayStock={yesterdayStock} calculateSold={calculateSold} soldStockSummary={soldStockSummary} masterStockList={masterStockList} />;
            case VIEWS.ORDER:
                return <OrderingView currentStock={currentStock} orderQuantities={orderQuantities} setOrderQuantities={setOrderQuantities} stores={stores} selectedStoreId={selectedStoreId} showToast={showToast} masterStockList={masterStockList}/>;
            case VIEWS.USER_MANAGER:
                return <AdminUserManagementView db={db} appId={appId} stores={stores} auth={auth} showToast={showToast} />;
            case VIEWS.STORE_MANAGER:
                return <StoreManagementView db={db} appId={appId} stores={stores} showToast={showToast} showConfirm={showConfirm} />;
            case VIEWS.ITEM_MANAGER:
                return <StockItemManagementView db={db} appId={appId} masterStockList={masterStockList} showToast={showToast} showConfirm={showConfirm} />;
            default:
                setView(VIEWS.HOME);
                return null;
        }
    };
    
    // Determine which store is active for display and actions
    const activeStoreId = role === USER_ROLES.ADMIN ? selectedStoreId : assignedStoreId;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased pb-20">
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Poppins:wght@700&display=swap'); body { font-family: 'Inter', sans-serif; } .font-display { font-family: 'Poppins', sans-serif; } @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } } .animate-slideInRight { animation: slideInRight 0.3s ease-out forwards; }`}</style>
            
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            {confirmDialog && <ConfirmModal {...confirmDialog} />}

            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
                <h1 className="text-xl font-bold font-display text-gray-900 tracking-wider">
                    {activeStoreId ? stores[activeStoreId] : 'SUJATA MASTANI'}
                </h1>
                <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${role === 'admin' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                        {role ? role.toUpperCase() : '...'}
                    </span>
                    <button onClick={handleLogout} className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition"><LogOut className="w-5 h-5" /></button>
                </div>
            </header>

            <main className="max-w-lg mx-auto pt-2 pb-4">
                {appStatus === 'loading' ? <LoadingSpinner message="Loading Data..."/> : renderView()}
            </main>
            
            <NavBar currentView={view} setView={setView} role={role} onHomeClick={() => { setView(VIEWS.HOME); setSelectedStoreId(''); }} />
        </div>
    );
};

export default App;
