import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, appId } from '../services/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [role, setRole] = useState(null);
    const [userStoreId, setUserStoreId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isFirstUser, setIsFirstUser] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from Firestore
    const fetchUserProfile = useCallback(async (firebaseUser, username = null) => {
        try {
            if (!firebaseUser || firebaseUser.isAnonymous) {
                setRole(null);
                setUserStoreId(null);
                return null;
            }

            setUserId(firebaseUser.uid);
            const roleDocRef = doc(db, `artifacts/${appId}/users/${firebaseUser.uid}/user_config`, 'profile');
            const roleSnap = await getDoc(roleDocRef);

            if (roleSnap.exists()) {
                const profileData = roleSnap.data();
                setRole(profileData.role);
                setUserStoreId(profileData.storeId || null);
                return profileData;
            } else {
                // Create new profile for first-time user
                const defaultRole = 'admin';
                const defaultUsername = username ||
                    (firebaseUser.email ? firebaseUser.email.split('@')[0] : firebaseUser.uid.substring(0, 8));

                await setDoc(roleDocRef, {
                    role: defaultRole,
                    username: defaultUsername
                }, { merge: true });

                setRole(defaultRole);
                setUserStoreId(null);
                return { role: defaultRole, username: defaultUsername };
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }, []);

    // Check if this is the first user setup
    const checkFirstUser = useCallback(async () => {
        try {
            const setupDocRef = doc(db, `artifacts/${appId}/public`, 'config');
            const setupDocSnap = await getDoc(setupDocRef);
            const isFirstRun = !setupDocSnap.exists();
            setIsFirstUser(isFirstRun);
            return isFirstRun;
        } catch (error) {
            console.error('Error checking first user:', error);
            return false;
        }
    }, []);

    // Login function
    const login = useCallback(async (username, password) => {
        // Sanitize username: remove special chars, allow only alphanumeric and underscore
        const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        if (!sanitizedUsername) {
            throw new Error('Invalid username format');
        }
        const fakeEmail = `${sanitizedUsername}@sujatainventory.local`;
        const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
        return userCredential.user;
    }, []);

    // Register function
    const register = useCallback(async (username, password) => {
        // Sanitize username: remove special chars, allow only alphanumeric and underscore
        const sanitizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        if (!sanitizedUsername) {
            throw new Error('Invalid username format');
        }
        const fakeEmail = `${sanitizedUsername}@sujatainventory.local`;
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        return userCredential.user;
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        await signOut(auth);
        setUser(null);
        setUserId(null);
        setRole(null);
        setUserStoreId(null);
    }, []);

    // Complete first admin setup
    const completeFirstAdminSetup = useCallback(async (firebaseUser, username, storeId = null) => {
        const roleDocRef = doc(db, `artifacts/${appId}/users/${firebaseUser.uid}/user_config`, 'profile');
        await setDoc(roleDocRef, {
            role: 'admin',
            storeId: storeId,
            username: username
        }, { merge: true });

        // Set the setup complete flag
        const setupDocRef = doc(db, `artifacts/${appId}/public`, 'config');
        await setDoc(setupDocRef, {
            completed: true,
            firstAdminId: firebaseUser.uid,
            timestamp: new Date().toISOString()
        });

        setRole('admin');
        setUserStoreId(storeId);
        setIsFirstUser(false);
    }, []);

    // Update user store ID
    const updateUserStoreId = useCallback(async (newStoreId) => {
        if (!userId) return;

        const roleDocRef = doc(db, `artifacts/${appId}/users/${userId}/user_config`, 'profile');
        await setDoc(roleDocRef, { storeId: newStoreId }, { merge: true });
        setUserStoreId(newStoreId);
    }, [userId]);

    // Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                setLoading(true);

                if (firebaseUser) {
                    setUser(firebaseUser);
                    setUserId(firebaseUser.uid);
                    await fetchUserProfile(firebaseUser);
                } else {
                    setUser(null);
                    setUserId(null);
                    setRole(null);
                    setUserStoreId(null);
                }

                await checkFirstUser();
                setIsAuthReady(true);
            } catch (error) {
                console.error('Auth state change error:', error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [fetchUserProfile, checkFirstUser]);

    const value = {
        user,
        userId,
        role,
        userStoreId,
        isAuthReady,
        isFirstUser,
        loading,
        auth,
        db,
        appId,
        login,
        register,
        logout,
        fetchUserProfile,
        completeFirstAdminSetup,
        updateUserStoreId,
        setRole,
        setUserStoreId
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
