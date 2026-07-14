import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { doc, getDoc, setDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { useAuth } from './AuthContext';
import { getTodayDate, getYesterdayDate, formatDateLocal } from '../utils/date-utils';

const StoreContext = createContext(null);

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
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

    // Master stock list - matches WhatsApp order format
    const [masterStockList, setMasterStockList] = useState({
        MILKSHAKE: [
            'Mango', 'Pista', 'Pineapple', 'Rose', 'Orange', 'Vanilla', 'Kesar',
            'Chocolate', 'Strawberry', 'Butter Scotch', 'Kesar Mango',
            'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Pink Peru'
        ],
        'ICE CREAM': [
            'Mango', 'Pista', 'Pineapple', 'Rose', 'Vanilla', 'Orange', 'Keshar Pista',
            'Chocolate', 'Strawberry', 'Butter Scotch', 'Dry Anjir', 'Coffee Chips',
            'Chocolate Fudge Badam', 'Chocolate Choco Chips', 'Royal Treat', 'Kaju Draksha',
            'Lichi', 'Jardalu', 'V.O.P.', 'Gulkand Badam', 'Fresh Mango Bites',
            'Tender Coconut', 'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Pink Peru'
        ],
        TOPPINGS: [
            'Dry Fruit Pack', 'Pista Pack', 'Badam Pack', 'Pista Powder', 'Cherry Tin'
        ],
        'ICE CREAM DABBE': ['Ice Cream Empty Dabe'],
        MISC: [
            'Glass Box Big', 'Glass Box Small', 'Icecream cup', 'Big Glass Lid Box',
            'Small Glass Lid Box', 'Icecream cup lid Box', 'Cone Box',
            'Paper Straw', 'Paper napkin', '500 ml Container'
        ]
    });

    // MISC status tracking
    const [miscStatus, setMiscStatus] = useState({});
    const [selectedMiscItems, setSelectedMiscItems] = useState({});

    // Active/Inactive items for stock entry (per store)
    // Key format: "CATEGORY-ItemName", value: true (active) or false (inactive)
    const [activeItems, setActiveItems] = useState({});

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

    // Ref to hold initial list for creating if doesn't exist (avoids dependency cycle)
    const initialListRef = useRef(masterStockList);

    // Fetch master stock list
    useEffect(() => {
        if (!db || !isAuthReady || !userId) return;

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
                    list: initialListRef.current,
                    lastUpdated: new Date().toISOString()
                }).catch(console.error);
            }
        }, (error) => {
            if (error?.code !== 'cancelled') {
                console.error('Error listening to master stock list:', error);
            }
        });

        return () => unsubscribeList();
    }, [db, appId, isAuthReady, userId]);


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

    // Fetch active items for a store
    const fetchActiveItems = useCallback(async (storeId) => {
        if (!db || !storeId) return;

        try {
            const activeDocRef = doc(db, `artifacts/${appId}/public/data/store_active_items`, storeId);
            const activeSnap = await getDoc(activeDocRef);

            if (activeSnap.exists()) {
                setActiveItems(activeSnap.data().items || {});
            } else {
                // Default: all items active
                setActiveItems({});
            }
        } catch (error) {
            console.error('Error fetching active items:', error);
            setActiveItems({});
        }
    }, [db, appId]);

    // Save active items for a store
    const saveActiveItems = useCallback(async (storeId, items) => {
        if (!db || !storeId) return;

        try {
            const activeDocRef = doc(db, `artifacts/${appId}/public/data/store_active_items`, storeId);
            await setDoc(activeDocRef, {
                items,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving active items:', error);
        }
    }, [db, appId]);

    // Toggle item active status
    const toggleItemActive = useCallback((category, item) => {
        const key = `${category}-${item}`;
        setActiveItems(prev => {
            const newItems = { ...prev };
            // If not set, default is active (true), so toggling makes it inactive (false)
            newItems[key] = prev[key] === false ? true : false;
            // Save to Firestore
            if (selectedStoreId) {
                saveActiveItems(selectedStoreId, newItems);
            }
            return newItems;
        });
    }, [selectedStoreId, saveActiveItems]);

    // Check if item is active (default is active if not set)
    const isItemActive = useCallback((category, item) => {
        const key = `${category}-${item}`;
        return activeItems[key] !== false; // Default to active
    }, [activeItems]);

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
                    const orderDate = formatDateLocal(new Date(data.orderDate));
                    if (orderDate === yesterdayDate && data.orderQuantities) {
                        // Aggregate all orders from yesterday
                        Object.entries(data.orderQuantities).forEach(([key, qty]) => {
                            yesterdayOrders[key] = (yesterdayOrders[key] || 0) + (qty || 0);
                        });
                    }
                }
            });
            setYesterdayOrderedStock(yesterdayOrders);

            // Also fetch active items for this store
            await fetchActiveItems(storeId);

        } catch (e) {
            console.error("Error fetching stock data:", e);
        } finally {
            setLoadingData(false);
        }
    }, [db, appId, fetchActiveItems]);

    // Re-fetch data when store changes
    useEffect(() => {
        // For staff, always force their assigned store
        if (role === 'staff' && userStoreId && selectedStoreId !== userStoreId) {
            setSelectedStoreId(userStoreId);
        }

        // For admin (or any role), auto-select their assigned store if no store is selected yet
        if (role === 'admin' && userStoreId && !selectedStoreId) {
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

    const value = useMemo(() => ({
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

        // Active/Inactive items
        activeItems,
        toggleItemActive,
        isItemActive,

        // Utilities
        getEmptyStock,
        getEmptyMiscStatus,
        calculateSold,
        soldStockSummary,
        fetchStockData,
        getTodayDate,
        getYesterdayDate
    }), [
        stores, storesLoaded, selectedStoreId,
        currentStock, yesterdayStock, yesterdayOrderedStock, orderQuantities, selectedDate, loadingData,
        masterStockList, miscStatus, selectedMiscItems, activeItems,
        getEmptyStock, getEmptyMiscStatus, calculateSold, soldStockSummary, fetchStockData,
        toggleItemActive, isItemActive
    ]);

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

export default StoreContext;
