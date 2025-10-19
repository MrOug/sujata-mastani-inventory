import { runTransaction, writeBatch, doc, getDoc } from 'firebase/firestore';

/**
 * Safe transaction wrapper with retry logic
 */
export const safeTransaction = async (db, transactionFn, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await runTransaction(db, transactionFn);
    } catch (error) {
      lastError = error;
      console.warn(`Transaction attempt ${attempt} failed:`, error);
      
      if (error.code === 'permission-denied' || 
          error.code === 'unauthenticated' ||
          error.code === 'invalid-argument') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
      }
    }
  }
  
  throw lastError;
};

/**
 * Batch write with automatic splitting
 */
export const safeBatchWrite = async (db, operations) => {
  const BATCH_SIZE = 500;
  const batches = [];
  
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchOps = operations.slice(i, i + BATCH_SIZE);
    
    batchOps.forEach(({ type, ref, data }) => {
      switch (type) {
        case 'set':
          batch.set(ref, data);
          break;
        case 'update':
          batch.update(ref, data);
          break;
        case 'delete':
          batch.delete(ref);
          break;
      }
    });
    
    batches.push(batch.commit());
  }
  
  return Promise.all(batches);
};

/**
 * Document cache for reducing reads
 */
export class DocumentCache {
  constructor(ttlMs = 60000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Retry helper
 */
export const retryOperation = async (operation, maxRetries = 3, delayMs = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      console.warn(`Retry ${i + 1}/${maxRetries} after error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
};

/**
 * Check Firestore connection
 */
export const checkFirestoreConnection = async (db) => {
  try {
    const testDoc = doc(db, '_connection_test', 'ping');
    await getDoc(testDoc);
    return true;
  } catch (error) {
    console.error('Firestore connection check failed:', error);
    return false;
  }
};
