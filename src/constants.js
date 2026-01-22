// Centralized constants for the inventory management system

export const INITIAL_STOCK_LIST = {
  MILKSHAKE: [
    'Mango', 'Rose', 'Pineapple', 'Khus', 'Vanilla', 'Kesar', 'Chocolate', 'Butterscotch',
    'Kesar Mango', 'Strawberry', 'Fresh Sitaphal (Seasonal)', 'Fresh Strawberry (Seasonal)',
  ],
  'ICE CREAM': [
    'Mango', 'Pista', 'Pineapple', 'Vanilla', 'Rose', 'Orange', 'Keshar Pista', 'Chocolate',
    'Strawberry', 'Butterscotch', 'Dry Anjir', 'Coffee Chips', 'Chocolate Fudge Badam',
    'Chocolate Choco Chips', 'Kaju Draksha', 'Gulkand', 'Jagdalu', 'VOP', 'Peru',
    'Fresh Sitaphal', 'Fresh Strawberry', 'Fresh Mango Bites',
  ],
  TOPPINGS: [
    'Dry Fruit', 'Pista', 'Badam', 'Pista Powder', 'Cherry'
  ],
  MISC: [
    'Ice Cream Dabee', 'Ice Cream Spoons', 'Paper Straw', 'Ice Creap Cup', 'Ice Cream Container'
  ]
};

// Firebase configuration constants
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDZt6n1QSGLq_PyLDYQlayFwMK0Qv7gpmE",
  authDomain: "sujata-inventory.firebaseapp.com",
  projectId: "sujata-inventory",
  storageBucket: "sujata-inventory.firebasestorage.app",
  messagingSenderId: "527916478889",
  appId: "1:527916478889:web:7043c7d45087ee452bd4b8",
  measurementId: "G-BC3JXRWDVH"
};

// App configuration constants
export const APP_CONFIG = {
  DEFAULT_APP_ID: 'sujata-mastani-inventory',
  TOAST_DURATION: 4000,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  PERFORMANCE_THRESHOLDS: {
    SLOW: 1000,
    VERY_SLOW: 3000
  }
};

// User role constants
export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff'
};

// View constants
export const VIEWS = {
  HOME: 'home',
  ENTRY: 'entry',
  SOLD: 'sold',
  ORDERING: 'ordering',
  ADMIN: 'admin',
  STORE_MANAGER: 'storemanager',
  USER_MANAGER: 'usermanager',
  ITEM_MANAGER: 'itemmanager'
};

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Modal colors
export const MODAL_COLORS = {
  ORANGE: 'orange',
  RED: 'red',
  GREEN: 'green'
};
