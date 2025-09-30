import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { PICKER_TRIGGERS, type PickerTrigger } from './constants';
import { createChromeSyncStateStorage } from './storage/chromeStateStorage';
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './storage/constants';
import { withEnvelope } from './storage/envelopeStateStorage';
import { subscribeToStorageKey } from './storage/storageEvents';
import type { PersistMeta } from './storage/types';
import { defaultCleanOptions, type CleanOptions } from './textCleaner';

type CleanerPrefs = {
  tidyStructure: CleanOptions['tidyStructure'];
  tone: CleanOptions['tone'];
  preserveCodeBlocks: CleanOptions['preserveCodeBlocks'];
  stripSymbols: CleanOptions['stripSymbols'];
  redactContacts: CleanOptions['redactContacts'];
  transliterateLatin: CleanOptions['transliterateLatin'];
  ellipsisMode: CleanOptions['ellipsisMode'];
  symbolMap: Record<string, string>;
  aiPhraseBlacklist: string[];
};

const cleanerOptionsSchema = z
  .object({
    tidyStructure: z.boolean().default(defaultCleanOptions.tidyStructure),
    tone: z.enum(['off', 'gentle', 'assertive']).default(defaultCleanOptions.tone),
    preserveCodeBlocks: z.boolean().default(defaultCleanOptions.preserveCodeBlocks),
    stripSymbols: z.boolean().default(defaultCleanOptions.stripSymbols),
    redactContacts: z.boolean().default(defaultCleanOptions.redactContacts),
    transliterateLatin: z.boolean().default(defaultCleanOptions.transliterateLatin),
    ellipsisMode: z.enum(['dots', 'dot']).default(defaultCleanOptions.ellipsisMode),
    symbolMap: z.record(z.string(), z.string()).default({}),
    aiPhraseBlacklist: z.array(z.string()).default([]),
  })
  .default({
    tidyStructure: defaultCleanOptions.tidyStructure,
    tone: defaultCleanOptions.tone,
    preserveCodeBlocks: defaultCleanOptions.preserveCodeBlocks,
    stripSymbols: defaultCleanOptions.stripSymbols,
    redactContacts: defaultCleanOptions.redactContacts,
    transliterateLatin: defaultCleanOptions.transliterateLatin,
    ellipsisMode: defaultCleanOptions.ellipsisMode,
    symbolMap: {},
    aiPhraseBlacklist: [],
  });

const pickerTriggerSchema = z.enum(PICKER_TRIGGERS);

const developerPrefsSchema = z
  .object({
    syncFallback: z.boolean().default(false),
    lastSyncFallbackAt: z.number().int().nonnegative().optional(),
    lastSyncFallbackReason: z.string().optional(),
  })
  .default({ syncFallback: false });

const persistedPrefsSchema = z.object({
  pickerTrigger: pickerTriggerSchema.default('doubleSlash'),
  onboardingDismissed: z.boolean().default(false),
  cleanerOptions: cleanerOptionsSchema,
  developer: developerPrefsSchema,
  syncFallback: z.boolean().default(false),
  cleanerTipsVisible: z.boolean().default(true),
});

function sanitizeTrigger(value: unknown): PickerTrigger {
  return pickerTriggerSchema.safeParse(value).success ? (value as PickerTrigger) : 'doubleSlash';
}

function sanitizeCleanerOptions(value: unknown): CleanerPrefs {
  const base = defaultPersistSlice().cleanerOptions;
  if (!value || typeof value !== 'object') return base;

  const next: Partial<CleanerPrefs> = {};
  const candidate = value as Record<string, unknown>;

  const boolKeys: Array<keyof CleanerPrefs> = ['tidyStructure', 'preserveCodeBlocks', 'stripSymbols', 'redactContacts', 'transliterateLatin'];
  boolKeys.forEach((key) => {
    if (typeof candidate[key] === 'boolean') {
      next[key] = candidate[key] as any;
    }
  });

  if (typeof candidate.tone === 'string' && ['off', 'gentle', 'assertive'].includes(candidate.tone)) {
    next.tone = candidate.tone as CleanerPrefs['tone'];
  } else if (candidate.removeAIMarkers && typeof candidate.removeAIMarkers === 'object') {
    const legacyTone = candidate.removeAIMarkers as Record<string, unknown>;
    if (legacyTone.aggressive) next.tone = 'assertive';
    else if (legacyTone.conservative) next.tone = 'gentle';
    else next.tone = 'off';
  }

  if (typeof candidate.ellipsisMode === 'string' && ['dots', 'dot'].includes(candidate.ellipsisMode)) {
    next.ellipsisMode = candidate.ellipsisMode as CleanerPrefs['ellipsisMode'];
  }

  if (Array.isArray(candidate.aiPhraseBlacklist)) {
    next.aiPhraseBlacklist = candidate.aiPhraseBlacklist.filter((item): item is string => typeof item === 'string');
  }

  if (candidate.symbolMap && typeof candidate.symbolMap === 'object') {
    const entries = Object.entries(candidate.symbolMap as Record<string, unknown>).filter(([, v]) => typeof v === 'string');
    next.symbolMap = Object.fromEntries(entries) as Record<string, string>;
  }

  if (typeof candidate.flattenMarkdown === 'boolean') next.tidyStructure = candidate.flattenMarkdown as boolean;
  if (typeof candidate.stripNonKeyboardSymbols === 'boolean') next.stripSymbols = candidate.stripNonKeyboardSymbols as boolean;
  if (typeof candidate.redactURLs === 'boolean') next.redactContacts = candidate.redactURLs as boolean;
  if (typeof candidate.transliterateDiacritics === 'boolean') next.transliterateLatin = candidate.transliterateDiacritics as boolean;

  if (Object.keys(next).length === 0) {
    return base;
  }

  return mergeCleanerOptions(base, next);
}

async function importLegacyPrefs(): Promise<PersistedPrefsSlice | null> {
  const globalObj: any = typeof globalThis !== 'undefined' ? globalThis : {};
  const browserApi = globalObj.browser ?? globalObj.chrome;
  if (!browserApi?.storage) return null;

  async function readKey(area: 'sync' | 'local', key: string): Promise<any | null> {
    try {
      const storageArea = browserApi.storage?.[area];
      if (!storageArea) return null;
      const result = await storageArea.get(key);
      if (result && key in result) {
        return result[key];
      }
    } catch {
      // ignore
    }
    return null;
  }

  const legacy = (await readKey('sync', 'dd_prefs')) ?? (await readKey('local', 'dd_prefs'));
  if (!legacy || typeof legacy !== 'object') {
    return null;
  }

  const base = defaultPersistSlice();
  const cleaner = sanitizeCleanerOptions((legacy as any).cleanerOptions ?? legacy);
  const merged: PersistedPrefsSlice = {
    pickerTrigger: sanitizeTrigger((legacy as any).pickerTrigger),
    onboardingDismissed: Boolean((legacy as any).onboardingDismissed),
    cleanerOptions: cleaner,
    developer: { ...base.developer },
    syncFallback: false,
    cleanerTipsVisible: typeof (legacy as any).cleanerTipsVisible === 'boolean' ? Boolean((legacy as any).cleanerTipsVisible) : true,
    _persistMeta: stampMeta(typeof (legacy as any).updatedAt === 'number' ? (legacy as any).updatedAt : Date.now()),
  };

  return merged;
}

export type PersistedPrefsSlice = z.infer<typeof persistedPrefsSchema> & {
  _persistMeta: PersistMeta;
};

interface PreferencesState extends PersistedPrefsSlice {
  _rehydrated: boolean;
  setPickerTrigger: (trigger: PickerTrigger) => void;
  dismissOnboarding: () => void;
  setCleanerOptions: (update: Partial<CleanerPrefs>) => void;
  markSyncFallback: (reason?: string) => void;
  resetSyncFallback: () => void;
  setCleanerTipsVisible: (visible: boolean) => void;
  markRehydrated: () => void;
}

function stampMeta(updatedAt: number = Date.now()): PersistMeta {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION.prefs,
    updatedAt,
  };
}

const defaultPersistSlice = (): PersistedPrefsSlice => ({
  pickerTrigger: 'doubleSlash',
  onboardingDismissed: false,
  cleanerOptions: {
    tidyStructure: defaultCleanOptions.tidyStructure,
    tone: defaultCleanOptions.tone,
    preserveCodeBlocks: defaultCleanOptions.preserveCodeBlocks,
    stripSymbols: defaultCleanOptions.stripSymbols,
    redactContacts: defaultCleanOptions.redactContacts,
    transliterateLatin: defaultCleanOptions.transliterateLatin,
    ellipsisMode: defaultCleanOptions.ellipsisMode,
    symbolMap: {},
    aiPhraseBlacklist: [],
  },
  developer: {
    syncFallback: false,
  },
  syncFallback: false,
  cleanerTipsVisible: true,
  _persistMeta: stampMeta(0),
});

function normalizeMeta(meta: unknown, fallbackUpdatedAt?: number): PersistMeta {
  if (meta && typeof meta === 'object') {
    const schemaVersion = typeof (meta as any).schemaVersion === 'number' ? (meta as any).schemaVersion : STORAGE_SCHEMA_VERSION.prefs;
    const updatedAt = typeof (meta as any).updatedAt === 'number' ? (meta as any).updatedAt : fallbackUpdatedAt ?? Date.now();
    return {
      schemaVersion,
      updatedAt,
    } satisfies PersistMeta;
  }
  return stampMeta(fallbackUpdatedAt ?? Date.now());
}

function parsePersistedPrefs(state: unknown, fallbackUpdatedAt?: number): PersistedPrefsSlice {
  const result = persistedPrefsSchema.safeParse(state);
  if (!result.success) {
    const meta = normalizeMeta((state as any)?._persistMeta, fallbackUpdatedAt);
    return {
      ...defaultPersistSlice(),
      _persistMeta: meta,
    };
  }
  const parsed = result.data;
  return {
    ...parsed,
    cleanerOptions: {
      tidyStructure: parsed.cleanerOptions.tidyStructure,
      tone: parsed.cleanerOptions.tone,
      preserveCodeBlocks: parsed.cleanerOptions.preserveCodeBlocks,
      stripSymbols: parsed.cleanerOptions.stripSymbols,
      redactContacts: parsed.cleanerOptions.redactContacts,
      transliterateLatin: parsed.cleanerOptions.transliterateLatin,
      ellipsisMode: parsed.cleanerOptions.ellipsisMode,
      symbolMap: parsed.cleanerOptions.symbolMap,
      aiPhraseBlacklist: parsed.cleanerOptions.aiPhraseBlacklist,
    },
    developer: parsed.developer,
    syncFallback: parsed.syncFallback,
    _persistMeta: normalizeMeta((state as any)?._persistMeta, fallbackUpdatedAt),
  } satisfies PersistedPrefsSlice;
}

function mergeCleanerOptions(current: CleanerPrefs, update: Partial<CleanerPrefs>): CleanerPrefs {
  const next: CleanerPrefs = {
    ...current,
    ...update,
    symbolMap: { ...current.symbolMap, ...(update.symbolMap ?? {}) },
    aiPhraseBlacklist: Array.isArray(update.aiPhraseBlacklist)
      ? update.aiPhraseBlacklist.filter((value): value is string => typeof value === 'string')
      : [...current.aiPhraseBlacklist],
  };
  return next;
}

const initialState = defaultPersistSlice();

const usePrefsStoreInternal = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...initialState,
      _rehydrated: false,
      setPickerTrigger: (trigger) => {
        if (!pickerTriggerSchema.safeParse(trigger).success) return;
        set({
          pickerTrigger: trigger,
          _persistMeta: stampMeta(),
          developer: { ...get().developer, syncFallback: false },
          syncFallback: false,
        });
      },
      dismissOnboarding: () => {
        if (get().onboardingDismissed) return;
        set({ onboardingDismissed: true, _persistMeta: stampMeta() });
      },
      setCleanerOptions: (update) => {
        const current = get().cleanerOptions;
        set({
          cleanerOptions: mergeCleanerOptions(current, update),
          _persistMeta: stampMeta(),
        });
      },
      setCleanerTipsVisible: (visible) => {
        set({
          cleanerTipsVisible: Boolean(visible),
          _persistMeta: stampMeta(),
        });
      },
      markSyncFallback: (reason) => {
        set({
          developer: {
            ...get().developer,
            syncFallback: true,
            lastSyncFallbackAt: Date.now(),
            lastSyncFallbackReason: reason,
          },
          syncFallback: true,
          _persistMeta: stampMeta(),
        });
      },
      resetSyncFallback: () => {
        set({
          developer: {
            ...get().developer,
            syncFallback: false,
            lastSyncFallbackReason: undefined,
          },
          syncFallback: false,
          _persistMeta: stampMeta(),
        });
      },
      markRehydrated: () => set({ _rehydrated: true }),
    }),
    {
      name: STORAGE_KEYS.prefs,
      version: STORAGE_SCHEMA_VERSION.prefs,
      storage: createJSONStorage(() =>
        withEnvelope(
          createChromeSyncStateStorage((_, __, error) => {
            usePrefsStoreInternal.setState((state) => ({
              developer: {
                ...state.developer,
                syncFallback: true,
                lastSyncFallbackAt: Date.now(),
                lastSyncFallbackReason: error instanceof Error ? error.message : String(error ?? 'unknown'),
              },
              syncFallback: true,
              _persistMeta: stampMeta(),
            }));
          }),
          STORAGE_SCHEMA_VERSION.prefs,
        ),
      ),
      partialize: (state) => ({
        pickerTrigger: state.pickerTrigger,
        onboardingDismissed: state.onboardingDismissed,
        cleanerOptions: state.cleanerOptions,
        developer: state.developer,
        syncFallback: state.syncFallback,
        cleanerTipsVisible: state.cleanerTipsVisible,
        _persistMeta: state._persistMeta,
      }),
      merge: (persistedState, currentState) => {
        const parsed = parsePersistedPrefs(persistedState);
        return {
          ...currentState,
          ...parsed,
          cleanerOptions: mergeCleanerOptions(currentState.cleanerOptions, parsed.cleanerOptions),
          developer: {
            ...currentState.developer,
            ...parsed.developer,
          },
          syncFallback: parsed.syncFallback ?? currentState.syncFallback,
        } satisfies PreferencesState;
      },
      migrate: async (persistedState: unknown, persistedVersion) => {
        if (persistedVersion >= STORAGE_SCHEMA_VERSION.prefs && persistedState != null) {
          return parsePersistedPrefs(persistedState);
        }

        try {
          if (persistedState != null) {
            const migrated = parsePersistedPrefs(persistedState);
            return migrated;
          }
        } catch {
          // fall through to legacy import / defaults
        }

        const legacy = await importLegacyPrefs();
        if (legacy) {
          return legacy;
        }

        return defaultPersistSlice();
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          usePrefsStoreInternal.setState({ _rehydrated: true });
          return;
        }
        if (state) {
          usePrefsStoreInternal.setState({ _rehydrated: true });
        }
      },
    },
  ),
);

const selectPersistSlice = (state: PreferencesState): PersistedPrefsSlice => ({
  pickerTrigger: state.pickerTrigger,
  onboardingDismissed: state.onboardingDismissed,
  cleanerOptions: state.cleanerOptions,
  developer: state.developer,
  syncFallback: state.syncFallback,
  cleanerTipsVisible: state.cleanerTipsVisible,
  _persistMeta: state._persistMeta,
});

subscribeToStorageKey<PersistedPrefsSlice>(STORAGE_KEYS.prefs, (envelope) => {
  const current = usePrefsStoreInternal.getState();
  const incoming = parsePersistedPrefs(envelope.state, envelope.updatedAt);
  const currentMeta = current._persistMeta ?? stampMeta(0);
  const incomingMeta = incoming._persistMeta ?? stampMeta(envelope.updatedAt);

  if (envelope.updatedAt < currentMeta.updatedAt) {
    return;
  }

  const currentSlice = selectPersistSlice(current);
  const currentJson = JSON.stringify({ ...currentSlice, _persistMeta: undefined });
  const incomingJson = JSON.stringify({ ...incoming, _persistMeta: undefined });
  if (currentJson === incomingJson) {
    return;
  }

  usePrefsStoreInternal.setState({
    pickerTrigger: incoming.pickerTrigger,
    onboardingDismissed: incoming.onboardingDismissed,
    cleanerOptions: incoming.cleanerOptions,
    developer: {
      ...current.developer,
      ...incoming.developer,
    },
    syncFallback: incoming.syncFallback,
    cleanerTipsVisible: typeof incoming.cleanerTipsVisible === 'boolean' ? incoming.cleanerTipsVisible : current.cleanerTipsVisible,
    _persistMeta: {
      schemaVersion: incomingMeta.schemaVersion,
      updatedAt: envelope.updatedAt,
    },
  });
});

export const usePrefsStore = usePrefsStoreInternal;

export async function waitForPrefsHydration(timeoutMs: number = 2000): Promise<boolean> {
  const persistApi = usePrefsStoreInternal.persist;
  if (!persistApi) return true;
  if (persistApi.hasHydrated?.()) return true;

  try {
    await persistApi.rehydrate?.();
  } catch {
    // ignore; we'll still wait on finish event or timeout
  }

  if (persistApi.hasHydrated?.()) return true;

  return await new Promise<boolean>((resolve) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      resolved = true;
    };
    const unsub = persistApi.onFinishHydration?.(() => {
      if (resolved) return;
      cleanup();
      unsub?.();
      resolve(true);
    });
    timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      unsub?.();
      resolve(false);
    }, timeoutMs);
  });
}

export function getPrefsSnapshot(): PersistedPrefsSlice {
  const state = usePrefsStoreInternal.getState();
  return {
    pickerTrigger: state.pickerTrigger,
    onboardingDismissed: state.onboardingDismissed,
    cleanerOptions: {
      tidyStructure: state.cleanerOptions.tidyStructure,
      tone: state.cleanerOptions.tone,
      preserveCodeBlocks: state.cleanerOptions.preserveCodeBlocks,
      stripSymbols: state.cleanerOptions.stripSymbols,
      redactContacts: state.cleanerOptions.redactContacts,
      transliterateLatin: state.cleanerOptions.transliterateLatin,
      ellipsisMode: state.cleanerOptions.ellipsisMode,
      symbolMap: { ...state.cleanerOptions.symbolMap },
      aiPhraseBlacklist: [...state.cleanerOptions.aiPhraseBlacklist],
    },
    developer: { ...state.developer },
    syncFallback: state.syncFallback,
    cleanerTipsVisible: state.cleanerTipsVisible,
    _persistMeta: { ...state._persistMeta },
  } satisfies PersistedPrefsSlice;
}