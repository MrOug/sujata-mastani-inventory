import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

// Import services
import { db, appId, auth } from './services/firebase';

// Import contexts
import { useAuth } from './context/AuthContext';
import { useStore } from './context/StoreContext';
import { useToast } from './context/ToastContext';

// Import components
import {
    // Common
    ToastContainer,
    ConfirmModal,
    LoadingSpinner,
    // Auth
    LoginScreen,
    RegisterScreen,
    // Layout
    Header,
    NavBar,
    HomeView,
    // Stock
    StockEntryView,
    StockSoldView,
    VerifyStockView,
    // Orders
    OrderingView,
    OrderHistoryView,
    OrderStatsView,
    // Admin
    StoreManagementView,
    AdminUserManagementView,
    ItemManagerView
} from './components';

// --- Global Constants ---
const CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC'];

// --- Main Application ---
function App() {
    // Auth state from context
    const {
        user,
        userId,
        role,
        userStoreId,
        isAuthReady,
        isFirstUser,
        loading: authLoading,
        logout
    } = useAuth();

    // Store state from context
    const {
        stores,
        storesLoaded,
        selectedStoreId,
        setSelectedStoreId,
        currentStock,
        setCurrentStock,
        yesterdayStock,
        yesterdayOrderedStock,
        orderQuantities,
        setOrderQuantities,
        selectedDate,
        setSelectedDate,
        loadingData,
        masterStockList,
        setMasterStockList,
        miscStatus,
        setMiscStatus,
        selectedMiscItems,
        setSelectedMiscItems,
        getEmptyStock,
        calculateSold,
        soldStockSummary,
        fetchStockData
    } = useStore();

    // Toast state from context
    const { toasts, showToast, removeToast, confirmDialog, showConfirm, closeConfirm } = useToast();

    // Local state
    const [view, setView] = useState('home');
    const [isSaving, setIsSaving] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showLogin, setShowLogin] = useState(true);

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Redirect staff to stock view only (they can't access other views)
    useEffect(() => {
        if (isAuthReady && role === 'staff') {
            setView('stock');
        }
    }, [isAuthReady, role]);

    // Save stock data
    const saveStock = useCallback(async () => {
        if (!selectedStoreId || !selectedDate) {
            showToast('Please select a store first', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const stockDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${selectedStoreId}-${selectedDate}`);
            await setDoc(stockDocRef, {
                storeId: selectedStoreId,
                date: selectedDate,
                stock: currentStock,
                miscStatus: miscStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: userId
            });

            showToast('Stock saved successfully!', 'success');
            await fetchStockData(selectedStoreId);
        } catch (error) {
            console.error('Error saving stock:', error);
            showToast(`Failed to save stock: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    }, [selectedStoreId, selectedDate, currentStock, miscStatus, userId, showToast, fetchStockData]);

    // Generate order output text - hardcoded template matching exact business format
    const generateOrderOutput = useCallback(() => {
        // Auto-fill tomorrow's date (delivery date) in DD/MM/YYYY format
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = `${String(tomorrow.getDate()).padStart(2, '0')}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${tomorrow.getFullYear()}`;

        // Helper: get quantity for a key, return empty string if 0
        const q = (category, item) => {
            const qty = orderQuantities[`${category}-${item}`] || 0;
            return qty > 0 ? ` ${qty}` : '';
        };

        const output = `Firm/Shop Name: Venkateshwara Hospitality 
Area: Kumar Parisar 
Date : ${dateStr}


 MILKSHAKE 
Mango fm-${q('MILKSHAKE','Mango')} 
Pista fm-${q('MILKSHAKE','Pista')}
Pineapple fm-${q('MILKSHAKE','Pineapple')} 
Rose fm-${q('MILKSHAKE','Rose')}
Orange fm-${q('MILKSHAKE','Orange')} 
Vanilla fm -${q('MILKSHAKE','Vanilla')}
Kesar fm-${q('MILKSHAKE','Kesar')}
Chocolate fm -${q('MILKSHAKE','Chocolate')} 
Strawberry fm -${q('MILKSHAKE','Strawberry')}
Butter Scotch fm -${q('MILKSHAKE','Butter Scotch')}
Kesar Mango fm -${q('MILKSHAKE','Kesar Mango')} 
Fresh Sitaphal fm -${q('MILKSHAKE','Fresh Sitaphal')}
Fresh Strawberry fm -${q('MILKSHAKE','Fresh Strawberry')}
Fresh Pink Peru fm-${q('MILKSHAKE','Fresh Pink Peru')} 


 ICE CREAM
Mango -${q('ICE CREAM','Mango')} 
Pista -${q('ICE CREAM','Pista')}  
Pineapple -${q('ICE CREAM','Pineapple')}
Rose -${q('ICE CREAM','Rose')}
Vanilla -${q('ICE CREAM','Vanilla')}
Orange-${q('ICE CREAM','Orange')}
Keshar Pista -${q('ICE CREAM','Keshar Pista')} 
Chocolate -${q('ICE CREAM','Chocolate')} 
Strawberry -${q('ICE CREAM','Strawberry')} 
Butter Scotch -${q('ICE CREAM','Butter Scotch')}
Dry Anjir -${q('ICE CREAM','Dry Anjir')}
Coffee Chips -${q('ICE CREAM','Coffee Chips')}
Chocolate Fudge Badam -${q('ICE CREAM','Chocolate Fudge Badam')} 
Chocolate Choco Chips -${q('ICE CREAM','Chocolate Choco Chips')} 
Royal Treat -${q('ICE CREAM','Royal Treat')}
Kaju Draksha -${q('ICE CREAM','Kaju Draksha')} 
Lichi -${q('ICE CREAM','Lichi')}
Jardalu -${q('ICE CREAM','Jardalu')} 
V.O.P. -${q('ICE CREAM','V.O.P.')}
Gulkand Badam -${q('ICE CREAM','Gulkand Badam')} 
Fresh Mango Bites -${q('ICE CREAM','Fresh Mango Bites')}
Tender Coconut -${q('ICE CREAM','Tender Coconut')}
Fresh Sitaphal -${q('ICE CREAM','Fresh Sitaphal')}
Fresh Strawberry -${q('ICE CREAM','Fresh Strawberry')}
Fresh Pink Peru -${q('ICE CREAM','Fresh Pink Peru')}


 TOPPINGS 
Dry Fruit Pack-${q('TOPPINGS','Dry Fruit Pack')} 
Pista Pack -${q('TOPPINGS','Pista Pack')} 
Badam Pack -${q('TOPPINGS','Badam Pack')} 
Pista Powder -${q('TOPPINGS','Pista Powder')} 
Cherry Tin-${q('TOPPINGS','Cherry Tin')}


PACKAGING MATERIAL
Glass Box Big -${q('ICE CREAM DABBE','Glass Box Big')}
Glass Box Small-${q('ICE CREAM DABBE','Glass Box Small')}
Icecream cup -${q('ICE CREAM DABBE','Icecream cup')}
Big Glass Lid Box -${q('ICE CREAM DABBE','Big Glass Lid Box')}
Small Glass Lid Box -${q('ICE CREAM DABBE','Small Glass Lid Box')}
Icecream cup lid Box-${q('ICE CREAM DABBE','Icecream cup lid Box')}
Cone Box -${q('ICE CREAM DABBE','Cone Box')}
Paper Straw -${q('ICE CREAM DABBE','Paper Straw')}
Paper napkin -${q('ICE CREAM DABBE','Paper napkin')}
500 ml Container -${q('ICE CREAM DABBE','500 ml Container')}

Ice Cream Empty Dabe -${q('ICE CREAM DABBE','Ice Cream Empty Dabe')}`;

        return output;
    }, [orderQuantities]);

    // Export stock data
    const exportStockData = useCallback(async () => {
        try {
            const stockColRef = collection(db, `artifacts/${appId}/public/data/stock_entries`);
            const snapshot = await getDocs(stockColRef);

            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock-data-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Stock data exported!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export data', 'error');
        }
    }, [showToast]);

    // Handle logout
    const handleLogout = useCallback(async () => {
        const confirmed = await showConfirm({
            title: 'Logout',
            message: 'Are you sure you want to logout?',
            confirmText: 'Logout',
            cancelText: 'Cancel'
        });

        if (confirmed) {
            await logout();
            setView('home');
        }
    }, [logout, showConfirm]);

    // --- Render Logic ---

    // Loading state
    if (authLoading || !isAuthReady) {
        return <LoadingSpinner message="Initializing..." />;
    }

    // Not logged in - show login/register
    if (!user) {
        if (isFirstUser) {
            return <RegisterScreen onSwitchToLogin={() => setShowLogin(true)} />;
        }
        return showLogin
            ? <LoginScreen onSwitchToRegister={() => setShowLogin(false)} />
            : <RegisterScreen onSwitchToLogin={() => setShowLogin(true)} />;
    }

    // Loading stores
    if (!storesLoaded) {
        return <LoadingSpinner message="Loading stores..." />;
    }

    // Render view content
    const renderViewContent = () => {
        switch (view) {
            case 'home':
                return (
                    <HomeView
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        setView={setView}
                        soldStockSummary={soldStockSummary}
                    />
                );

            case 'stock':
                return (
                    <StockEntryView
                        storeId={selectedStoreId}
                        stockData={currentStock}
                        setStockData={setCurrentStock}
                        saveStock={saveStock}
                        isSaving={isSaving}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        showToast={showToast}
                        masterStockList={masterStockList}
                        miscStatus={miscStatus}
                        setMiscStatus={setMiscStatus}
                        CATEGORY_ORDER={CATEGORY_ORDER}
                    />
                );

            case 'sold':
                return (
                    <StockSoldView
                        currentStock={currentStock}
                        yesterdayOrderedStock={yesterdayOrderedStock}
                        calculateSold={calculateSold}
                        soldStockSummary={soldStockSummary}
                        masterStockList={masterStockList}
                        CATEGORY_ORDER={CATEGORY_ORDER}
                    />
                );

            case 'order':
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
                        miscStatus={miscStatus}
                        selectedMiscItems={selectedMiscItems}
                        setSelectedMiscItems={setSelectedMiscItems}
                        CATEGORY_ORDER={CATEGORY_ORDER}
                    />
                );

            case 'order-history':
                return (
                    <OrderHistoryView
                        db={db}
                        appId={appId}
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        showToast={showToast}
                    />
                );

            case 'order-stats':
                return (
                    <OrderStatsView
                        db={db}
                        appId={appId}
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        showToast={showToast}
                        masterStockList={masterStockList}
                        CATEGORY_ORDER={CATEGORY_ORDER}
                    />
                );

            case 'stores':
                return (
                    <StoreManagementView
                        db={db}
                        appId={appId}
                        stores={stores}
                        showToast={showToast}
                        showConfirm={showConfirm}
                    />
                );

            case 'users':
                return (
                    <AdminUserManagementView
                        db={db}
                        appId={appId}
                        stores={stores}
                        auth={auth}
                        exportStockData={exportStockData}
                        showToast={showToast}
                        showConfirm={showConfirm}
                    />
                );

            case 'verify':
                return (
                    <VerifyStockView
                        db={db}
                        appId={appId}
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        showToast={showToast}
                        masterStockList={masterStockList}
                        CATEGORY_ORDER={CATEGORY_ORDER}
                    />
                );

            case 'items':
                return (
                    <ItemManagerView
                        db={db}
                        appId={appId}
                        masterStockList={masterStockList}
                        setMasterStockList={setMasterStockList}
                        showToast={showToast}
                        CATEGORY_ORDER={CATEGORY_ORDER}
                    />
                );

            default:
                return (
                    <HomeView
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        setView={setView}
                        soldStockSummary={soldStockSummary}
                    />
                );
        }
    };

    // Get username for header
    const username = user?.email?.split('@')[0] || 'User';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Confirmation Dialog */}
            {confirmDialog && (
                <ConfirmModal
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText={confirmDialog.confirmText}
                    cancelText={confirmDialog.cancelText}
                    confirmColor={confirmDialog.confirmColor}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={confirmDialog.onCancel}
                />
            )}

            {/* Main Content */}
            <main className="max-w-lg mx-auto w-full bg-white min-h-screen shadow-2xl relative">
                {/* Header inside the max-w container for alignment */}
                <div className="sticky top-0 z-40">
                    <Header
                        selectedStoreId={selectedStoreId}
                        stores={stores}
                        onStoreChange={setSelectedStoreId}
                        role={role}
                        username={username}
                        isOnline={isOnline}
                    />
                </div>

                <div className="p-4 pb-24">
                    {/* Loading overlay - doesn't unmount content for admin views */}
                    {loadingData && !['items', 'users', 'stores', 'order-stats', 'order-history'].includes(view) && (
                        <div className="flex items-center justify-center py-12">
                            <LoadingSpinner message="Loading data..." />
                        </div>
                    )}
                    {/* Always render content, but hide if loading (except admin views) */}
                    <div style={{
                        display: (loadingData && !['items', 'users', 'stores', 'order-stats', 'order-history'].includes(view))
                            ? 'none'
                            : 'block'
                    }}>
                        {renderViewContent()}
                    </div>
                </div>

                {/* Bottom Navigation */}
                <NavBar
                    view={view}
                    setView={setView}
                    role={role}
                    onLogout={handleLogout}
                />
            </main>

            {/* CSS for animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-slideUp { animation: slideUp 0.3s ease-out; }
                .animate-slideIn { animation: slideIn 0.3s ease-out; }
                .font-display { font-family: 'Outfit', system-ui, sans-serif; }
                .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
            `}</style>
        </div>
    );
}

export default App;
