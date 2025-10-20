import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ChatBookmark } from '@/types/chat';
import { browser } from '@/tests/utils/chrome';

const secureStorageMock = {
  getChats: vi.fn<() => Promise<ChatBookmark[] | undefined>>(),
  setChats: vi.fn<(chats: ChatBookmark[]) => Promise<void>>(),
};

vi.mock('@/lib/secureStorageV2', () => ({
  secureStorage: secureStorageMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
  },
}));

let ChatStorage: typeof import('@/lib/chatStorage').ChatStorage;

beforeAll(async () => {
  ({ ChatStorage } = await import('@/lib/chatStorage'));
});

const legacyChat: ChatBookmark = {
  id: 'chat_legacy',
  title: 'Legacy conversation',
  url: 'https://chatgpt.com/c/123',
  platform: 'chatgpt',
  workspace: 'General',
  tags: [],
  created: new Date().toISOString(),
  accessCount: 0,
  isPinned: false,
};

let persistedChats: ChatBookmark[] = [];

beforeEach(() => {
  persistedChats = [];
  secureStorageMock.getChats.mockReset();
  secureStorageMock.setChats.mockReset();
  secureStorageMock.getChats.mockImplementation(async () => persistedChats);
  secureStorageMock.setChats.mockImplementation(async (chats) => {
    persistedChats = chats;
  });
  browser.storage.local.__reset();
  browser.storage.sync.__reset();
});

describe('ChatStorage', () => {
  test('migrates legacy local storage data when secure storage empty', async () => {
    secureStorageMock.getChats.mockImplementationOnce(async () => {
      throw new Error('secure storage unavailable');
    });
    secureStorageMock.setChats.mockResolvedValue();
    browser.storage.local.__setState({ dialogdrive_chats: [legacyChat] });

    const storage = new ChatStorage();
    const chats = await storage.getAll();

    expect(chats).toEqual([legacyChat]);
    expect(secureStorageMock.setChats).toHaveBeenCalledWith([legacyChat]);
    expect(browser.storage.local.remove).toHaveBeenCalledWith('dialogdrive_chats');
  });

  test('throws friendly error on invalid chat payload', async () => {
    const storage = new ChatStorage();

    await expect(
      storage.add({
        title: 'Test chat',
        url: 'not-a-url',
        platform: 'chatgpt',
        workspace: 'General',
        tags: [],
      } as any)
    ).rejects.toThrow('Invalid chat bookmark URL');
    expect(secureStorageMock.setChats).not.toHaveBeenCalled();
  });

  test('adds new chat with defaults and persists to secure storage', async () => {
    const storage = new ChatStorage();

    const newChat = await storage.add({
      title: 'My chat',
      url: 'https://chatgpt.com/c/456',
      platform: 'chatgpt',
      workspace: 'General',
      tags: ['ai'],
      isPinned: false,
    });

    expect(newChat.id).toMatch(/^chat_/);
    expect(newChat.isPinned).toBe(false);
    expect(newChat.accessCount).toBe(0);
    expect(persistedChats).toHaveLength(1);
    expect(persistedChats[0]).toMatchObject({
      title: 'My chat',
      tags: ['ai'],
    });
  });

  test('update replaces existing chat and persists changes', async () => {
    const storage = new ChatStorage();
    const created = await storage.add({
      title: 'Editable',
      url: 'https://chatgpt.com/c/789',
      platform: 'chatgpt',
      workspace: 'General',
      tags: [],
      isPinned: false,
    });

    const updated = { ...created, title: 'Edited', isPinned: true };
    const result = await storage.update(updated);

    expect(result.title).toBe('Edited');
    expect(persistedChats[0]).toMatchObject({ title: 'Edited', isPinned: true });
  });

  test('delete removes chat when id matches', async () => {
    const storage = new ChatStorage();
    const created = await storage.add({
      title: 'To delete',
      url: 'https://chatgpt.com/c/111',
      platform: 'chatgpt',
      workspace: 'General',
      tags: [],
      isPinned: false,
    });

    await storage.delete(created.id);

    expect(persistedChats).toHaveLength(0);
    expect(secureStorageMock.setChats).toHaveBeenCalledWith([]);
  });

  test('incrementAccess bumps counter and lastAccessed when present', async () => {
    const storage = new ChatStorage();
    const created = await storage.add({
      title: 'Recently opened',
      url: 'https://chatgpt.com/c/222',
      platform: 'chatgpt',
      workspace: 'General',
      tags: [],
      isPinned: false,
    });
    const initialTimestamp = persistedChats[0].lastAccessed;

    await storage.incrementAccess(created.id);

    expect(persistedChats[0].accessCount).toBe(1);
    expect(persistedChats[0].lastAccessed).not.toBe(initialTimestamp);
    expect(secureStorageMock.setChats).toHaveBeenLastCalledWith(persistedChats);
  });
});
