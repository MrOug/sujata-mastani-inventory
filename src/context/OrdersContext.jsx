import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, deleteDoc, setDoc, addDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { useAuth } from './AuthContext';

const OrdersContext = createContext(null);

export const useOrders = () => {
    const context = useContext(OrdersContext);
    if (!context) {
        throw new Error('useOrders must be used within an OrdersProvider');
    }
    return context;
};

const CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC'];

const DEFAULT_MASTER_STOCK_LIST = {
    MILKSHAKE: [
        'Mango', 'Pista', 'Pineapple', 'Rose', 'Orange', 'Vanilla', 'Kesar',
        'Chocolate', 'Strawberry', 'Butter Scotch', 'Kesar Mango',
        'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Pink Peru'
    ],
    'ICE CREAM': [
        'Mango', 'Pista', 'Pineapple', 'Rose', 'Vanilla', 'Orange',
        'Keshar Pista', 'Chocolate', 'Strawberry', 'Butter Scotch',
        'Dry Anjir', 'Coffee Chips', 'Chocolate Fudge Badam',
        'Chocolate Choco Chips', 'Royal Treat', 'Kaju Draksha', 'Lichi',
        'Jardalu', 'V.O.P.', 'Gulkand Badam', 'Fresh Mango Bites',
        'Tender Coconut', 'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Pink Peru'
    ],
    TOPPINGS: [
        'Dry Fruit Pack', 'Pista Pack', 'Badam Pack', 'Pista Powder', 'Cherry Tin'
    ],
    'ICE CREAM DABBE': [
        'Glass Box Big', 'Glass Box Small', 'Icecream cup',
        'Big Glass Lid Box', 'Small Glass Lid Box', 'Icecream cup lid Box',
        'Cone Box', 'Paper Straw', 'Paper napkin', '500 ml Container',
        'Ice Cream Empty Dabe'
    ],
    MISC: []
};

export const OrdersProvider = ({ children }) => {
    const { userId, isAuthReady } = useAuth();

    const [orders, setOrders] = useState([]);
    const [stores, setStores] = useState({});
    const [masterStockList, setMasterStockList] = useState(DEFAULT_MASTER_STOCK_LIST);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const storesRef = useRef({});

    useEffect(() => {
        storesRef.current = stores;
    }, [stores]);

    // Fetch stores
    useEffect(() => {
        if (!isAuthReady || !userId) {
            setLoading(false);
            return;
        }

        try {
            const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);
            const unsubscribe = onSnapshot(storesColRef, (snapshot) => {
                const newStores = {};
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    newStores[docSnap.id] = {
                        name: data.name,
                        firmName: data.firmName || data.name,
                        areaCode: data.areaCode || '',
                    };
                });
                setStores(newStores);
                storesRef.current = newStores;
            }, (err) => {
                console.error('Error fetching stores:', err);
                setError(err.message);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up stores listener:', err);
            setError(err.message);
        }
    }, [isAuthReady, userId]);

    // Fetch master stock list
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        try {
            const listDocRef = doc(db, `artifacts/${appId}/public`, 'master_stock_list');
            const unsubscribe = onSnapshot(listDocRef, (docSnap) => {
                if (docSnap.exists() && docSnap.data().list) {
                    setMasterStockList(docSnap.data().list);
                }
            }, (err) => {
                console.error('Error fetching master stock list:', err);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up master list listener:', err);
        }
    }, [isAuthReady, userId]);

    // Fetch orders for selected date
    useEffect(() => {
        if (!isAuthReady || !userId || !selectedDate) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);

            const unsubscribe = onSnapshot(ordersColRef, (snapshot) => {
                const allOrders = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    const orderDate = data.deliveryDate || (data.orderDate ? data.orderDate.slice(0, 10) : null);
                    if (orderDate === selectedDate) {
                        allOrders.push({
                            id: docSnap.id,
                            ...data
                        });
                    }
                });

                allOrders.sort((a, b) => {
                    const currentStores = storesRef.current;
                    const nameA = currentStores[a.storeId]?.name || a.storeName || '';
                    const nameB = currentStores[b.storeId]?.name || b.storeName || '';
                    return nameA.localeCompare(nameB);
                });

                setOrders(allOrders);
                setLoading(false);
            }, (err) => {
                console.error('Error fetching orders:', err);
                setError(err.message);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up orders listener:', err);
            setError(err.message);
            setLoading(false);
        }
    }, [isAuthReady, userId, selectedDate]);

    // Calculate aggregated totals
    const aggregatedTotals = useMemo(() => {
        const totals = {};

        CATEGORY_ORDER.forEach(category => {
            totals[category] = { items: {}, total: 0 };
        });

        orders.forEach(order => {
            if (order.orderQuantities) {
                Object.entries(order.orderQuantities).forEach(([key, qty]) => {
                    if (qty > 0) {
                        const [category, ...itemParts] = key.split('-');
                        const item = itemParts.join('-');

                        if (totals[category]) {
                            if (!totals[category].items[item]) {
                                totals[category].items[item] = 0;
                            }
                            totals[category].items[item] += qty;
                            totals[category].total += qty;
                        }
                    }
                });
            }
        });

        return totals;
    }, [orders]);

    // Category summary for dashboard
    const categorySummary = useMemo(() => {
        return {
            MILKSHAKE: aggregatedTotals['MILKSHAKE']?.total || 0,
            'ICE CREAM': aggregatedTotals['ICE CREAM']?.total || 0,
            TOPPINGS: aggregatedTotals['TOPPINGS']?.total || 0,
            'ICE CREAM DABBE': aggregatedTotals['ICE CREAM DABBE']?.total || 0,
        };
    }, [aggregatedTotals]);

    // Delete an order
    const deleteOrder = useCallback(async (orderId) => {
        const orderDocRef = doc(db, `artifacts/${appId}/public/data/orders`, orderId);
        await deleteDoc(orderDocRef);
        return true;
    }, []);

    // Add a new order
    const addOrder = useCallback(async (orderData) => {
        const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
        const docRef = await addDoc(ordersColRef, orderData);
        return docRef.id;
    }, []);

    const value = useMemo(() => ({
        orders,
        stores,
        masterStockList,
        selectedDate,
        setSelectedDate,
        loading,
        error,
        aggregatedTotals,
        categorySummary,
        deleteOrder,
        addOrder,
        CATEGORY_ORDER,
        outletCount: Object.keys(stores).length,
    }), [orders, stores, masterStockList, selectedDate, loading, error, aggregatedTotals, categorySummary, deleteOrder, addOrder]);

    return (
        <OrdersContext.Provider value={value}>
            {children}
        </OrdersContext.Provider>
    );
};

export default OrdersContext;
