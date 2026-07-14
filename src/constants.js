// Centralized constants for the inventory management system

export const INITIAL_STOCK_LIST = {
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
};

// Firebase configuration is loaded from environment variables in services/firebase.js
// Do not hardcode sensitive values here

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
