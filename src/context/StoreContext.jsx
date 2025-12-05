import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, setDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { useAuth } from './AuthContext';

const StoreContext = createContext(null);

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};

// Utility functions
const getTodayDate = () => new Date().toISOString().slice(0, 10);
const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
};

export const StoreProvider = ({ children }) => {
    const { userId, role, userStoreId, isAuthReady } = useAuth();

    // Store state
    const [stores, setStores] = useState({});
    const [storesLoaded, setStoresLoaded] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState('');

    // Stock state
    const [currentStock, setCurrentStock] = useState({});
    const [yesterdayStock, setYesterdayStock] = useState({});
    const [yesterdayOrderedStock, setYesterdayOrderedStock] = useState({});
    const [orderQuantities, setOrderQuantities] = useState({});
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [loadingData, setLoadingData] = useState(false);

    // Master stock list
    const [masterStockList, setMasterStockList] = useState({
        MILKSHAKE: ['Mango', 'Rose', 'Pineapple', 'Khus', 'Vanilla', 'Kesar', 'Chocolate', 'Butterscotch', 'Kesar mango', 'Strawberry', 'Fresh Sitaphal (Seasonal)', 'Fresh Strawberry (Seasonal)'],
        'ICE CREAM': ['Mango', 'Pista', 'Pineapple', 'Vanilla', 'Rose', 'Orange', 'Keshar Pista', 'Chocolate', 'Strawberry', 'Butterscotch', 'Dry Anjir', 'Coffee Chips', 'Chocolate Fudge Badam', 'Chocolate Choco Chips', 'Kaju Draksha', 'Gulkand Badam', 'Jagdalu', 'VOP', 'Peru', 'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Mango Bites'],
        TOPPINGS: ['Dry Fruit', 'Pista', 'Badam', 'Pista Powder', 'Cherry'],
        'ICE CREAM DABBE': ['Ice Cream Dabee'],
        MISC: ['Ice Cream Spoons', 'Paper Straw', 'Ice Creap Cup', 'Ice Cream Container']
    });

    // MISC status tracking
    const [miscStatus, setMiscStatus] = useState({});
    const [selectedMiscItems, setSelectedMiscItems] = useState({});

    // Category order
    const CATEGORY_ORDER = ['MILKSHAKE', 'ICE CREAM', 'TOPPINGS', 'ICE CREAM DABBE', 'MISC'];

    // Get empty stock template
    const getEmptyStock = useCallback(() => {
        const stock = {};
        CATEGORY_ORDER.forEach(category => {
            if (masterStockList[category]) {
                masterStockList[category].forEach(item => {
                    const key = `${category}-${item}`;
                    stock[key] = 0;
                });
            }
        });
        return stock;
    }, [masterStockList]);

    // Get empty MISC status
    const getEmptyMiscStatus = useCallback(() => {
        const status = {};
        if (masterStockList.MISC) {
            masterStockList.MISC.forEach(item => {
                status[`MISC-${item}`] = 'available';
            });
        }
        return status;
    }, [masterStockList]);

    // Calculate sold stock - FIXED: Uses yesterday's ORDERED stock
    const calculateSold = useCallback((category, item) => {
        const key = `${category}-${item}`;
        const orderedQty = yesterdayOrderedStock[key] || 0;
        const currentQty = currentStock[key] || 0;
        // Sold = What was ordered yesterday (received today) - What's left today
        return orderedQty - currentQty;
    }, [currentStock, yesterdayOrderedStock]);

    // Calculate total sold summary
    const soldStockSummary = useMemo(() => {
        let totalSold = 0;
        Object.keys(currentStock).forEach(key => {
            const [category, ...itemParts] = key.split('-');
            const item = itemParts.join('-');
            if (category && item) {
                const sold = calculateSold(category, item);
                if (sold > 0) totalSold += sold;
            }
        });
        return totalSold;
    }, [currentStock, calculateSold]);

    // Fetch stores
    useEffect(() => {
        if (!db || !isAuthReady || !userId || !role) return;

        console.log("Starting store fetch - user authenticated with role:", role);
        const storesColRef = collection(db, `artifacts/${appId}/public/data/stores`);

        const unsubscribeStores = onSnapshot(storesColRef, (snapshot) => {
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

                setSelectedStoreId(prevId => {
                    if (prevId && !newStores[prevId]) {
                        console.log("Selected store was deleted, resetting selection");
                        return '';
                    }
                    return prevId;
                });
            } catch (error) {
                console.error('Store data processing error:', error);
            }
        }, (error) => {
            if (error?.code === 'cancelled' || error?.message?.includes('NS_BINDING_ABORTED')) {
                return;
            }
            console.error("Error listening to stores:", error);
            setStores({});
            setStoresLoaded(true);
        });

        return () => unsubscribeStores();
    }, [db, appId, isAuthReady, userId, role]);

    // Fetch master stock list
    useEffect(() => {
        if (!db || !isAuthReady) return;

        const listDocRef = doc(db, `artifacts/${appId}/public`, 'master_stock_list');

        const unsubscribeList = onSnapshot(listDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.list) {
                    console.log('Master stock list updated from Firestore');
                    setMasterStockList(data.list);
                }
            } else {
                // Create initial list if doesn't exist
                setDoc(listDocRef, {
                    list: masterStockList,
                    lastUpdated: new Date().toISOString()
                }).catch(console.error);
            }
        }, (error) => {
            if (error?.code !== 'cancelled') {
                console.error('Error listening to master stock list:', error);
            }
        });

        return () => unsubscribeList();
    }, [db, appId, isAuthReady]);

    // Update misc status when master list changes
    useEffect(() => {
        if (masterStockList.MISC) {
            setMiscStatus(prev => {
                const newStatus = { ...prev };
                masterStockList.MISC.forEach(item => {
                    const key = `MISC-${item}`;
                    if (!newStatus[key]) {
                        newStatus[key] = 'available';
                    }
                });
                return newStatus;
            });
        }
    }, [masterStockList]);

    // Fetch stock data for a store
    const fetchStockData = useCallback(async (storeId) => {
        if (!db || !storeId) return;

        setLoadingData(true);
        const todayDate = getTodayDate();
        const yesterdayDate = getYesterdayDate();

        try {
            // Fetch today's closing stock
            const todayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeId}-${todayDate}`);
            const todaySnap = await getDoc(todayDocRef);
            if (todaySnap.exists()) {
                setCurrentStock(todaySnap.data().stock || {});
            } else {
                setCurrentStock({});
                setOrderQuantities({});
            }

            // Fetch yesterday's closing stock (for reference)
            const yesterdayDocRef = doc(db, `artifacts/${appId}/public/data/stock_entries`, `${storeId}-${yesterdayDate}`);
            const yesterdaySnap = await getDoc(yesterdayDocRef);
            if (yesterdaySnap.exists()) {
                setYesterdayStock(yesterdaySnap.data().stock || {});
            } else {
                setYesterdayStock({});
            }

            // Fetch yesterday's orders (for sold calculation)
            const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
            const ordersSnapshot = await getDocs(ordersColRef);

            let yesterdayOrders = {};
            ordersSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.storeId === storeId) {
                    const orderDate = new Date(data.orderDate).toISOString().slice(0, 10);
                    if (orderDate === yesterdayDate && data.orderQuantities) {
                        // Aggregate all orders from yesterday
                        Object.entries(data.orderQuantities).forEach(([key, qty]) => {
                            yesterdayOrders[key] = (yesterdayOrders[key] || 0) + (qty || 0);
                        });
                    }
                }
            });
            setYesterdayOrderedStock(yesterdayOrders);

        } catch (e) {
            console.error("Error fetching stock data:", e);
        } finally {
            setLoadingData(false);
        }
    }, [db, appId]);

    // Re-fetch data when store changes
    useEffect(() => {
        if (role === 'staff' && userStoreId && selectedStoreId !== userStoreId) {
            setSelectedStoreId(userStoreId);
        }

        if (db && userId && selectedStoreId) {
            fetchStockData(selectedStoreId);
        }
    }, [db, userId, selectedStoreId, fetchStockData, role, userStoreId]);

    // Reset order data when store changes
    useEffect(() => {
        if (selectedStoreId && stores[selectedStoreId]) {
            setOrderQuantities({});
            setSelectedMiscItems({});
        }
    }, [selectedStoreId, stores]);

    const value = {
        // Stores
        stores,
        storesLoaded,
        selectedStoreId,
        setSelectedStoreId,

        // Stock
        currentStock,
        setCurrentStock,
        yesterdayStock,
        yesterdayOrderedStock,
        orderQuantities,
        setOrderQuantities,
        selectedDate,
        setSelectedDate,
        loadingData,

        // Master list
        masterStockList,
        setMasterStockList,
        CATEGORY_ORDER,

        // MISC
        miscStatus,
        setMiscStatus,
        selectedMiscItems,
        setSelectedMiscItems,

        // Utilities
        getEmptyStock,
        getEmptyMiscStatus,
        calculateSold,
        soldStockSummary,
        fetchStockData,
        getTodayDate,
        getYesterdayDate
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

export default StoreContext;
