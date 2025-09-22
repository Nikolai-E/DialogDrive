/**
 * Secure storage implementation for DialogDrive V2
 * Uses browser's built-in security instead of weak custom encryption
 */

import { logger } from './logger';

// Storage limits
const STORAGE_LIMITS = {
  SYNC_TOTAL: 100 * 1024,
  SYNC_ITEM: 8 * 1024,
  LOCAL_TOTAL: 5 * 1024 * 1024,
} as const;

// Storage keys
const STORAGE_KEYS = {
  PROMPTS: 'dd_prompts',
  CHATS: 'dd_chats',
  PREFERENCES: 'dd_prefs',
  LAST_CLEARED_AT: 'dd_lastClearedAt',
} as const;

export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

class BrowserStorageAdapter implements StorageAdapter {
  constructor(private storageArea: 'local' | 'sync') {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const storage = browser.storage[this.storageArea];
      const result = await storage.get(key);
      return result[key] as T;
    } catch (error) {
      logger.error(`Failed to get from ${this.storageArea} storage: ${key}`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const storage = browser.storage[this.storageArea];
      await storage.set({ [key]: value });
    } catch (error) {
      logger.error(`Failed to set ${this.storageArea} storage: ${key}`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const storage = browser.storage[this.storageArea];
      await storage.remove(key);
    } catch (error) {
      logger.error(`Failed to remove from ${this.storageArea} storage: ${key}`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const storage = browser.storage[this.storageArea];
      await storage.clear();
    } catch (error) {
      logger.error(`Failed to clear ${this.storageArea} storage`, error);
      throw error;
    }
  }
}

export class SecureStorageV2 {
  private local = new BrowserStorageAdapter('local');
  private sync = new BrowserStorageAdapter('sync');

  // Data storage (local)
  async getPrompts<T>(): Promise<T | undefined> {
    return this.local.get<T>(STORAGE_KEYS.PROMPTS);
  }

  async setPrompts<T>(prompts: T): Promise<void> {
    return this.local.set(STORAGE_KEYS.PROMPTS, prompts);
  }

  async getChats<T>(): Promise<T | undefined> {
    return this.local.get<T>(STORAGE_KEYS.CHATS);
  }

  async setChats<T>(chats: T): Promise<void> {
    return this.local.set(STORAGE_KEYS.CHATS, chats);
  }

  // Preferences (sync)
  async getPreferences<T>(): Promise<T | undefined> {
    return this.sync.get<T>(STORAGE_KEYS.PREFERENCES);
  }

  async setPreferences<T>(preferences: T): Promise<void> {
    return this.sync.set(STORAGE_KEYS.PREFERENCES, preferences);
  }

  // Clear entry timestamp (local)
  async getLastClearedAt(): Promise<string | undefined> {
    return this.local.get<string>(STORAGE_KEYS.LAST_CLEARED_AT);
  }

  async setLastClearedAt(timestamp: string): Promise<void> {
    await this.local.set(STORAGE_KEYS.LAST_CLEARED_AT, timestamp);
  }

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        this.local.clear(),
        this.sync.clear(),
      ]);
    } catch (error) {
      logger.error('Failed to clear secure storage', error);
      throw error;
    }
  }

  // Storage info
  async getStorageUsage() {
    const [localData, syncData] = await Promise.all([
      browser.storage.local.get(),
      browser.storage.sync.get()
    ]);

    return {
      local: {
        used: JSON.stringify(localData).length,
        available: STORAGE_LIMITS.LOCAL_TOTAL
      },
      sync: {
        used: JSON.stringify(syncData).length,
        available: STORAGE_LIMITS.SYNC_TOTAL
      }
    };
  }
}

export const secureStorage = new SecureStorageV2();
