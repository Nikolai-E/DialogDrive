// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Storage helper responsible for persisting chat bookmarks securely.

import type { AddChatBookmark, ChatBookmark } from '../types/chat';
import { mapBrowserError } from './errors';
import { logger } from './logger';
import { AddChatBookmarkSchema } from './schemas';
import { secureStorage } from './secureStorageV2';

export class ChatStorage {
  // Legacy key used before SecureStorageV2 adoption; retained for one-time migration
  private readonly LEGACY_STORAGE_KEY = 'dialogdrive_chats';

  // Reads chats from the encrypted store, falling back to the legacy bucket once.
  private async getFromStorage(): Promise<ChatBookmark[]> {
    // Prefer centralized secure storage
    try {
      const chats = await secureStorage.getChats<ChatBookmark[]>();
      if (Array.isArray(chats)) return chats;
    } catch (error) {
      const mapped = mapBrowserError(error);
      logger.warn('Secure storage getChats failed; attempting legacy migration.', mapped);
    }

    // Attempt one-time migration from legacy key if present
    try {
      if (typeof browser !== 'undefined' && browser.storage?.local) {
        const result = await browser.storage.local.get(this.LEGACY_STORAGE_KEY);
        const legacy = result[this.LEGACY_STORAGE_KEY] as ChatBookmark[] | undefined;
        if (Array.isArray(legacy) && legacy.length) {
          await secureStorage.setChats(legacy);
          // Best-effort cleanup of legacy key
          try {
            await browser.storage.local.remove(this.LEGACY_STORAGE_KEY);
          } catch {}
          logger.info('Migrated chat bookmarks from legacy storage to SecureStorageV2');
          return legacy;
        }
      }
    } catch (error) {
      const mapped = mapBrowserError(error);
      logger.warn('Legacy storage migration failed', mapped);
    }

    return [];
  }

  private async saveToStorage(chats: ChatBookmark[]): Promise<void> {
    try {
      await secureStorage.setChats(chats);
    } catch (error) {
      const mapped = mapBrowserError(error);
      logger.error('Failed to persist chats to SecureStorageV2', mapped);
      throw mapped;
    }
  }

  async getAll(): Promise<ChatBookmark[]> {
    // Expose current chats without extra shaping.
    return await this.getFromStorage();
  }

  async add(chatData: AddChatBookmark): Promise<ChatBookmark> {
    const chats = await this.getFromStorage();
    // Validate incoming data; coerce defaults where provided
    // Surface friendly errors if the schema rejects the payload.
    const parsed = AddChatBookmarkSchema.safeParse(chatData);
    if (!parsed.success) {
      const issues = parsed.error.issues || [];
      const urlIssue = issues.find((issue) => issue.path?.includes('url'));
      if (urlIssue) {
        throw new Error('Invalid chat bookmark URL. Please include a full https:// link.');
      }
      const titleIssue = issues.find((issue) => issue.path?.includes('title'));
      if (titleIssue) {
        throw new Error('Chat bookmark title is required.');
      }
      const workspaceIssue = issues.find((issue) => issue.path?.includes('workspace'));
      if (workspaceIssue) {
        throw new Error('Choose a workspace before saving this bookmark.');
      }
      throw new Error('Invalid chat bookmark payload.');
    }
    const safe = parsed.data;

    const newChat: ChatBookmark = {
      ...safe,
      isPinned: safe.isPinned ?? false,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `chat_${crypto.randomUUID()}`
          : `chat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      created: new Date().toISOString(),
      accessCount: 0,
    };

    chats.push(newChat);
    await this.saveToStorage(chats);

    logger.log('Chat bookmark added:', newChat.id);
    return newChat;
  }

  async update(chat: ChatBookmark): Promise<ChatBookmark> {
    // Replace an existing chat entry after edits.
    const chats = await this.getFromStorage();
    const index = chats.findIndex((c) => c.id === chat.id);

    if (index === -1) {
      throw new Error('Chat bookmark not found');
    }

    chats[index] = chat;
    await this.saveToStorage(chats);

    logger.log('Chat bookmark updated:', chat.id);
    return chat;
  }

  async delete(id: string): Promise<void> {
    // Remove a chat bookmark entirely.
    const chats = await this.getFromStorage();
    const filteredChats = chats.filter((c) => c.id !== id);

    if (filteredChats.length === chats.length) {
      throw new Error('Chat bookmark not found');
    }

    await this.saveToStorage(filteredChats);
    logger.log('Chat bookmark deleted:', id);
  }

  async incrementAccess(id: string): Promise<void> {
    // Track quick usage analytics for the unified list.
    const chats = await this.getFromStorage();
    const chat = chats.find((c) => c.id === id);

    if (chat) {
      chat.accessCount = (chat.accessCount || 0) + 1;
      chat.lastAccessed = new Date().toISOString();
      await this.saveToStorage(chats);
      logger.log('Chat access incremented:', id);
    }
  }

  // Enhanced URL parsing for both conversation and share URLs
  // Helps downstream callers understand what kind of link a user saved.
  static parseUrl(url: string): {
    platform: 'chatgpt' | 'gemini' | 'claude' | null;
    conversationId: string | null;
    shareId: string | null;
    urlType: 'conversation' | 'share' | 'unknown';
    isOwnerOnly: boolean;
  } {
    try {
      const cleanUrl = url.trim();

      // ChatGPT URLs
      if (cleanUrl.includes('chatgpt.com')) {
        // Direct conversation URL: https://chatgpt.com/c/{conversation-id}
        const conversationMatch = cleanUrl.match(/chatgpt\.com\/c\/([a-f0-9-]+)/);
        if (conversationMatch) {
          return {
            platform: 'chatgpt',
            conversationId: conversationMatch[1],
            shareId: null,
            urlType: 'conversation',
            isOwnerOnly: true,
          };
        }

        // Share URL: https://chatgpt.com/share/{share-id}
        const shareMatch = cleanUrl.match(/chatgpt\.com\/share\/([a-f0-9-]+)/);
        if (shareMatch) {
          return {
            platform: 'chatgpt',
            conversationId: null,
            shareId: shareMatch[1],
            urlType: 'share',
            isOwnerOnly: false,
          };
        }
      }

      // Gemini URLs
      if (cleanUrl.includes('gemini.google.com') || cleanUrl.includes('g.co/gemini')) {
        // Direct conversation URL: https://gemini.google.com/app/{conversation-id}
        const conversationMatch = cleanUrl.match(/gemini\.google\.com\/app\/([a-f0-9-]+)/);
        if (conversationMatch) {
          return {
            platform: 'gemini',
            conversationId: conversationMatch[1],
            shareId: null,
            urlType: 'conversation',
            isOwnerOnly: true,
          };
        }

        // Share URL: https://g.co/gemini/share/{share-id}
        const shareMatch = cleanUrl.match(/g\.co\/gemini\/share\/([a-f0-9-]+)/);
        if (shareMatch) {
          return {
            platform: 'gemini',
            conversationId: null,
            shareId: shareMatch[1],
            urlType: 'share',
            isOwnerOnly: false,
          };
        }
      }

      // Claude URLs (future support)
      if (cleanUrl.includes('claude.ai')) {
        const conversationMatch = cleanUrl.match(/claude\.ai\/chat\/([a-f0-9-]+)/);
        if (conversationMatch) {
          return {
            platform: 'claude',
            conversationId: conversationMatch[1],
            shareId: null,
            urlType: 'conversation',
            isOwnerOnly: true,
          };
        }
      }

      return {
        platform: null,
        conversationId: null,
        shareId: null,
        urlType: 'unknown',
        isOwnerOnly: false,
      };
    } catch {
      return {
        platform: null,
        conversationId: null,
        shareId: null,
        urlType: 'unknown',
        isOwnerOnly: false,
      };
    }
  }

  static generateTitle(
    url: string,
    platform: 'chatgpt' | 'gemini' | 'claude' | 'deepseek'
  ): string {
    const platformNames = {
      chatgpt: 'ChatGPT',
      gemini: 'Gemini',
      claude: 'Claude',
      deepseek: 'DeepSeek',
    };

    const date = new Date().toLocaleDateString();
    return `${platformNames[platform]} Chat - ${date}`;
  }

  // Auto-capture current chat functionality for content scripts
  static async captureCurrentChat(): Promise<{
    title: string;
    url: string;
    scrapedContent?: any;
  } | null> {
    try {
      // This will be called from content script context
      const currentUrl = window.location.href;
      const parsed = this.parseUrl(currentUrl);

      if (!parsed.platform) {
        return null;
      }

      let title = '';
      let scrapedContent: any = {};

      // Platform-specific scraping
      if (parsed.platform === 'chatgpt') {
        // Try to get conversation title from page
        const titleElement = document.querySelector('title');
        title =
          titleElement?.textContent?.replace(' | ChatGPT', '') ||
          this.generateTitle(currentUrl, 'chatgpt');

        // Count messages
        const messages = document.querySelectorAll('[data-message-author-role]');
        scrapedContent = {
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]?.textContent?.slice(0, 100) || '',
          summary: title,
          scrapedAt: new Date().toISOString(),
        };
      } else if (parsed.platform === 'gemini') {
        // Try to get conversation title from Gemini page
        const titleElement = document.querySelector('title');
        title =
          titleElement?.textContent?.replace(' - Gemini', '') ||
          this.generateTitle(currentUrl, 'gemini');

        // Count messages in Gemini
        const messages = document.querySelectorAll('[data-message-id]');
        scrapedContent = {
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]?.textContent?.slice(0, 100) || '',
          summary: title,
          scrapedAt: new Date().toISOString(),
        };
      }

      return {
        title,
        url: currentUrl,
        scrapedContent,
      };
    } catch (error) {
      logger.error('Failed to capture current chat:', error);
      return null;
    }
  }

  // Calculate storage usage and limits
  static async getStorageInfo(): Promise<{ used: number; available: number; percentage: number }> {
    try {
      // Check browser storage quota
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        return {
          used,
          available,
          percentage: available > 0 ? (used / available) * 100 : 0,
        };
      }

      // Fallback for older browsers
      const chats = await new ChatStorage().getFromStorage();
      const dataSize = JSON.stringify(chats).length;
      const maxSize = 5 * 1024 * 1024; // 5MB estimate for localStorage

      return {
        used: dataSize,
        available: maxSize,
        percentage: (dataSize / maxSize) * 100,
      };
    } catch (error) {
      logger.error('Failed to get storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  async getPage({
    limit,
    cursor,
  }: {
    limit: number;
    cursor: string | null;
  }): Promise<{ items: ChatBookmark[]; nextCursor: string | null }> {
    const all = await this.getAll();
    // Sort by lastAccessed desc then created desc
    const sorted = [...all].sort((a, b) => {
      const ad = a.lastAccessed
        ? new Date(a.lastAccessed).getTime()
        : new Date(a.created).getTime();
      const bd = b.lastAccessed
        ? new Date(b.lastAccessed).getTime()
        : new Date(b.created).getTime();
      return bd - ad;
    });
    let startIndex = 0;
    if (cursor) {
      const idx = sorted.findIndex((it) => it.id === cursor);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }
    const items = sorted.slice(startIndex, startIndex + limit);
    const last = items[items.length - 1] || null;
    const nextCursor = last ? last.id : null;
    return { items, nextCursor };
  }
}

export const chatStorage = new ChatStorage();
