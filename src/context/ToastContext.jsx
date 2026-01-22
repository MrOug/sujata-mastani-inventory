import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);

    // Show toast notification
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    // Remove toast
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // Show confirmation dialog
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

    // Close confirmation dialog
    const closeConfirm = useCallback(() => {
        setConfirmDialog(null);
    }, []);

    const value = {
        toasts,
        showToast,
        removeToast,
        confirmDialog,
        showConfirm,
        closeConfirm
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
};

export default ToastContext;
