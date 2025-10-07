import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { chromeLocalStateStorage } from './storage/chromeStateStorage';
import { DRAFT_LIMITS, STORAGE_KEYS, STORAGE_SCHEMA_VERSION } from './storage/constants';
import { withEnvelope } from './storage/envelopeStateStorage';
import { subscribeToStorageKey } from './storage/storageEvents';
import type { PersistMeta } from './storage/types';

export type DraftKind = 'prompt' | 'chat';

export interface PromptDraftData {
  title: string;
  text: string;
  workspace: string;
  tags: string[];
  includeTimestamp: boolean;
}

export interface ChatDraftData {
  title: string;
  url: string;
  workspace: string;
  tags: string[];
  platform: 'chatgpt' | 'gemini' | 'claude' | 'deepseek';
  isPinned: boolean;
}

export type DraftDataMap = {
  prompt: PromptDraftData;
  chat: ChatDraftData;
};

export type DraftData<K extends DraftKind = DraftKind> = DraftDataMap[K];

export interface DraftRecord<K extends DraftKind = DraftKind> {
  id: string;
  type: K;
  data: DraftData<K>;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  revision: number;
  lastClientId: string;
}

export interface DraftConflict {
  id: string;
  detectedAt: number;
  remote: DraftRecord;
  local?: DraftRecord;
  reason: 'remote-newer';
}

interface PersistedDraftSlice {
  drafts: Record<string, DraftRecord>;
  _persistMeta: PersistMeta;
}

interface DraftState extends PersistedDraftSlice {
  _rehydrated: boolean;
  clientId: string;
  conflicts: Record<string, DraftConflict>;
  upsertDraft: <K extends DraftKind>(input: {
    id: string;
    type: K;
    data: DraftData<K>;
    touchOnly?: boolean;
  }) => DraftRecord<K>;
  hydrateDraft: (id: string, draft: DraftRecord) => void;
  removeDraft: (id: string) => void;
  finalizeDraft: (id: string, finalize: () => Promise<void>) => Promise<void>;
  pruneExpired: (now?: number) => string[];
  markConflict: (conflict: DraftConflict) => void;
  clearConflict: (id: string) => void;
  markRehydrated: () => void;
}

const SCHEMA_VERSION = STORAGE_SCHEMA_VERSION.drafts;

const stampMeta = (updatedAt: number = Date.now()): PersistMeta => ({
  schemaVersion: SCHEMA_VERSION,
  updatedAt,
});

const defaultState = (): PersistedDraftSlice => ({
  drafts: {},
  _persistMeta: stampMeta(0),
});

const CLIENT_ID = (() => {
  const g: any = typeof globalThis !== 'undefined' ? globalThis : {};
  const cryptoImpl = g.crypto;
  if (cryptoImpl?.randomUUID) {
    return cryptoImpl.randomUUID();
  }
  return `client-${Math.random().toString(36).slice(2, 10)}`;
})();

function cloneDraftData<T>(data: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data)) as T;
}

function pruneDraftMap(
  drafts: Record<string, DraftRecord>,
  now: number
): { map: Record<string, DraftRecord>; removed: string[] } {
  const entries = Object.values(drafts);
  const alive = entries.filter((draft) => draft.expiresAt > now);
  alive.sort((a, b) => b.updatedAt - a.updatedAt);
  const limited = alive.slice(0, DRAFT_LIMITS.maxItems);
  const keepIds = new Set(limited.map((draft) => draft.id));
  const nextMap: Record<string, DraftRecord> = {};
  limited.forEach((draft) => {
    nextMap[draft.id] = draft;
  });
  const removed = entries.filter((draft) => !keepIds.has(draft.id)).map((draft) => draft.id);
  return { map: nextMap, removed };
}

function parsePersistedDrafts(input: unknown): PersistedDraftSlice {
  if (!input || typeof input !== 'object') return defaultState();
  const candidate = input as Partial<PersistedDraftSlice>;
  if (!candidate.drafts || typeof candidate.drafts !== 'object') {
    return defaultState();
  }
  const drafts: Record<string, DraftRecord> = {};
  for (const [id, value] of Object.entries(candidate.drafts)) {
    if (!value || typeof value !== 'object') continue;
    const draft = value as DraftRecord;
    if (!draft.id || typeof draft.id !== 'string') continue;
    if (draft.type !== 'prompt' && draft.type !== 'chat') continue;
    if (typeof draft.updatedAt !== 'number') continue;
    drafts[id] = {
      ...draft,
      data: draft.data,
      lastClientId: typeof draft.lastClientId === 'string' ? draft.lastClientId : '',
      revision: typeof draft.revision === 'number' ? draft.revision : 0,
      createdAt: typeof draft.createdAt === 'number' ? draft.createdAt : draft.updatedAt,
      expiresAt:
        typeof draft.expiresAt === 'number'
          ? draft.expiresAt
          : draft.updatedAt + DRAFT_LIMITS.ttlMs,
    } as DraftRecord;
  }
  return {
    drafts,
    _persistMeta: candidate._persistMeta ?? stampMeta(0),
  };
}

const useDraftStoreInternal = create<DraftState>()(
  persist(
    (set, get) => ({
      ...defaultState(),
      _rehydrated: false,
      clientId: CLIENT_ID,
      conflicts: {},
      upsertDraft: ({ id, type, data, touchOnly }) => {
        const now = Date.now();
        const existing = get().drafts[id];
        const draft: DraftRecord = {
          id,
          type,
          data: touchOnly && existing ? existing.data : cloneDraftData(data),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          expiresAt: now + DRAFT_LIMITS.ttlMs,
          revision: (existing?.revision ?? 0) + (touchOnly ? 0 : 1),
          lastClientId: get().clientId,
        };

        const nextDrafts = {
          ...get().drafts,
          [id]: draft,
        };

        const { map, removed } = pruneDraftMap(nextDrafts, now);
        const nextConflicts = { ...get().conflicts };
        removed.forEach((removedId) => {
          delete nextConflicts[removedId];
        });
        delete nextConflicts[id];

        set({
          drafts: map,
          conflicts: nextConflicts,
          _persistMeta: stampMeta(now),
        });

        return draft as DraftRecord<typeof type>;
      },
      hydrateDraft: (id, draft) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [id]: draft,
          },
          _persistMeta: stampMeta(),
        }));
      },
      removeDraft: (id) => {
        const drafts = { ...get().drafts };
        if (!(id in drafts)) return;
        delete drafts[id];
        const conflicts = { ...get().conflicts };
        delete conflicts[id];
        set({
          drafts,
          conflicts,
          _persistMeta: stampMeta(),
        });
      },
      finalizeDraft: async (id, finalize) => {
        await finalize();
        get().removeDraft(id);
      },
      pruneExpired: (timestamp) => {
        const now = timestamp ?? Date.now();
        const { map, removed } = pruneDraftMap(get().drafts, now);
        if (removed.length === 0) return [];
        const conflicts = { ...get().conflicts };
        removed.forEach((rid) => delete conflicts[rid]);
        set({ drafts: map, conflicts, _persistMeta: stampMeta(now) });
        return removed;
      },
      markConflict: (conflict) => {
        set((state) => ({
          conflicts: {
            ...state.conflicts,
            [conflict.id]: conflict,
          },
        }));
      },
      clearConflict: (id) => {
        set((state) => {
          if (!(id in state.conflicts)) return state;
          const next = { ...state.conflicts };
          delete next[id];
          return { conflicts: next } as Partial<DraftState>;
        });
      },
      markRehydrated: () => set({ _rehydrated: true }),
    }),
    {
      name: STORAGE_KEYS.drafts,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => withEnvelope(chromeLocalStateStorage, SCHEMA_VERSION)),
      partialize: (state) => ({
        drafts: state.drafts,
        _persistMeta: state._persistMeta,
      }),
      merge: (persistedState, currentState) => {
        const incoming = parsePersistedDrafts(persistedState);
        return {
          ...currentState,
          drafts: incoming.drafts,
          _persistMeta: incoming._persistMeta,
        };
      },
      migrate: async (persistedState: unknown) => parsePersistedDrafts(persistedState),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          useDraftStoreInternal.setState({ _rehydrated: true });
          return;
        }
        if (state) {
          useDraftStoreInternal.setState({ _rehydrated: true });
        }
      },
    }
  )
);

subscribeToStorageKey<PersistedDraftSlice>(STORAGE_KEYS.drafts, (envelope) => {
  const store = useDraftStoreInternal.getState();
  const currentMeta = store._persistMeta ?? stampMeta(0);
  if (envelope.updatedAt <= currentMeta.updatedAt) {
    return;
  }

  const incoming = parsePersistedDrafts(envelope.state);
  const localDrafts = store.drafts;
  const nextDrafts: Record<string, DraftRecord> = { ...localDrafts };
  const nextConflicts: Record<string, DraftConflict> = { ...store.conflicts };

  for (const [id, remote] of Object.entries(incoming.drafts)) {
    const local = localDrafts[id];
    if (!local || remote.updatedAt >= local.updatedAt) {
      nextDrafts[id] = remote;
      if (local && remote.updatedAt > local.updatedAt && remote.lastClientId !== store.clientId) {
        nextConflicts[id] = {
          id,
          detectedAt: Date.now(),
          remote,
          local,
          reason: 'remote-newer',
        };
      }
    }
  }

  for (const id of Object.keys(localDrafts)) {
    if (!(id in incoming.drafts)) {
      delete nextDrafts[id];
      delete nextConflicts[id];
    }
  }

  useDraftStoreInternal.setState({
    drafts: nextDrafts,
    conflicts: nextConflicts,
    _persistMeta: {
      schemaVersion: incoming._persistMeta.schemaVersion,
      updatedAt: envelope.updatedAt,
    },
  });
});

export const useDraftStore = useDraftStoreInternal;

export function getDraftSnapshot(id: string): DraftRecord | undefined {
  return useDraftStoreInternal.getState().drafts[id];
}

export async function waitForDraftsHydration(timeoutMs: number = 2000): Promise<boolean> {
  const persistApi = useDraftStoreInternal.persist;
  if (!persistApi) return true;
  if (persistApi.hasHydrated?.()) return true;
  try {
    await persistApi.rehydrate?.();
  } catch {
    // ignore
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

export function serializePromptDraft(data: PromptDraftData): PromptDraftData {
  return {
    title: data.title ?? '',
    text: data.text ?? '',
    workspace: data.workspace ?? 'General',
    tags: Array.isArray(data.tags) ? [...data.tags] : [],
    includeTimestamp: Boolean(data.includeTimestamp),
  };
}

export function serializeChatDraft(data: ChatDraftData): ChatDraftData {
  return {
    title: data.title ?? '',
    url: data.url ?? '',
    workspace: data.workspace ?? 'General',
    tags: Array.isArray(data.tags) ? [...data.tags] : [],
    platform: data.platform ?? 'chatgpt',
    isPinned: Boolean(data.isPinned),
  };
}
