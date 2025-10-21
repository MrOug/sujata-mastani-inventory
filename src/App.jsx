import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
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
    collection, 
    addDoc, 
    onSnapshot, 
    deleteDoc,
    writeBatch,
    query,
    getDocs
} from 'firebase/firestore';
import { User, Home, List, ShoppingCart, Loader, LogOut, X, Store, Trash2, ShieldCheck, TrendingDown, Users, Package, ArrowLeft, Settings } from 'lucide-react'; 

// --- Constants (from project files) ---
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

// --- App ID (using placeholder) ---
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
const getYesterdayDate = (dateStr) => {
    const d = new Date(dateStr);
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 backdrop-blur-sm animate-fadeIn">
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

const FirebaseConfigModal = ({ onConfigSaved }) => {
    const [configJson, setConfigJson] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        try {
            const config = JSON.parse(configJson);
            if (!config.apiKey || !config.projectId) {
                setError('Invalid Firebase config. Missing apiKey or projectId.');
                return;
            }
            localStorage.setItem('firebaseConfig', JSON.stringify(config));
            onConfigSaved(config);
        } catch (e) {
            setError('Invalid JSON. Please paste the config object from Firebase.');
        }
    };

    return (
        <Modal title="Firebase Setup Required">
            <p className="text-gray-600 mb-4">
                Please paste your Firebase configuration object below. You can find this in your Firebase project settings.
            </p>
            <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                placeholder='{"apiKey": "...", "authDomain": "...", ...}'
                className="w-full h-40 p-2 border rounded-md font-mono text-sm"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
                onClick={handleSave}
                className="w-full mt-4 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors"
            >
                Save and Initialize
            </button>
        </Modal>
    );
};


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

const InputField = ({ label, type = 'text', value, onChange, placeholder, minLength, required=true }) => (
    <label className="flex flex-col min-w-40 flex-1">
        <p className="text-sm font-semibold text-orange-700/80 leading-normal pb-2">{label}</p>
        <input 
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg focus:ring-2 focus:ring-orange-600/50 border border-gray-300 bg-white focus:border-orange-600 h-12 placeholder:text-gray-400 p-3 text-base font-normal leading-normal text-gray-900 transition-all duration-300"
            type={type} value={value} onChange={onChange} placeholder={placeholder} minLength={minLength} required={required}
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

const AuthModal = ({ auth, onLoginSuccess, onClose, isFirstUser }) => {
    const [isRegister, setIsRegister] = useState(isFirstUser);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const title = isFirstUser ? "Create Super Admin" : (isRegister ? "Register User" : "User Login");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        const email = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
        try {
            const userCredential = isRegister
                ? await createUserWithEmailAndPassword(auth, email, password)
                : await signInWithEmailAndPassword(auth, email, password);
            onLoginSuccess(userCredential.user, username.trim());
        } catch (err) {
            const friendlyError = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : "An unknown error occurred";
            setError(friendlyError.charAt(0).toUpperCase() + friendlyError.slice(1));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title={title} onClose={onClose}>
            {isFirstUser && <p className="mb-4 text-sm text-yellow-700 bg-yellow-100 p-3 rounded-md">No admin account found. The first registered user will become the super admin.</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label="Username" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g., staff.kothrud" />
                <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 6 characters" minLength="6" />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50 transition-colors hover:bg-orange-700">{loading ? 'Processing...' : (isRegister ? 'Register' : 'Log In')}</button>
            </form>
            {!isFirstUser && <button onClick={() => setIsRegister(p => !p)} className="w-full mt-4 text-sm text-center text-orange-600 hover:underline">{isRegister ? "Already have an account? Log In" : "Need to register? Sign Up"}</button>}
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
        <button onClick={saveStock} disabled={isSaving} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50 shadow-lg hover:bg-orange-700 transition">{isSaving ? 'Saving...' : 'Save Closing Stock'}</button>
        {hasSaveError && <button onClick={saveStock} className="w-full mt-2 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Retry Save</button>}
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
                        <div key={key} className={`flex justify-between items-center p-3 rounded-lg mb-1 ${sold < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <div>
                                <p className="font-semibold">{item}</p>
                                <p className="text-xs text-gray-500">Yesterday: {yesterdayStock[key] || 0} | Current: {currentStock[key] || 0}</p>
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
      let output = `*ORDER - ${stores[selectedStoreId] || 'Selected Store'}*\n\n`;
      Object.keys(masterStockList).forEach(category => {
          const categoryItems = masterStockList[category]
              .map(item => {
                  const key = `${category}-${item}`;
                  const qty = orderQuantities[key] || 0;
                  return qty > 0 ? `${item} - ${qty}` : null;
              })
              .filter(Boolean);

          if (categoryItems.length > 0) {
              output += `*${category.toUpperCase()}*\n`;
              output += categoryItems.join('\n');
              output += '\n\n';
          }
      });
      return output;
    };

    const handleCopy = async () => {
        const output = generateOrderOutput();
        try {
            await navigator.clipboard.writeText(output);
            showToast('Order copied to clipboard!', 'success');
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = output;
            textArea.style.position = "fixed"; textArea.style.top = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus(); textArea.select();
            try { document.execCommand('copy'); showToast('Order copied as fallback!', 'success'); } 
            catch (copyErr) { showToast('Failed to copy. Please copy manually.', 'error'); console.error(output); } 
            finally { document.body.removeChild(textArea); }
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
                            <div key={key} className="flex items-center justify-between p-3 border-b last:border-b-0">
                                <div>
                                    <p className="font-semibold">{item}</p>
                                    <p className="text-xs text-gray-500">Current Stock: {currentStock[key] || 0}</p>
                                </div>
                                <input type="number" min="0" placeholder="Qty" value={orderQuantities[key] || ''} onChange={e => setOrderQuantities(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))} className="w-1/4 p-2 text-right border rounded" />
                            </div>
                        );
                    })}
                </div>
            ))}
            <button onClick={handleCopy} className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700">Generate & Copy Order</button>
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
        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', 'error');
            return;
        }
        setLoading(true);
        const email = `${username.toLowerCase().trim()}@sujata-mastani-inventory.local`;
        try {
            // Note: In a production app, you'd handle user creation on a backend for security.
            // Here, we rely on Firestore rules restricting who can create users (implicitly, only admins who can see this view).
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
            <InputField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 6 characters" />
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
        if (!name.trim()) {
            showToast('Store name cannot be empty.', 'error');
            return;
        }
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
        const confirmed = await showConfirm({ title: 'Delete Store', message: `Are you sure you want to delete "${storeName}"? This action cannot be undone.`, confirmColor: 'red' });
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
            <form onSubmit={handleAdd} className="space-y-4 bg-white p-4 rounded-xl shadow-lg">
                <InputField label="New Store Name" value={name} onChange={e => setName(e.target.value)} />
                <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl">{loading ? 'Adding...' : 'Add Store'}</button>
            </form>
            <div>
                <h3 className="text-lg font-bold mt-6 mb-2">Current Stores</h3>
                {Object.entries(stores).map(([id, storeName]) => (
                    <div key={id} className="flex justify-between items-center p-3 bg-white rounded-lg shadow mb-2">
                        <span>{storeName}</span>
                        <button onClick={() => handleDelete(id, storeName)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100"><Trash2 /></button>
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
    
    const stockListRef = doc(db, `artifacts/${appId}/public/config/settings`, "masterStockList");

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
        if (!itemName.trim()) {
            showToast('Item name cannot be empty.', 'error');
            return;
        }
        const newList = JSON.parse(JSON.stringify(masterStockList)); // Deep copy
        newList[category] = [...(newList[category] || []), itemName.trim()];
        await handleSave(newList);
        setItemName('');
    };

    const handleDelete = async (cat, item) => {
        const confirmed = await showConfirm({ title: 'Delete Item', message: `Are you sure you want to delete "${item}" from ${cat}?`, confirmColor: 'red' });
        if (confirmed) {
            const newList = JSON.parse(JSON.stringify(masterStockList)); // Deep copy
            newList[cat] = newList[cat].filter(i => i !== item);
            await handleSave(newList);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold font-display">Stock Item Manager</h2>
            <form onSubmit={handleAdd} className="space-y-4 bg-white p-4 rounded-xl shadow-lg">
                <SelectField label="Category" value={category} onChange={e => setCategory(e.target.value)}>
                    {Object.keys(INITIAL_STOCK_LIST).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </SelectField>
                <InputField label="New Item Name" value={itemName} onChange={e => setItemName(e.target.value)} />
                <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl">{loading ? 'Adding...' : 'Add Item'}</button>
            </form>
             {Object.keys(masterStockList).map(cat => (
                <div key={cat} className="bg-white p-4 rounded-xl shadow-lg mt-4">
                    <h3 className="text-lg font-bold text-orange-700 border-b pb-2 mb-3">{cat}</h3>
                    {masterStockList[cat].map(item => (
                        <div key={item} className="flex justify-between items-center p-2 border-b last:border-0">
                            <span>{item}</span>
                            <button onClick={() => handleDelete(cat, item)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"><Trash2 size={18} /></button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

const NavBar = ({ currentView, setView, role }) => {
    const NavButton = ({ icon, label, targetView }) => (
        <button onClick={() => setView(targetView)} className={`flex flex-col items-center justify-center p-1 w-1/4 h-full ${currentView === targetView ? 'text-orange-600' : 'text-gray-500 hover:text-orange-500'}`}>
            {React.createElement(icon, { className: "w-6 h-6 mb-1" })}
            <span className="text-xs font-medium">{label}</span>
        </button>
    );

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)] flex justify-around h-20 max-w-lg mx-auto rounded-t-2xl border-t">
            <NavButton icon={Home} label="Home" targetView={VIEWS.HOME} />
            <NavButton icon={List} label="Entry" targetView={VIEWS.ENTRY} />
            <NavButton icon={TrendingDown} label="Sold" targetView={VIEWS.SOLD} />
            <NavButton icon={ShoppingCart} label="Order" targetView={VIEWS.ORDER} />
        </nav>
    );
};

// --- Main App Component ---
function App() {
    const [firebaseConfig, setFirebaseConfig] = useState(null);
    const [isConfigNeeded, setIsConfigNeeded] = useState(false);
    
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState({ role: null, storeId: null });
    const [appStatus, setAppStatus] = useState('initializing');
    const [appError, setAppError] = useState(null);

    const [stores, setStores] = useState({});
    const [masterStockList, setMasterStockList] = useState(INITIAL_STOCK_LIST);
    const [currentStock, setCurrentStock] = useState({});
    const [yesterdayStock, setYesterdayStock] = useState({});
    const [orderQuantities, setOrderQuantities] = useState({});
    
    const [view, setView] = useState(VIEWS.HOME);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [isSaving, setIsSaving] = useState(false);
    const [hasSaveError, setHasSaveError] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isFirstUser, setIsFirstUser] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const { role, storeId: assignedStoreId } = userProfile;

    const showToast = useCallback((message, type = 'success') => setToasts(prev => [...prev, { id: Date.now(), message, type }]), []);
    const removeToast = useCallback(id => setToasts(prev => prev.filter(t => t.id !== id)), []);
    const showConfirm = useCallback(options => new Promise(resolve => setConfirmDialog({ ...options, onConfirm: () => { setConfirmDialog(null); resolve(true); }, onCancel: () => { setConfirmDialog(null); resolve(false); } })), []);
    const handleError = (error, context = 'Unknown') => { console.error(`Error in ${context}:`, error); setAppError({ message: error.message, context }); setAppStatus('error'); };

    useEffect(() => {
        // 1. Try to get config from global variable
        let config = null;
        try {
            if (typeof __firebase_config !== 'undefined' && __firebase_config !== '{}') {
                config = JSON.parse(__firebase_config);
            }
        } catch (e) { /* ignore parse error */ }

        // 2. If not found, try localStorage
        if (!config || !config.apiKey) {
            try {
                const storedConfig = localStorage.getItem('firebaseConfig');
                if (storedConfig) {
                    config = JSON.parse(storedConfig);
                }
            } catch (e) { /* ignore parse error */ }
        }

        // 3. If a valid config is found, set it. Otherwise, prompt the user.
        if (config && config.apiKey) {
            setFirebaseConfig(config);
        } else {
            setIsConfigNeeded(true);
        }
    }, []);

    useEffect(() => {
        if (!firebaseConfig) return;

        try {
            const app = initializeApp(firebaseConfig);
            setDb(getFirestore(app));
            setAuth(getAuth(app));
            setIsConfigNeeded(false); // Hide modal if it was open
        } catch (error) {
            handleError(error, 'Firebase Initialization');
        }
    }, [firebaseConfig]);
    
    useEffect(() => {
        if (!auth || !db) return;
        const checkFirstUser = async () => {
             try {
                const usersCollectionRef = collection(db, `artifacts/${appId}/users`);
                const q = query(usersCollectionRef);
                const querySnapshot = await getDocs(q);
                setIsFirstUser(querySnapshot.empty);
            } catch (error) {
                console.warn("Could not check for first user:", error.message);
                setIsFirstUser(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser(authUser);
                setShowAuthModal(false);
            } else {
                setUser(null);
                setUserProfile({ role: null, storeId: null });
                await checkFirstUser();
                setAppStatus('authenticating');
                setShowAuthModal(true);
            }
        });
        return () => unsubscribe();
    }, [auth, db]);

    // This effect handles the initial loading of essential app data (profile, stores, items)
    useEffect(() => {
        if (!db || !user) return;
        
        setAppStatus('loading');
        
        const profileRef = doc(db, `artifacts/${appId}/users/${user.uid}/user_config/profile`);
        const storesRef = collection(db, `artifacts/${appId}/public/data/stores`);
        const stockListRef = doc(db, `artifacts/${appId}/public/config/settings`, "masterStockList");

        const unsubProfile = onSnapshot(profileRef, 
            (snap) => { 
                if(snap.exists()) {
                    setUserProfile(snap.data());
                } else {
                    // This handles a race condition where a user is authenticated but their profile isn't created yet.
                    // We'll give it a moment, but if it's still not there, we'll assume it's an issue and stop loading.
                    setTimeout(() => {
                        getDoc(profileRef).then(s => {
                            if (!s.exists()) {
                                setAppStatus('ready'); // Stop loading, let the UI show an appropriate state
                            }
                        })
                    }, 2000);
                }
            }, 
            err => handleError(err, 'Profile')
        );

        const unsubStores = onSnapshot(storesRef, 
            () => { /* Data is set in the main listener below */ }, 
            err => handleError(err, 'Stores')
        );

        const unsubStockList = onSnapshot(stockListRef, 
            () => { /* Data is set in the main listener below */ }, 
            err => handleError(err, 'Stock List')
        );
        
        // A combined listener to determine when all initial data is ready
        Promise.all([
            getDoc(profileRef),
            getDoc(stockListRef),
            getDocs(query(storesRef))
        ]).then(([profileSnap, stockListSnap, storesSnap]) => {
            if (profileSnap.exists()) setUserProfile(profileSnap.data());
            if (stockListSnap.exists()) setMasterStockList(stockListSnap.data().list);
            const s = {}; storesSnap.forEach(doc => s[doc.id] = doc.data().name); setStores(s);
            setAppStatus('ready');
        }).catch(err => handleError(err, "Initial Data Fetch"));


        return () => { unsubProfile(); unsubStores(); unsubStockList(); };
    }, [db, user]);
    
    const activeStoreId = useMemo(() => {
        if (role === USER_ROLES.ADMIN) return selectedStoreId;
        return assignedStoreId;
    }, [role, selectedStoreId, assignedStoreId]);

    // This effect specifically handles loading data for the *selected* store and date
    useEffect(() => {
        if (!db || !activeStoreId || !role || appStatus !== 'ready') return;

        const todayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${activeStoreId}-${selectedDate}`);
        const yesterdayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${activeStoreId}-${getYesterdayDate(selectedDate)}`);
        
        const unsubToday = onSnapshot(todayDocRef, snap => { setCurrentStock(snap.exists() ? { ...getEmptyStock(masterStockList), ...snap.data().stock } : getEmptyStock(masterStockList)); }, err => handleError(err, `Today's Stock`));
        const unsubYesterday = onSnapshot(yesterdayDocRef, snap => { setYesterdayStock(snap.exists() ? { ...getEmptyStock(masterStockList), ...snap.data().stock } : getEmptyStock(masterStockList)); }, err => handleError(err, `Yesterday's Stock`));
        
        return () => { unsubToday(); unsubYesterday(); };
    }, [db, activeStoreId, selectedDate, masterStockList, role, appStatus]);

    const handleAuthSuccess = async (authUser, username) => {
        if (isFirstUser) {
            const profileRef = doc(db, `artifacts/${appId}/users/${authUser.uid}/user_config/profile`);
            const setupRef = doc(db, `artifacts/${appId}/public/config/settings`, "setup");
            const batch = writeBatch(db);
            batch.set(profileRef, { role: USER_ROLES.ADMIN, storeId: null, username });
            batch.set(setupRef, { setupComplete: true });
            await batch.commit();
            setIsFirstUser(false);
        }
        setShowAuthModal(false);
    };
    
    const saveStock = async () => {
        if (!activeStoreId) return showToast('No store selected.', 'error');
        const confirmed = await showConfirm({ title: 'Confirm Stock Entry', message: `Save stock for ${stores[activeStoreId]} on ${selectedDate}?`});
        if (!confirmed) return;
        setIsSaving(true); setHasSaveError(false);
        const docRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${activeStoreId}-${selectedDate}`);
        try {
            await setDoc(docRef, { storeId: activeStoreId, date: selectedDate, stock: currentStock, userId: user.uid, timestamp: new Date().toISOString() }, { merge: true });
            showToast('Stock saved!', 'success');
        } catch (error) {
            setHasSaveError(true); handleError(error, 'Save Stock'); showToast('Failed to save stock.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const calculateSold = useCallback(key => {
        const yesterday = yesterdayStock[key] || 0;
        const current = currentStock[key] || 0;
        return yesterday - current;
    }, [currentStock, yesterdayStock]);

    const soldStockSummary = useMemo(() => {
        if (!masterStockList || typeof masterStockList !== 'object') return '0.00';
        let totalSold = 0;
        for (const category in masterStockList) {
            for (const item of masterStockList[category]) {
                const key = `${category}-${item}`;
                const sold = calculateSold(key);
                if (sold > 0) {
                    totalSold += sold;
                }
            }
        }
        return totalSold.toFixed(2);
    }, [calculateSold, masterStockList]);


    const renderView = () => {
        if (!role) return <LoadingSpinner message="Waiting for user profile..." />;
        if (!activeStoreId) {
             if (role === USER_ROLES.ADMIN && Object.keys(stores).length === 0) {
                 return <div className="p-4 text-center"><button onClick={() => setView(VIEWS.ADMIN_FUNCTIONS)} className="text-orange-600 font-bold">No stores found. Go to Admin to create one.</button></div>;
             }
             return (
                <div className="p-4 space-y-4">
                    <h2 className="text-2xl font-bold text-center font-display">Select a Store</h2>
                    {Object.entries(stores).map(([id, name]) => {
                        if (role === USER_ROLES.STAFF && id !== assignedStoreId) return null;
                        return <button key={id} onClick={() => setSelectedStoreId(id)} className="w-full text-left bg-white rounded-xl p-4 shadow-lg border-l-4 border-orange-600 hover:bg-orange-50 transition"><p className="font-display text-lg font-bold text-gray-900">{name}</p></button>;
                    })}
                </div>
            );
        }
        
        switch (view) {
            case VIEWS.ENTRY: return <StockEntryView storeName={stores[activeStoreId]} stockData={currentStock} setStockData={setCurrentStock} saveStock={saveStock} isSaving={isSaving} selectedDate={selectedDate} setSelectedDate={setSelectedDate} masterStockList={masterStockList} hasSaveError={hasSaveError} />;
            case VIEWS.SOLD: return <StockSoldView currentStock={currentStock} yesterdayStock={yesterdayStock} calculateSold={calculateSold} soldStockSummary={soldStockSummary} masterStockList={masterStockList} />;
            case VIEWS.ORDER: return <OrderingView currentStock={currentStock} orderQuantities={orderQuantities} setOrderQuantities={setOrderQuantities} stores={stores} selectedStoreId={activeStoreId} showToast={showToast} masterStockList={masterStockList}/>;
            case VIEWS.ADMIN_FUNCTIONS: return (
                    <div className="p-4 grid grid-cols-2 gap-4">
                        <button onClick={() => setView(VIEWS.USER_MANAGER)} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg text-center font-bold hover:bg-gray-50"><Users className="mb-2 text-orange-600"/>Users</button>
                        <button onClick={() => setView(VIEWS.STORE_MANAGER)} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg text-center font-bold hover:bg-gray-50"><Store className="mb-2 text-orange-600"/>Stores</button>
                        <button onClick={() => setView(VIEWS.ITEM_MANAGER)} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg text-center font-bold hover:bg-gray-50"><Package className="mb-2 text-orange-600"/>Items</button>
                    </div>
                );
            case VIEWS.USER_MANAGER: return <AdminUserManagementView db={db} appId={appId} stores={stores} auth={auth} showToast={showToast} />;
            case VIEWS.STORE_MANAGER: return <StoreManagementView db={db} appId={appId} stores={stores} showToast={showToast} showConfirm={showConfirm} />;
            case VIEWS.ITEM_MANAGER: return <StockItemManagementView db={db} appId={appId} masterStockList={masterStockList} showToast={showToast} showConfirm={showConfirm} />;
            default: return null; // Home is handled by store selection
        }
    };
    
    if (isConfigNeeded) return <FirebaseConfigModal onConfigSaved={setFirebaseConfig} />;
    if (appStatus === 'initializing' || appStatus === 'authenticating' || (user && appStatus !== 'ready' && appStatus !== 'error')) return <LoadingSpinner message={appStatus === 'loading' ? 'Loading Data...' : 'Initializing App...'} />;
    if (appStatus === 'error') return <div className="p-4 text-center text-red-500">Error: {appError.message}</div>;
    
    const showBackButton = view !== VIEWS.HOME && !!activeStoreId;
    const handleBack = () => {
        if ([VIEWS.USER_MANAGER, VIEWS.STORE_MANAGER, VIEWS.ITEM_MANAGER].includes(view)) {
            setView(VIEWS.ADMIN_FUNCTIONS);
        } else if (view === VIEWS.ADMIN_FUNCTIONS) {
            setView(VIEWS.HOME);
            setSelectedStoreId('');
        }
        else {
            setView(VIEWS.HOME);
            setSelectedStoreId('');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
            <div className="max-w-lg mx-auto bg-gray-50 min-h-screen flex flex-col">
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Poppins:wght@700;800&display=swap'); body { font-family: 'Inter', sans-serif; } .font-display { font-family: 'Poppins', sans-serif; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; } @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-slideInRight { animation: slideInRight 0.3s ease-out forwards; }`}</style>
                
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                {confirmDialog && <ConfirmModal {...confirmDialog} />}
                {showAuthModal && <AuthModal auth={auth} onLoginSuccess={handleAuthSuccess} onClose={() => !isFirstUser && setShowAuthModal(false)} isFirstUser={isFirstUser} />}

                {user && (
                    <>
                        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
                            <div className="flex items-center gap-2">
                               {showBackButton && <button onClick={handleBack} className="p-2 -ml-2 text-gray-600 hover:text-orange-600"><ArrowLeft /></button>}
                               <h1 className="text-xl font-bold font-display text-gray-900 tracking-wider">
                                    {activeStoreId ? stores[activeStoreId] : 'SUJATA MASTANI'}
                               </h1>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${role === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {role ? role.toUpperCase() : '...'}
                                </span>
                                <button onClick={() => showConfirm({ title: 'Logout', message: 'Are you sure you want to log out?', onConfirm: () => signOut(auth)})} className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition"><LogOut className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="flex-grow pt-2 pb-24">
                            {renderView()}
                        </main>
                        {activeStoreId && <NavBar currentView={view} setView={setView} role={role} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default App;

