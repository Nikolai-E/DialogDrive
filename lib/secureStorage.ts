/**
 * Secure storage implementation for DialogDrive
 * Addresses critical security and storage limitations:
 * - Uses storage.local for bulk data (5MB limit)
 * - Uses storage.sync only for lightweight preferences
 * - Implements encryption for sensitive data
 * - Removes localStorage fallback (not available in MV3 service workers)
 */

import { logger } from './logger';

// Storage quotas and limits
const STORAGE_LIMITS = {
  SYNC_TOTAL: 100 * 1024, // 100KB total
  SYNC_ITEM: 8 * 1024,     // 8KB per item
  LOCAL_TOTAL: 5 * 1024 * 1024, // 5MB total
} as const;

// Key prefixes for organization
const STORAGE_KEYS = {
  // Local storage (bulk data)
  PROMPTS: 'dd_prompts',
  CHAINS: 'dd_chains', 
  CHATS: 'dd_chats',
  BOOKMARKS: 'dd_bookmarks',
  METADATA: 'dd_metadata',
  
  // Sync storage (preferences only)
  PREFERENCES: 'dd_prefs',
  THEME: 'dd_theme',
  UI_STATE: 'dd_ui',
  
  // Session storage (temporary/sensitive)
  API_KEY: 'dd_api_key_session',
  USER_SESSION: 'dd_session',
} as const;

/**
 * Encryption utilities for sensitive data
 */
class SimpleEncryption {
  private static async getKey(): Promise<CryptoKey> {
    // Generate a key from browser runtime ID (unique per extension instance)
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(browser.runtime.id.padEnd(32, '0')),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('dialogdrive-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(data);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      // Combine iv and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  static async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getKey();
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }
}

/**
 * Storage interface for different data types
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getUsage(): Promise<{ used: number; available: number }>;
}

/**
 * Local storage adapter (for bulk data)
 */
class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] as T;
    } catch (error) {
      logger.error(`Failed to get from local storage: ${key}`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await browser.storage.local.set({ [key]: value });
      logger.debug(`Stored to local: ${key}`);
    } catch (error) {
      logger.error(`Failed to set local storage: ${key}`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await browser.storage.local.remove(key);
    } catch (error) {
      logger.error(`Failed to remove from local storage: ${key}`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      logger.error('Failed to clear local storage', error);
      throw error;
    }
  }

  async getUsage(): Promise<{ used: number; available: number }> {
    try {
      // Note: getBytesInUse is not available in all browsers
      // Estimate usage by serializing all data
      const allData = await browser.storage.local.get();
      const used = JSON.stringify(allData).length;
      return {
        used: used,
        available: STORAGE_LIMITS.LOCAL_TOTAL - used
      };
    } catch (error) {
      logger.error('Failed to get local storage usage', error);
      return { used: 0, available: STORAGE_LIMITS.LOCAL_TOTAL };
    }
  }
}

/**
 * Sync storage adapter (for preferences only)
 */
class SyncStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const result = await browser.storage.sync.get(key);
      return result[key] as T;
    } catch (error) {
      logger.error(`Failed to get from sync storage: ${key}`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > STORAGE_LIMITS.SYNC_ITEM) {
        throw new Error(`Data too large for sync storage: ${serialized.length} bytes`);
      }
      
      await browser.storage.sync.set({ [key]: value });
      logger.debug(`Stored to sync: ${key}`);
    } catch (error) {
      logger.error(`Failed to set sync storage: ${key}`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await browser.storage.sync.remove(key);
    } catch (error) {
      logger.error(`Failed to remove from sync storage: ${key}`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await browser.storage.sync.clear();
    } catch (error) {
      logger.error('Failed to clear sync storage', error);
      throw error;
    }
  }

  async getUsage(): Promise<{ used: number; available: number }> {
    try {
      // Note: getBytesInUse is not available in all browsers
      // Estimate usage by serializing all data
      const allData = await browser.storage.sync.get();
      const used = JSON.stringify(allData).length;
      return {
        used: used,
        available: STORAGE_LIMITS.SYNC_TOTAL - used
      };
    } catch (error) {
      logger.error('Failed to get sync storage usage', error);
      return { used: 0, available: STORAGE_LIMITS.SYNC_TOTAL };
    }
  }
}

/**
 * Session storage adapter (for temporary/sensitive data)
 */
class SessionStorageAdapter implements StorageAdapter {
  private sessionData = new Map<string, any>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.sessionData.get(key) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.sessionData.set(key, value);
    logger.debug(`Stored to session: ${key}`);
  }

  async remove(key: string): Promise<void> {
    this.sessionData.delete(key);
  }

  async clear(): Promise<void> {
    this.sessionData.clear();
  }

  async getUsage(): Promise<{ used: number; available: number }> {
    const used = JSON.stringify([...this.sessionData]).length;
    return { used, available: Number.MAX_SAFE_INTEGER };
  }
}

/**
 * Secure storage manager
 */
export class SecureStorage {
  private local = new LocalStorageAdapter();
  private sync = new SyncStorageAdapter();
  private session = new SessionStorageAdapter();

  // Bulk data storage (local)
  async getPrompts<T>(): Promise<T | undefined> {
    return this.local.get<T>(STORAGE_KEYS.PROMPTS);
  }

  async setPrompts<T>(prompts: T): Promise<void> {
    return this.local.set(STORAGE_KEYS.PROMPTS, prompts);
  }

  async getChains<T>(): Promise<T | undefined> {
    return this.local.get<T>(STORAGE_KEYS.CHAINS);
  }

  async setChains<T>(chains: T): Promise<void> {
    return this.local.set(STORAGE_KEYS.CHAINS, chains);
  }

  async getChats<T>(): Promise<T | undefined> {
    return this.local.get<T>(STORAGE_KEYS.CHATS);
  }

  async setChats<T>(chats: T): Promise<void> {
    return this.local.set(STORAGE_KEYS.CHATS, chats);
  }

  // Preferences storage (sync)
  async getPreferences<T>(): Promise<T | undefined> {
    return this.sync.get<T>(STORAGE_KEYS.PREFERENCES);
  }

  async setPreferences<T>(preferences: T): Promise<void> {
    return this.sync.set(STORAGE_KEYS.PREFERENCES, preferences);
  }

  async getTheme<T>(): Promise<T | undefined> {
    return this.sync.get<T>(STORAGE_KEYS.THEME);
  }

  async setTheme<T>(theme: T): Promise<void> {
    return this.sync.set(STORAGE_KEYS.THEME, theme);
  }

  // Sensitive data storage (session + encryption)
  async getApiKey(): Promise<string | undefined> {
    try {
      const encrypted = await this.session.get<string>(STORAGE_KEYS.API_KEY);
      if (!encrypted) return undefined;
      return await SimpleEncryption.decrypt(encrypted);
    } catch (error) {
      logger.error('Failed to get API key', error);
      return undefined;
    }
  }

  async setApiKey(apiKey: string): Promise<void> {
    try {
      const encrypted = await SimpleEncryption.encrypt(apiKey);
      await this.session.set(STORAGE_KEYS.API_KEY, encrypted);
    } catch (error) {
      logger.error('Failed to set API key', error);
      throw error;
    }
  }

  async removeApiKey(): Promise<void> {
    await this.session.remove(STORAGE_KEYS.API_KEY);
  }

  // Storage management
  async getStorageUsage() {
    const [localUsage, syncUsage, sessionUsage] = await Promise.all([
      this.local.getUsage(),
      this.sync.getUsage(),
      this.session.getUsage()
    ]);

    return {
      local: localUsage,
      sync: syncUsage,
      session: sessionUsage,
      limits: STORAGE_LIMITS
    };
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      this.local.clear(),
      this.sync.clear(),
      this.session.clear()
    ]);
  }

  // Migration support
  async migrateData(version: string): Promise<void> {
    logger.info(`Migrating data to version ${version}`);
    // Implementation for future migrations
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();
