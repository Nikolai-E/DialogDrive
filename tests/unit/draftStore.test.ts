import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { DraftConflict, DraftData } from '@/lib/draftStore';

const memoryState = new Map<string, string>();

const storageFns = {
  getItem: vi.fn(async (name: string) => memoryState.get(name) ?? null),
  setItem: vi.fn(async (name: string, value: string) => {
    memoryState.set(name, value);
  }),
  removeItem: vi.fn(async (name: string) => {
    memoryState.delete(name);
  }),
};

vi.mock('@/lib/storage/chromeStateStorage', () => ({
  chromeLocalStateStorage: storageFns,
  createChromeSyncStateStorage: () => storageFns,
}));

vi.mock('@/lib/storage/storageEvents', () => ({
  subscribeToStorageKey: vi.fn(() => () => {}),
}));

let useDraftStore: typeof import('@/lib/draftStore').useDraftStore;

const promptDraftData = (): DraftData<'prompt'> => ({
  title: 'Draft title',
  text: 'Body',
  workspace: 'General',
  tags: [],
  includeTimestamp: false,
});

beforeEach(async () => {
  memoryState.clear();
  Object.values(storageFns).forEach((fn) => fn.mockClear());
  vi.resetModules();
  ({ useDraftStore } = await import('@/lib/draftStore'));
});

describe('draft store', () => {
  test('upsertDraft clones input data and increments revision', () => {
    const original = promptDraftData();
    const store = useDraftStore.getState();

    const saved = store.upsertDraft({ id: 'draft-1', type: 'prompt', data: original });
    expect(saved.revision).toBe(1);
    expect(useDraftStore.getState().drafts['draft-1'].data).toEqual(original);

    original.title = 'mutated';
    expect(useDraftStore.getState().drafts['draft-1'].data.title).toBe('Draft title');
  });

  test('pruneExpired removes drafts past TTL and clears conflicts', () => {
    const store = useDraftStore.getState();
    const first = store.upsertDraft({ id: 'expire-me', type: 'prompt', data: promptDraftData() });
    const second = store.upsertDraft({ id: 'stay', type: 'prompt', data: promptDraftData() });

    useDraftStore.setState((state) => ({
      drafts: {
        ...state.drafts,
        [first.id]: { ...state.drafts[first.id], expiresAt: Date.now() - 1 },
      },
      conflicts: {
        ...state.conflicts,
        [first.id]: {
          id: first.id,
          detectedAt: Date.now(),
          remote: state.drafts[first.id],
          reason: 'remote-newer',
        } satisfies DraftConflict,
      },
    }));

    const removed = store.pruneExpired(Date.now());
    expect(removed).toEqual(['expire-me']);
    expect(useDraftStore.getState().drafts).not.toHaveProperty('expire-me');
    expect(useDraftStore.getState().drafts).toHaveProperty('stay');
    expect(useDraftStore.getState().conflicts).not.toHaveProperty('expire-me');
    expect(useDraftStore.getState().drafts['stay'].expiresAt).toBe(second.expiresAt);
  });

  test('markConflict and clearConflict manage conflict map', () => {
    const store = useDraftStore.getState();
    const saved = store.upsertDraft({ id: 'conflict', type: 'prompt', data: promptDraftData() });
    const conflict: DraftConflict = {
      id: saved.id,
      detectedAt: Date.now(),
      remote: saved,
      reason: 'remote-newer',
    };

    store.markConflict(conflict);
    expect(useDraftStore.getState().conflicts[saved.id]).toEqual(conflict);

    store.clearConflict(saved.id);
    expect(useDraftStore.getState().conflicts[saved.id]).toBeUndefined();
  });
});
