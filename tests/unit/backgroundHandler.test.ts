import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { BackgroundDependencies } from '@/lib/background/handler';
import { handleBackgroundMessage, normalizeScrapedContent } from '@/lib/background/handler';

const chatStorageMock = {
  add: vi.fn(),
  getAll: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  incrementAccess: vi.fn(),
};

const promptStorageMock = {
  getAll: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  incrementUsage: vi.fn(),
};

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const deps: BackgroundDependencies = {
  chatStorage: chatStorageMock as unknown as BackgroundDependencies['chatStorage'],
  promptStorage: promptStorageMock as unknown as BackgroundDependencies['promptStorage'],
  logger: loggerMock as unknown as BackgroundDependencies['logger'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleBackgroundMessage', () => {
  test('handles SAVE_BOOKMARK by delegating to chatStorage', async () => {
    const bookmark = {
      id: 'chat_1',
      title: 'Saved',
      url: 'https://example.com',
      platform: 'chatgpt',
    };
    chatStorageMock.add.mockResolvedValue(bookmark);

    const result = await handleBackgroundMessage(
      {
        type: 'SAVE_BOOKMARK',
        data: {
          title: 'Saved',
          url: 'https://example.com',
          platform: 'chatgpt',
          workspace: 'General',
        },
      },
      deps
    );

    expect(result.handled).toBe(true);
    expect(chatStorageMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Saved',
        url: 'https://example.com',
        workspace: 'General',
      })
    );
    expect(result.response).toMatchObject({ success: true, bookmark });
  });

  test('returns handled false for invalid messages', async () => {
    const result = await handleBackgroundMessage({ type: 'UNKNOWN' }, deps);
    expect(result.handled).toBe(false);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  test('handles SAVE_CHAT_BOOKMARK via chatStorage', async () => {
    const added = { id: 'chat_2' };
    chatStorageMock.add.mockResolvedValue(added);

    const result = await handleBackgroundMessage(
      {
        type: 'SAVE_CHAT_BOOKMARK',
        data: {
          title: 'Chat',
          url: 'https://chatgpt.com/c/1',
          platform: 'chatgpt',
          workspace: 'General',
          scrapedContent: { summary: 's', messageCount: 1, lastMessage: 'hey', scrapedAt: 'now' },
        },
      },
      deps
    );

    expect(result.response).toEqual({ success: true, bookmark: added });
    expect(chatStorageMock.add).toHaveBeenCalledWith(
      expect.objectContaining({ workspace: 'General', tags: [] })
    );
  });

  test('updates storage when deleting tags', async () => {
    promptStorageMock.getAll.mockResolvedValue([
      { id: 'p1', tags: ['keep', 'remove'], workspace: 'General' },
    ]);
    promptStorageMock.update.mockResolvedValue(undefined);
    chatStorageMock.getAll.mockResolvedValue([
      { id: 'c1', tags: ['remove'], workspace: 'General' },
    ]);
    chatStorageMock.update.mockResolvedValue(undefined);

    const result = await handleBackgroundMessage({ type: 'DELETE_TAG', tag: 'remove' }, deps);

    expect(result.response).toEqual({ success: true });
    expect(promptStorageMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['keep'] })
    );
    expect(chatStorageMock.update).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
  });

  test('returns validation error for invalid workspace deletion', async () => {
    const res = await handleBackgroundMessage({ type: 'DELETE_WORKSPACE', name: 'General' }, deps);
    expect(res.handled).toBe(true);
    expect(res.response).toEqual({ success: false, error: 'Invalid workspace name' });
  });

  test('get workspaces and tags merges prompt and chat state', async () => {
    promptStorageMock.getAll.mockResolvedValue([
      { id: 'p1', workspace: 'Dev', tags: ['code'] },
      { id: 'p2', workspace: 'General', tags: ['research'] },
    ]);
    chatStorageMock.getAll.mockResolvedValue([
      { id: 'c1', workspace: 'Support', tags: ['case', 'code'] },
    ]);

    const res = await handleBackgroundMessage({ type: 'GET_WORKSPACES_AND_TAGS' }, deps);

    expect(res.response).toEqual({
      success: true,
      workspaces: expect.arrayContaining(['General', 'Dev', 'Support']),
      tags: expect.arrayContaining(['code', 'research', 'case']),
    });
  });

  test('delete workspace migrates items to General', async () => {
    promptStorageMock.getAll.mockResolvedValue([{ id: 'p1', workspace: 'Dev' }]);
    promptStorageMock.update.mockResolvedValue(undefined);
    chatStorageMock.getAll.mockResolvedValue([{ id: 'c1', workspace: 'Dev' }]);
    chatStorageMock.update.mockResolvedValue(undefined);

    const res = await handleBackgroundMessage({ type: 'DELETE_WORKSPACE', name: 'Dev' }, deps);

    expect(res.response).toEqual({ success: true });
    expect(promptStorageMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ workspace: 'General' })
    );
    expect(chatStorageMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ workspace: 'General' })
    );
  });

  test('propagates storage errors as failure responses', async () => {
    chatStorageMock.add.mockRejectedValue(new Error('boom'));
    const res = await handleBackgroundMessage(
      {
        type: 'SAVE_CHAT_BOOKMARK',
        data: {
          title: 'Chat',
          url: 'https://chatgpt.com/c/1',
          platform: 'chatgpt',
          workspace: 'General',
        },
      },
      deps
    );
    expect(res.handled).toBe(true);
    expect(res.response).toEqual({ success: false, error: 'boom' });
  });
});

describe('normalizeScrapedContent', () => {
  test('returns normalized object when fields present', () => {
    const result = normalizeScrapedContent({
      summary: 'Summary',
      messageCount: '4',
      lastMessage: 'Hello',
      scrapedAt: undefined,
    });

    expect(result).toEqual({
      summary: 'Summary',
      messageCount: 4,
      lastMessage: 'Hello',
      scrapedAt: expect.any(String),
    });
  });

  test('returns undefined for invalid payload', () => {
    expect(normalizeScrapedContent(null)).toBeUndefined();
    expect(normalizeScrapedContent({})).toBeUndefined();
  });
});
