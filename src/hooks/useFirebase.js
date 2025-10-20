import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { FIREBASE_CONFIG, APP_CONFIG, USER_ROLES } from '../constants';

const appId = typeof __app_id !== 'undefined' ? __app_id : APP_CONFIG.DEFAULT_APP_ID;
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : FIREBASE_CONFIG;

export const useFirebase = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userStoreId, setUserStoreId] = useState(null);
    const [isFirstUser, setIsFirstUser] = useState(false);

    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const authentication = getAuth(app);
                setDb(firestore);
                setAuth(authentication);

                const setupDocRef = doc(firestore, `artifacts/${appId}/public`, 'config');
                const setupDocSnap = await getDoc(setupDocRef);

                const isFirstRun = !setupDocSnap.exists();
                setIsFirstUser(isFirstRun);

                const unsubscribeAuth = onAuthStateChanged(authentication, async (user) => {
                    if (!user) {
                        setUserId(null);
                        setUserRole(null);
                        setUserStoreId(null);
                        setIsAuthReady(true);
                        return;
                    }

                    setUserId(user.uid);
                    const roleDocRef = doc(firestore, `artifacts/${appId}/users/${user.uid}/user_config`, 'profile');
                    const roleSnap = await getDoc(roleDocRef);

                    if (roleSnap.exists()) {
                        setUserRole(roleSnap.data().role);
                        setUserStoreId(roleSnap.data().storeId || null);
                    } else {
                        const defaultRole = USER_ROLES.ADMIN;
                        await setDoc(roleDocRef, { role: defaultRole, username: user.email.split('@')[0] }, { merge: true });
                        setUserRole(defaultRole);
                        setUserStoreId(null);
                    }
                    setIsAuthReady(true);
                });

                return () => unsubscribeAuth();
            } catch (error) {
                console.error("Error initializing Firebase:", error);
            }
        };

        initializeFirebase();
    }, []);

    return { db, auth, userId, isAuthReady, userRole, userStoreId, isFirstUser };
};