import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider, ToastProvider, OrdersProvider } from './context';
import ErrorBoundary from './utils/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AuthProvider>
                <ToastProvider>
                    <OrdersProvider>
                        <App />
                    </OrdersProvider>
                </ToastProvider>
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>
);
