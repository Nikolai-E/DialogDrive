import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { PICKER_TRIGGERS, type PickerTrigger } from './constants';
import { createChromeSyncStateStorage } from './storage/chromeStateStorage';
import { STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './storage/constants';
import { withEnvelope } from './storage/envelopeStateStorage';
import { subscribeToStorageKey } from './storage/storageEvents';
import type { PersistMeta } from './storage/types';
import { defaultCleanOptions, resolveCleanOptions, type CleanOptions } from './textCleaner';

type CleanerPrefs = CleanOptions;

const presetSchema = z.enum(['plain', 'email', 'markdown-slim', 'chat', 'custom']);
const linkModeSchema = z.enum(['keepMarkdown', 'textWithUrl', 'textOnly']);
const listModeSchema = z.enum(['unwrapToSentences', 'keepBullets', 'keepNumbers']);
const inlineCodeSchema = z.enum(['keepMarkers', 'stripMarkers']);
const blockCodeSchema = z.enum(['drop', 'indent']);

const punctuationSchema = z
  .object({
    mapEmDash: z
      .enum(['comma', 'hyphen', 'keep'])
      .default(defaultCleanOptions.punctuation.mapEmDash),
    mapEnDash: z.enum(['hyphen', 'keep']).default(defaultCleanOptions.punctuation.mapEnDash),
    curlyQuotes: z.enum(['straight', 'keep']).default(defaultCleanOptions.punctuation.curlyQuotes),
    ellipsis: z.enum(['dots', 'keep', 'remove']).default(defaultCleanOptions.punctuation.ellipsis),
  })
  .default(defaultCleanOptions.punctuation);

const structureSchema = z
  .object({
    dropHeadings: z.boolean().default(defaultCleanOptions.structure.dropHeadings),
    dropTables: z.boolean().default(defaultCleanOptions.structure.dropTables),
    dropFootnotes: z.boolean().default(defaultCleanOptions.structure.dropFootnotes),
    dropBlockquotes: z.boolean().default(defaultCleanOptions.structure.dropBlockquotes),
    dropHorizontalRules: z.boolean().default(defaultCleanOptions.structure.dropHorizontalRules),
    stripEmojis: z.boolean().default(defaultCleanOptions.structure.stripEmojis),
    keepBasicMarkdown: z.boolean().default(defaultCleanOptions.structure.keepBasicMarkdown),
  })
  .default(defaultCleanOptions.structure);

const whitespaceSchema = z
  .object({
    collapseSpaces: z.boolean().default(defaultCleanOptions.whitespace.collapseSpaces),
    collapseBlankLines: z.boolean().default(defaultCleanOptions.whitespace.collapseBlankLines),
    trim: z.boolean().default(defaultCleanOptions.whitespace.trim),
    normalizeNbsp: z.boolean().default(defaultCleanOptions.whitespace.normalizeNbsp),
    ensureFinalNewline: z.boolean().default(defaultCleanOptions.whitespace.ensureFinalNewline),
  })
  .default(defaultCleanOptions.whitespace);

const cleanerOptionsSchema = z
  .object({
    preset: presetSchema.default(defaultCleanOptions.preset),
    locale: z.string().min(2).max(32).default(defaultCleanOptions.locale),
    linkMode: linkModeSchema.default(defaultCleanOptions.linkMode),
    listMode: listModeSchema.default(defaultCleanOptions.listMode),
    inlineCode: inlineCodeSchema.default(defaultCleanOptions.inlineCode),
    blockCode: blockCodeSchema.default(defaultCleanOptions.blockCode),
    redactContacts: z.boolean().default(defaultCleanOptions.redactContacts),
    punctuation: punctuationSchema,
    structure: structureSchema,
    whitespace: whitespaceSchema,
  })
  .default(defaultCleanOptions);

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
  const parsed = cleanerOptionsSchema.safeParse(value);
  if (parsed.success) {
    return cloneCleanOptions(parsed.data);
  }

  const legacy = migrateLegacyCleanerOptions(value);
  if (legacy) {
    return legacy;
  }

  return cloneCleanOptions(defaultCleanOptions);
}

function cloneCleanOptions(options: CleanOptions): CleanOptions {
  return {
    ...options,
    punctuation: { ...options.punctuation },
    structure: { ...options.structure },
    whitespace: { ...options.whitespace },
  } satisfies CleanOptions;
}

function migrateLegacyCleanerOptions(value: unknown): CleanerPrefs | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const hasLegacyKeys =
    'removeMarkdown' in candidate ||
    'removeAISigns' in candidate ||
    'removeEmojis' in candidate ||
    'ellipsisMode' in candidate;
  if (!hasLegacyKeys) return null;

  const wantsMarkdown = candidate.removeMarkdown === false;
  const preset = wantsMarkdown ? 'markdown-slim' : 'plain';
  const resolved = cloneCleanOptions(resolveCleanOptions({ preset }));

  if (wantsMarkdown) {
    resolved.structure.dropHeadings = false;
    resolved.structure.dropBlockquotes = false;
  }

  if (typeof candidate.preserveCodeBlocks === 'boolean' && candidate.preserveCodeBlocks === false) {
    resolved.blockCode = 'indent';
  }

  if (typeof candidate.ellipsisMode === 'string') {
    resolved.punctuation.ellipsis = candidate.ellipsisMode === 'dot' ? 'remove' : 'dots';
  }

  if (typeof candidate.redactContacts === 'boolean') {
    resolved.redactContacts = candidate.redactContacts;
  }

  if (typeof candidate.redactURLs === 'boolean') {
    resolved.redactContacts = resolved.redactContacts || Boolean(candidate.redactURLs);
  }

  if (typeof candidate.redactEmails === 'boolean') {
    resolved.redactContacts = resolved.redactContacts || Boolean(candidate.redactEmails);
  }

  resolved.preset = 'custom';
  return resolved;
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
    cleanerTipsVisible:
      typeof (legacy as any).cleanerTipsVisible === 'boolean'
        ? Boolean((legacy as any).cleanerTipsVisible)
        : true,
    _persistMeta: stampMeta(
      typeof (legacy as any).updatedAt === 'number' ? (legacy as any).updatedAt : Date.now()
    ),
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
  cleanerOptions: cloneCleanOptions(defaultCleanOptions),
  developer: {
    syncFallback: false,
  },
  syncFallback: false,
  cleanerTipsVisible: true,
  _persistMeta: stampMeta(0),
});

function normalizeMeta(meta: unknown, fallbackUpdatedAt?: number): PersistMeta {
  if (meta && typeof meta === 'object') {
    const schemaVersion =
      typeof (meta as any).schemaVersion === 'number'
        ? (meta as any).schemaVersion
        : STORAGE_SCHEMA_VERSION.prefs;
    const updatedAt =
      typeof (meta as any).updatedAt === 'number'
        ? (meta as any).updatedAt
        : (fallbackUpdatedAt ?? Date.now());
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
    cleanerOptions: cloneCleanOptions(parsed.cleanerOptions),
    developer: parsed.developer,
    syncFallback: parsed.syncFallback,
    _persistMeta: normalizeMeta((state as any)?._persistMeta, fallbackUpdatedAt),
  } satisfies PersistedPrefsSlice;
}

function mergeCleanerOptions(current: CleanerPrefs, update: Partial<CleanerPrefs>): CleanerPrefs {
  const presetUpdate = update.preset;
  const base =
    presetUpdate && presetUpdate !== 'custom'
      ? resolveCleanOptions({ preset: presetUpdate })
      : current;
  const next = cloneCleanOptions(base);

  let touched = false;

  if (
    typeof update.locale === 'string' &&
    update.locale.length > 0 &&
    update.locale !== next.locale
  ) {
    next.locale = update.locale;
    touched = true;
  }

  if (update.linkMode && update.linkMode !== next.linkMode) {
    next.linkMode = update.linkMode;
    touched = true;
  }

  if (update.listMode && update.listMode !== next.listMode) {
    next.listMode = update.listMode;
    touched = true;
  }

  if (update.inlineCode && update.inlineCode !== next.inlineCode) {
    next.inlineCode = update.inlineCode;
    touched = true;
  }

  if (update.blockCode && update.blockCode !== next.blockCode) {
    next.blockCode = update.blockCode;
    touched = true;
  }

  if (typeof update.redactContacts === 'boolean' && update.redactContacts !== next.redactContacts) {
    next.redactContacts = update.redactContacts;
    touched = true;
  }

  if (update.punctuation) {
    const { punctuation } = update;
    if (punctuation.mapEmDash && punctuation.mapEmDash !== next.punctuation.mapEmDash) {
      next.punctuation.mapEmDash = punctuation.mapEmDash;
      touched = true;
    }
    if (punctuation.mapEnDash && punctuation.mapEnDash !== next.punctuation.mapEnDash) {
      next.punctuation.mapEnDash = punctuation.mapEnDash;
      touched = true;
    }
    if (punctuation.curlyQuotes && punctuation.curlyQuotes !== next.punctuation.curlyQuotes) {
      next.punctuation.curlyQuotes = punctuation.curlyQuotes;
      touched = true;
    }
    if (punctuation.ellipsis && punctuation.ellipsis !== next.punctuation.ellipsis) {
      next.punctuation.ellipsis = punctuation.ellipsis;
      touched = true;
    }
  }

  if (update.structure) {
    const { structure } = update;
    if (
      typeof structure.dropHeadings === 'boolean' &&
      structure.dropHeadings !== next.structure.dropHeadings
    ) {
      next.structure.dropHeadings = structure.dropHeadings;
      touched = true;
    }
    if (
      typeof structure.dropTables === 'boolean' &&
      structure.dropTables !== next.structure.dropTables
    ) {
      next.structure.dropTables = structure.dropTables;
      touched = true;
    }
    if (
      typeof structure.dropFootnotes === 'boolean' &&
      structure.dropFootnotes !== next.structure.dropFootnotes
    ) {
      next.structure.dropFootnotes = structure.dropFootnotes;
      touched = true;
    }
    if (
      typeof structure.dropBlockquotes === 'boolean' &&
      structure.dropBlockquotes !== next.structure.dropBlockquotes
    ) {
      next.structure.dropBlockquotes = structure.dropBlockquotes;
      touched = true;
    }
    if (
      typeof structure.dropHorizontalRules === 'boolean' &&
      structure.dropHorizontalRules !== next.structure.dropHorizontalRules
    ) {
      next.structure.dropHorizontalRules = structure.dropHorizontalRules;
      touched = true;
    }
    if (
      typeof structure.stripEmojis === 'boolean' &&
      structure.stripEmojis !== next.structure.stripEmojis
    ) {
      next.structure.stripEmojis = structure.stripEmojis;
      touched = true;
    }
    if (
      typeof structure.keepBasicMarkdown === 'boolean' &&
      structure.keepBasicMarkdown !== next.structure.keepBasicMarkdown
    ) {
      next.structure.keepBasicMarkdown = structure.keepBasicMarkdown;
      touched = true;
    }
  }

  if (update.whitespace) {
    const { whitespace } = update;
    if (
      typeof whitespace.collapseSpaces === 'boolean' &&
      whitespace.collapseSpaces !== next.whitespace.collapseSpaces
    ) {
      next.whitespace.collapseSpaces = whitespace.collapseSpaces;
      touched = true;
    }
    if (
      typeof whitespace.collapseBlankLines === 'boolean' &&
      whitespace.collapseBlankLines !== next.whitespace.collapseBlankLines
    ) {
      next.whitespace.collapseBlankLines = whitespace.collapseBlankLines;
      touched = true;
    }
    if (typeof whitespace.trim === 'boolean' && whitespace.trim !== next.whitespace.trim) {
      next.whitespace.trim = whitespace.trim;
      touched = true;
    }
    if (
      typeof whitespace.normalizeNbsp === 'boolean' &&
      whitespace.normalizeNbsp !== next.whitespace.normalizeNbsp
    ) {
      next.whitespace.normalizeNbsp = whitespace.normalizeNbsp;
      touched = true;
    }
    if (
      typeof whitespace.ensureFinalNewline === 'boolean' &&
      whitespace.ensureFinalNewline !== next.whitespace.ensureFinalNewline
    ) {
      next.whitespace.ensureFinalNewline = whitespace.ensureFinalNewline;
      touched = true;
    }
  }

  if (presetUpdate === 'custom') {
    next.preset = 'custom';
  } else if (presetUpdate) {
    next.preset = touched ? 'custom' : presetUpdate;
  } else if (touched) {
    next.preset = 'custom';
  }

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
                lastSyncFallbackReason:
                  error instanceof Error ? error.message : String(error ?? 'unknown'),
              },
              syncFallback: true,
              _persistMeta: stampMeta(),
            }));
          }),
          STORAGE_SCHEMA_VERSION.prefs
        )
      ),
      partialize: (state) => ({
        pickerTrigger: state.pickerTrigger,
        onboardingDismissed: state.onboardingDismissed,
        cleanerOptions: cloneCleanOptions(state.cleanerOptions),
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
          cleanerOptions: cloneCleanOptions(parsed.cleanerOptions),
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
    }
  )
);

const selectPersistSlice = (state: PreferencesState): PersistedPrefsSlice => ({
  pickerTrigger: state.pickerTrigger,
  onboardingDismissed: state.onboardingDismissed,
  cleanerOptions: cloneCleanOptions(state.cleanerOptions),
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
    cleanerOptions: cloneCleanOptions(incoming.cleanerOptions),
    developer: {
      ...current.developer,
      ...incoming.developer,
    },
    syncFallback: incoming.syncFallback,
    cleanerTipsVisible:
      typeof incoming.cleanerTipsVisible === 'boolean'
        ? incoming.cleanerTipsVisible
        : current.cleanerTipsVisible,
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
    cleanerOptions: cloneCleanOptions(state.cleanerOptions),
    developer: { ...state.developer },
    syncFallback: state.syncFallback,
    cleanerTipsVisible: state.cleanerTipsVisible,
    _persistMeta: { ...state._persistMeta },
  } satisfies PersistedPrefsSlice;
}
