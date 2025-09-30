import { logStorageError } from './diagnostics';

export interface StorageEnvelope<T> {
  schemaVersion: number;
  updatedAt: number;
  state: T;
}

type Listener<T> = (envelope: StorageEnvelope<T>) => void;

const listeners = new Map<string, Set<Listener<unknown>>>();
let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  browser.storage.onChanged.addListener((changes) => {
    for (const [key, change] of Object.entries(changes)) {
      const newValue = change.newValue;
      if (typeof newValue !== 'string') {
        continue;
      }
      const keyListeners = listeners.get(key);
      if (!keyListeners || keyListeners.size === 0) continue;
      try {
        const parsed = JSON.parse(newValue) as StorageEnvelope<unknown> | undefined;
        if (!parsed || typeof parsed !== 'object') continue;
        const envelope: StorageEnvelope<unknown> = {
          schemaVersion: typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0,
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
          state: (parsed as any).state,
        };
        keyListeners.forEach((listener) => {
          try {
            listener(envelope);
          } catch (listenerError) {
            logStorageError({
              area: 'storage-listener',
              key,
              reason: listenerError instanceof Error ? listenerError.message : String(listenerError),
              stack: listenerError instanceof Error ? listenerError.stack : undefined,
            });
          }
        });
      } catch (error) {
        logStorageError({
          area: 'storage-parse',
          key,
          reason: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  });
  initialized = true;
}

export function subscribeToStorageKey<T>(key: string, listener: Listener<T>): () => void {
  ensureInitialized();
  const set = listeners.get(key) ?? new Set();
  set.add(listener as Listener<unknown>);
  listeners.set(key, set);
  return () => {
    const existing = listeners.get(key);
    if (!existing) return;
    existing.delete(listener as Listener<unknown>);
    if (existing.size === 0) {
      listeners.delete(key);
    }
  };
}
