import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { useOrders } from './context/OrdersContext';

import {
    ToastContainer,
    ConfirmModal,
    LoadingSpinner,
    LoginScreen,
    RegisterScreen,
    Header,
    NavBar,
    DashboardView,
    SummaryView,
    DispatchView,
    ReportsView,
    SettingsView
} from './components';

import {
    generateSummaryReport,
    generateShopwiseReport,
    downloadTextAsFile
} from './utils/pdf-generator';

const VIEW_TITLES = {
    dashboard: 'Dashboard',
    summary: 'Summary',
    dispatch: 'Dispatch',
    reports: 'Reports',
    settings: 'Settings'
};

function App() {
    const { user, isAuthReady, isFirstUser, loading: authLoading } = useAuth();
    const { toasts, removeToast, confirmDialog, showToast } = useToast();
    const {
        orders,
        stores,
        selectedDate,
        setSelectedDate,
        aggregatedTotals,
        categorySummary,
        outletCount,
        CATEGORY_ORDER,
        masterStockList
    } = useOrders();

    const [view, setView] = useState('dashboard');
    const [showLogin, setShowLogin] = useState(true);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isExporting, setIsExporting] = useState(false);

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

    const handleExportSummary = useCallback(async () => {
        setIsExporting(true);
        try {
            const content = generateSummaryReport({
                categorySummary,
                aggregatedTotals,
                selectedDate,
                outletCount,
                CATEGORY_ORDER,
                masterStockList
            });

            const filename = `Sujata_Stock_Report_${selectedDate.replace(/-/g, '')}.txt`;
            downloadTextAsFile(content, filename);
            showToast('Summary report downloaded!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export report', 'error');
        } finally {
            setIsExporting(false);
        }
    }, [categorySummary, aggregatedTotals, selectedDate, outletCount, CATEGORY_ORDER, masterStockList, showToast]);

    const handleExportShopwise = useCallback(async () => {
        setIsExporting(true);
        try {
            const content = generateShopwiseReport({
                orders,
                stores,
                selectedDate,
                CATEGORY_ORDER
            });

            const filename = `Sujata_Challans_${selectedDate.replace(/-/g, '')}.txt`;
            downloadTextAsFile(content, filename);
            showToast('Shop-wise challans downloaded!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export challans', 'error');
        } finally {
            setIsExporting(false);
        }
    }, [orders, stores, selectedDate, CATEGORY_ORDER, showToast]);

    if (authLoading || !isAuthReady) {
        return <LoadingSpinner message="Initializing..." />;
    }

    if (!user) {
        if (isFirstUser) {
            return <RegisterScreen onSwitchToLogin={() => setShowLogin(true)} />;
        }
        return showLogin
            ? <LoginScreen onSwitchToRegister={() => setShowLogin(false)} />
            : <RegisterScreen onSwitchToLogin={() => setShowLogin(true)} />;
    }

    const renderViewContent = () => {
        switch (view) {
            case 'dashboard':
                return (
                    <DashboardView
                        onExport={handleExportSummary}
                        isExporting={isExporting}
                    />
                );

            case 'summary':
                return <SummaryView />;

            case 'dispatch':
                return <DispatchView />;

            case 'reports':
                return (
                    <ReportsView
                        onExportSummary={handleExportSummary}
                        onExportShopwise={handleExportShopwise}
                        isExporting={isExporting}
                    />
                );

            case 'settings':
                return <SettingsView />;

            default:
                return <DashboardView onExport={handleExportSummary} isExporting={isExporting} />;
        }
    };

    // Show date picker for these views
    const showDatePicker = ['dashboard', 'summary', 'dispatch', 'reports'].includes(view);

    return (
        <div className="min-h-screen bg-gray-50">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

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

            <main className="max-w-lg mx-auto w-full bg-white min-h-screen shadow-2xl relative pb-20">
                {/* Header */}
                <div className="sticky top-0 z-40">
                    <Header title={VIEW_TITLES[view]} />

                    {/* Date Picker - shown for data views */}
                    {showDatePicker && (
                        <div className="bg-white border-b border-gray-100 px-4 py-2">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                    {renderViewContent()}
                </div>

                {/* Bottom Navigation */}
                <NavBar view={view} setView={setView} />
            </main>
        </div>
    );
}

export default App;
