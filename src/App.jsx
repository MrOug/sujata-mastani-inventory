import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

// Import services
import { db, appId, auth } from './services/firebase';
import { getTodayDate, getDeliveryDate } from './utils/date-utils';

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
        activeItems,
        toggleItemActive,
        isItemActive,
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

    // Generate order output text
    const generateOrderOutput = useCallback(() => {
        const storeFirmName = stores[selectedStoreId]?.firmName || stores[selectedStoreId]?.name || 'Store';
        const areaCode = stores[selectedStoreId]?.areaCode || '';

        // Get delivery date - business day ends at 6 AM
        const deliveryDate = getDeliveryDate();

        const dateStr = deliveryDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Header - exact format
        let output = `Firm/Shop Name: ${storeFirmName} \n`;
        output += `Area: ${areaCode}\n`;
        output += `Date : ${dateStr}\n`;

        // --- MILKSHAKE ---
        output += `\n\n *MILKSHAKE* \n`;
        const milkshakeItems = masterStockList['MILKSHAKE'] || [];
        milkshakeItems.forEach(item => {
            const key = `MILKSHAKE-${item}`;
            const qty = orderQuantities[key] || 0;
            if (qty > 0) {
                output += `${item} fm- ${qty}\n`;
            } else {
                output += `${item} fm-\n`;
            }
        });

        // --- ICE CREAM ---
        output += `\n\n *ICE CREAM*\n`;
        const iceCreamItems = masterStockList['ICE CREAM'] || [];
        iceCreamItems.forEach(item => {
            const key = `ICE CREAM-${item}`;
            const qty = orderQuantities[key] || 0;
            if (qty > 0) {
                output += `${item} - ${qty}\n`;
            } else {
                output += `${item} -\n`;
            }
        });

        // --- TOPPINGS ---
        output += `\n\n *TOPPINGS* \n`;
        const toppingsItems = masterStockList['TOPPINGS'] || [];
        toppingsItems.forEach(item => {
            const key = `TOPPINGS-${item}`;
            const qty = orderQuantities[key] || 0;
            if (qty > 0) {
                output += `${item}- ${qty}\n`;
            } else {
                output += `${item}-\n`;
            }
        });

        // --- PACKAGING MATERIAL ---
        // Note: WhatsApp renders *text* as bold which adds visual spacing,
        // so we put items directly after the header newline
        output += `\n\n*PACKAGING MATERIAL*\n`;
        const miscItems = masterStockList['MISC'] || [];
        miscItems.forEach(item => {
            const key = `MISC-${item}`;
            const qty = orderQuantities[key] || 0;
            if (qty > 0) {
                output += `${item} - ${qty}\n`;
            } else {
                output += `${item} -\n`;
            }
        });

        // --- Ice Cream Empty Dabe (at the end, after a blank line) ---
        const dabbeItems = masterStockList['ICE CREAM DABBE'] || [];
        if (dabbeItems.length > 0) {
            dabbeItems.forEach(item => {
                const key = `ICE CREAM DABBE-${item}`;
                const qty = orderQuantities[key] || 0;
                if (qty > 0) {
                    output += `\n${item} - ${qty}`;
                } else {
                    output += `\n${item} -`;
                }
            });
        }

        return output;
    }, [stores, selectedStoreId, masterStockList, orderQuantities, selectedMiscItems]);

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
            a.download = `stock-data-${getTodayDate()}.json`;
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
                        isItemActive={isItemActive}
                        toggleItemActive={toggleItemActive}
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
