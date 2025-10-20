import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Prompt } from '@/types/prompt';

const secureStorageMock = {
  getPrompts: vi.fn<() => Promise<Prompt[] | undefined>>(),
  setPrompts: vi.fn<(prompts: Prompt[]) => Promise<void>>(),
  getPreferences: vi.fn<() => Promise<Record<string, unknown> | undefined>>(),
  setPreferences: vi.fn<(prefs: Record<string, unknown>) => Promise<void>>(),
};

const logStorageAction = vi.fn();

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
  logStorageAction,
}));

let initializeStorage: typeof import('@/lib/storage').initializeStorage;
let promptStorage: typeof import('@/lib/storage').promptStorage;

beforeAll(async () => {
  ({ initializeStorage, promptStorage } = await import('@/lib/storage'));
});

const validPrompt = (): Prompt => ({
  id: 'prompt-1',
  title: 'Example',
  text: 'Example text',
  workspace: 'General',
  created: new Date().toISOString(),
  tags: [],
  usageCount: 0,
  isPinned: false,
  includeTimestamp: false,
});

let persistedPrompts: Prompt[] = [];
let persistedPrefs: Record<string, unknown> | undefined;

beforeEach(() => {
  persistedPrompts = [];
  persistedPrefs = {};
  Object.values(secureStorageMock).forEach((mock) => mock.mockReset());
  secureStorageMock.getPrompts.mockImplementation(async () => persistedPrompts);
  secureStorageMock.setPrompts.mockImplementation(async (prompts) => {
    persistedPrompts = prompts;
  });
  secureStorageMock.getPreferences.mockImplementation(async () => persistedPrefs);
  secureStorageMock.setPreferences.mockImplementation(async (prefs) => {
    persistedPrefs = prefs;
  });
  logStorageAction.mockReset();
});

describe('initializeStorage', () => {
  test('seeds empty prompts and sets version when storage uninitialized', async () => {
    secureStorageMock.getPrompts.mockResolvedValueOnce(undefined);
    await initializeStorage();

    expect(secureStorageMock.setPrompts).toHaveBeenCalledWith([]);
    expect(secureStorageMock.setPreferences).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.0.0' })
    );
  });
});

describe('promptStorage', () => {
  test('filters invalid prompts when reading from storage', async () => {
    const prompt = validPrompt();
    persistedPrompts = [prompt, { id: 'bad', title: 'oops' } as any];

    const prompts = await promptStorage.getAll();

    expect(prompts).toHaveLength(1);
    expect(prompts[0].id).toBe('prompt-1');
  });

  test('update rejects invalid prompt data', async () => {
    persistedPrompts = [validPrompt()];

    await expect(promptStorage.update({} as any)).rejects.toThrow('Invalid prompt data');
  });

  test('add creates prompt with defaults and persists', async () => {
    const base = validPrompt();
    const created = await promptStorage.add({
      title: base.title,
      text: base.text,
      workspace: '',
      tags: undefined as any,
      usageCount: 99,
      isPinned: true,
      includeTimestamp: true,
    });

    expect(created.id).toMatch(/^.+/);
    expect(created.workspace).toBe('General');
    expect(created.tags).toEqual([]);
    expect(created.usageCount).toBe(0);
    expect(persistedPrompts).toHaveLength(1);
  });

  test('update replaces prompt when present', async () => {
    const stored = validPrompt();
    persistedPrompts = [stored];
    const edited = { ...stored, title: 'Edited', tags: ['t'] };

    const result = await promptStorage.update(edited);

    expect(result.title).toBe('Edited');
    expect(persistedPrompts[0].tags).toEqual(['t']);
  });

  test('remove deletes prompt by id', async () => {
    const stored = validPrompt();
    persistedPrompts = [stored];

    await promptStorage.remove(stored.id);

    expect(persistedPrompts).toHaveLength(0);
  });

  test('incrementUsage bumps usage and lastUsed when prompt exists', async () => {
    const stored = validPrompt();
    persistedPrompts = [stored];
    const initialUsage = stored.usageCount;

    await promptStorage.incrementUsage(stored.id);

    expect(persistedPrompts[0].usageCount).toBe(initialUsage + 1);
    expect(typeof persistedPrompts[0].lastUsed).toBe('string');
  });

  test('bulkUpdate stores prompts when all valid and rejects invalid list', async () => {
    const validList = [validPrompt(), validPrompt()];
    await promptStorage.bulkUpdate(validList);
    expect(persistedPrompts).toEqual(validList);

    await expect(promptStorage.bulkUpdate([validPrompt(), { id: 'bad' } as any])).rejects.toThrow(
      'Some prompts failed validation'
    );
  });

  test('exportData serializes stored prompts with metadata', async () => {
    const stored = validPrompt();
    persistedPrompts = [stored];

    const json = await promptStorage.exportData();
    const data = JSON.parse(json);

    expect(data.prompts).toHaveLength(1);
    expect(data.version).toBeDefined();
    expect(data.prompts[0].id).toBe(stored.id);
  });

  test('importData merges prompts and returns counts', async () => {
    const existing = validPrompt();
    persistedPrompts = [existing];
    const incoming = { ...validPrompt(), id: 'new-one' };

    const result = await promptStorage.importData(
      JSON.stringify({
        prompts: [incoming, existing],
      })
    );

    expect(result).toEqual({ imported: 1, skipped: 1 });
    expect(persistedPrompts).toHaveLength(2);
  });
});
