import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type DraftConflict,
  type DraftData,
  type DraftKind,
  type DraftRecord,
  useDraftStore,
  waitForDraftsHydration,
} from './draftStore';

interface UseAutosaveDraftOptions<K extends DraftKind> {
  id: string;
  type: K;
  data: DraftData<K>;
  enabled?: boolean;
  debounceMs?: number;
  fingerprint?: string;
  onHydrated?: (data: DraftData<K>, record: DraftRecord<K>) => void;
}

interface UseAutosaveDraftResult<K extends DraftKind> {
  hydrated: boolean;
  lastSavedAt?: number;
  conflict?: DraftConflict;
  saveImmediate: (payload?: DraftData<K>) => void;
  flush: () => Promise<void>;
  discard: () => void;
  clearConflict: () => void;
}

function cloneData<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function useAutosaveDraft<K extends DraftKind>(
  options: UseAutosaveDraftOptions<K>
): UseAutosaveDraftResult<K> {
  const { id, type, data, fingerprint, enabled = true, debounceMs = 320, onHydrated } = options;

  const hydratedRef = useRef(false);
  const lastSavedJsonRef = useRef<string | null>(null);
  const pendingRef = useRef<{ payload: DraftData<K>; json: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAtRef = useRef<number | undefined>(undefined);

  const upsertDraft = useDraftStore((state) => state.upsertDraft);
  const removeDraft = useDraftStore((state) => state.removeDraft);
  const clearConflictAction = useDraftStore((state) => state.clearConflict);
  const conflict = useDraftStore((state) => state.conflicts[id]);
  const storeHydrated = useDraftStore((state) => state._rehydrated);
  const [hydratedState, setHydratedState] = useState<boolean>(
    () => storeHydrated && hydratedRef.current
  );

  useEffect(() => {
    if (storeHydrated) return;
    void waitForDraftsHydration();
  }, [storeHydrated]);

  useEffect(() => {
    if (!storeHydrated) return;
    if (hydratedRef.current) {
      setHydratedState(true);
      return;
    }
    const existing = useDraftStore.getState().drafts[id] as DraftRecord<K> | undefined;
    if (existing) {
      const clone = cloneData(existing.data);
      lastSavedJsonRef.current = JSON.stringify(clone);
      lastSavedAtRef.current = existing.updatedAt;
      onHydrated?.(clone, existing);
    }
    hydratedRef.current = true;
    setHydratedState(true);
  }, [id, onHydrated, storeHydrated]);

  const saveNow = useCallback(
    (payload: DraftData<K>, json: string) => {
      if (!enabled) return;
      const record = upsertDraft({ id, type, data: payload });
      lastSavedJsonRef.current = json;
      lastSavedAtRef.current = record.updatedAt;
    },
    [enabled, id, type, upsertDraft]
  );

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      saveNow(pending.payload, pending.json);
    }
  }, [saveNow]);

  const schedule = useCallback(
    (payload: DraftData<K>) => {
      if (!enabled) return;
      const json = fingerprint ?? JSON.stringify(payload);
      if (json === lastSavedJsonRef.current) return;
      pendingRef.current = { payload: cloneData(payload), json };
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        const pending = pendingRef.current;
        if (!pending) return;
        pendingRef.current = null;
        saveNow(pending.payload, pending.json);
      }, debounceMs);
    },
    [enabled, fingerprint, debounceMs, saveNow]
  );

  useEffect(() => {
    if (!enabled) return;
    schedule(data);
  }, [data, enabled, schedule]);

  useEffect(
    () => () => {
      void flush();
    },
    [flush]
  );

  const saveImmediate = useCallback(
    (payload?: DraftData<K>) => {
      const targetPayload = payload ?? data;
      const json = fingerprint ?? JSON.stringify(targetPayload);
      pendingRef.current = null;
      saveNow(cloneData(targetPayload), json);
    },
    [data, fingerprint, saveNow]
  );

  const discard = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    lastSavedJsonRef.current = null;
    lastSavedAtRef.current = undefined;
    removeDraft(id);
  }, [id, removeDraft]);

  const clearConflict = useCallback(() => {
    clearConflictAction(id);
  }, [clearConflictAction, id]);

  return useMemo(
    () => ({
      hydrated: hydratedState,
      lastSavedAt: lastSavedAtRef.current,
      conflict,
      saveImmediate,
      flush,
      discard,
      clearConflict,
    }),
    [hydratedState, conflict, saveImmediate, flush, discard, clearConflict]
  );
}
