/**
 * Validates and sanitizes stock data before saving
 */
export const validateStockData = (stockData) => {
  const errors = [];
  const sanitized = {};
  
  if (!stockData || typeof stockData !== 'object') {
    throw new Error('Invalid stock data format');
  }

  Object.entries(stockData).forEach(([key, value]) => {
    if (!key.includes('-')) {
      errors.push(`Invalid key format: ${key}`);
      return;
    }

    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      sanitized[key] = 0;
    } else if (numValue < 0) {
      errors.push(`Negative value for ${key}: ${value}`);
      sanitized[key] = 0;
    } else if (numValue > 1000000) {
      errors.push(`Unrealistic value for ${key}: ${value}`);
      sanitized[key] = 1000000;
    } else {
      sanitized[key] = parseFloat(numValue.toFixed(2));
    }
  });

  return { sanitized, errors };
};

/**
 * Validates store data
 */
export const validateStoreData = (storeData) => {
  if (!storeData || typeof storeData !== 'object') {
    throw new Error('Invalid store data');
  }

  const { name } = storeData;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Store name is required');
  }

  if (name.trim().length > 100) {
    throw new Error('Store name too long (max 100 characters)');
  }

  const sanitizedName = name.trim().replace(/\s+/g, ' ');
  
  return { ...storeData, name: sanitizedName };
};

/**
 * Validates user credentials
 */
export const validateUserCredentials = (username, password) => {
  const errors = [];

  if (!username || username.trim().length === 0) {
    errors.push('Username is required');
  } else if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  } else if (username.length > 50) {
    errors.push('Username too long (max 50 characters)');
  } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, dots, hyphens, and underscores');
  }

  if (!password || password.length === 0) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  } else if (password.length > 128) {
    errors.push('Password too long (max 128 characters)');
  }

  return errors;
};

/**
 * Validates date input
 */
export const validateDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }

  if (date > today) {
    throw new Error('Cannot select future dates');
  }

  if (date < oneYearAgo) {
    throw new Error('Date too far in the past (max 1 year)');
  }

  return dateString;
};

/**
 * Rate limiter for actions
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const safeClone = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Clone failed:', error);
    return obj;
  }
};

export const isEmpty = (obj) => {
  return obj === null || obj === undefined || 
         (typeof obj === 'object' && Object.keys(obj).length === 0) ||
         (typeof obj === 'string' && obj.trim().length === 0);
};
