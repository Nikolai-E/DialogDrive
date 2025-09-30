export interface StorageErrorEntry {
  id: string;
  area?: string;
  key?: string;
  reason: string;
  stack?: string;
  occurredAt: string;
}

const MAX_ERRORS = 10;
const errors: StorageErrorEntry[] = [];
const listeners = new Set<(entries: StorageErrorEntry[]) => void>();

function notify() {
  const snapshot = [...errors];
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('Storage diagnostics listener failed', error);
    }
  });
}

function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function logStorageError(entry: Omit<StorageErrorEntry, 'id' | 'occurredAt'> & { occurredAt?: string }) {
  const record: StorageErrorEntry = {
    id: createId(),
    occurredAt: entry.occurredAt ?? new Date().toISOString(),
    area: entry.area,
    key: entry.key,
    reason: entry.reason,
    stack: entry.stack,
  };
  errors.push(record);
  while (errors.length > MAX_ERRORS) {
    errors.shift();
  }
  notify();
}

export function getStorageErrors(): StorageErrorEntry[] {
  return [...errors];
}

export function subscribeStorageErrors(listener: (entries: StorageErrorEntry[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearStorageErrors() {
  errors.splice(0, errors.length);
  notify();
}
