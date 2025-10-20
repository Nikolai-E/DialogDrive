import { beforeEach, describe, expect, test, vi } from 'vitest';

import { defaultCleanOptions } from '@/lib/textCleaner';

const localState = new Map<string, string>();
const syncState = new Map<string, string>();

const createStorageFns = (state: Map<string, string>) => ({
  getItem: vi.fn(async (name: string) => state.get(name) ?? null),
  setItem: vi.fn(async (name: string, value: string) => {
    state.set(name, value);
  }),
  removeItem: vi.fn(async (name: string) => {
    state.delete(name);
  }),
});

const chromeLocalStateStorage = createStorageFns(localState);

vi.mock('@/lib/storage/chromeStateStorage', () => ({
  chromeLocalStateStorage,
  createChromeSyncStateStorage: (
    _onFallback?: (name: string, value: string, error: unknown) => void
  ) => createStorageFns(syncState),
}));

vi.mock('@/lib/storage/storageEvents', () => ({
  subscribeToStorageKey: vi.fn(() => () => {}),
}));

let usePrefsStore: typeof import('@/lib/prefsStore').usePrefsStore;

beforeEach(async () => {
  localState.clear();
  syncState.clear();
  Object.values(chromeLocalStateStorage).forEach((fn) => (fn as any).mockClear?.());
  vi.resetModules();
  ({ usePrefsStore } = await import('@/lib/prefsStore'));
});

describe('prefs store', () => {
  test('setPickerTrigger accepts valid values and rejects invalid ones', () => {
    const store = usePrefsStore.getState();
    store.setPickerTrigger('backslash');
    expect(usePrefsStore.getState().pickerTrigger).toBe('backslash');

    store.setPickerTrigger('invalid' as any);
    expect(usePrefsStore.getState().pickerTrigger).toBe('backslash');
  });

  test('setCleanerOptions merges overrides while preserving defaults', () => {
    const store = usePrefsStore.getState();
    store.setCleanerOptions({
      preset: 'email',
      structure: { ...defaultCleanOptions.structure, dropHeadings: false },
    });
    const prefs = usePrefsStore.getState().cleanerOptions;
    expect(prefs.preset).toBe('custom');
    expect(prefs.structure.dropHeadings).toBe(false);
    expect(defaultCleanOptions.structure.dropHeadings).toBe(true);
  });

  test('markSyncFallback and resetSyncFallback toggle flags', () => {
    const store = usePrefsStore.getState();
    store.markSyncFallback('rate limited');

    const stateAfterMark = usePrefsStore.getState();
    expect(stateAfterMark.developer.syncFallback).toBe(true);
    expect(stateAfterMark.syncFallback).toBe(true);
    expect(stateAfterMark.developer.lastSyncFallbackReason).toBe('rate limited');

    store.resetSyncFallback();
    const stateAfterReset = usePrefsStore.getState();
    expect(stateAfterReset.developer.syncFallback).toBe(false);
    expect(stateAfterReset.syncFallback).toBe(false);
    expect(stateAfterReset.developer.lastSyncFallbackReason).toBeUndefined();
  });
});
