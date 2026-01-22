/**
 * Local storage backup system (memory-based for Claude.ai)
 */
class StorageBackup {
  constructor(prefix = 'sujata_backup_') {
    this.prefix = prefix;
    this.memoryStorage = new Map();
  }

  save(key, data) {
    const storageKey = this.prefix + key;
    const backup = {
      data,
      timestamp: Date.now(),
      version: '1.0'
    };

    this.memoryStorage.set(storageKey, backup);
    return true;
  }

  get(key, ttlMs = 3600000) {
    const storageKey = this.prefix + key;
    const backup = this.memoryStorage.get(storageKey);

    if (!backup) return null;

    if (Date.now() - backup.timestamp > ttlMs) {
      this.remove(key);
      return null;
    }

    return backup.data;
  }

  remove(key) {
    const storageKey = this.prefix + key;
    this.memoryStorage.delete(storageKey);
  }

  clearAll() {
    this.memoryStorage.clear();
  }

  getAllKeys() {
    const keys = [];
    this.memoryStorage.forEach((_, key) => {
      keys.push(key.replace(this.prefix, ''));
    });
    return keys;
  }

  getUsageInfo() {
    let totalSize = 0;
    let itemCount = 0;

    this.memoryStorage.forEach((value) => {
      totalSize += JSON.stringify(value).length;
      itemCount++;
    });

    return {
      totalSize,
      itemCount,
      totalSizeKB: (totalSize / 1024).toFixed(2)
    };
  }
}

export const storageBackup = new StorageBackup();

export const recoverFromBackup = (key) => {
  const data = storageBackup.get(key);
  if (data) {
    console.log(`Recovered data from backup: ${key}`);
    return data;
  }
  return null;
};
