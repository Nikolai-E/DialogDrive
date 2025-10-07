import { STORAGE_DEBOUNCE } from './constants';
import { logStorageError } from './diagnostics';

type PendingWrite = {
  timer: ReturnType<typeof setTimeout> | null;
  firstScheduledAt: number;
  resolveQueue: Array<(value: void | PromiseLike<void>) => void>;
  rejectQueue: Array<(reason?: unknown) => void>;
  value: string;
  writeFn: (value: string) => Promise<void>;
};

const pendingWrites = new Map<string, PendingWrite>();

const now = () => Date.now();

function schedule(name: string, wait: number, maxWait: number) {
  const entry = pendingWrites.get(name);
  if (!entry) return;

  const timeSinceFirst = now() - entry.firstScheduledAt;
  const delay = Math.min(wait, Math.max(0, maxWait - timeSinceFirst));

  if (entry.timer) {
    clearTimeout(entry.timer);
  }

  entry.timer = setTimeout(async () => {
    const currentEntry = pendingWrites.get(name);
    if (!currentEntry) return;

    currentEntry.timer = null;

    try {
      await currentEntry.writeFn(currentEntry.value);
      currentEntry.resolveQueue.forEach((resolve) => resolve());
    } catch (error) {
      logStorageError({
        area: 'persist',
        key: name,
        reason: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      currentEntry.rejectQueue.forEach((reject) => reject(error));
    } finally {
      pendingWrites.delete(name);
    }
  }, delay);
}

export function debouncedSet(
  name: string,
  value: string,
  writeFn: (value: string) => Promise<void>,
  wait: number = STORAGE_DEBOUNCE.wait,
  maxWait: number = STORAGE_DEBOUNCE.maxWait
): Promise<void> {
  const existing = pendingWrites.get(name);
  if (existing) {
    existing.value = value;
    const promise = new Promise<void>((resolve, reject) => {
      existing.resolveQueue.push(resolve);
      existing.rejectQueue.push(reject);
    });
    schedule(name, wait, maxWait);
    return promise;
  }

  const entry: PendingWrite = {
    timer: null,
    firstScheduledAt: now(),
    resolveQueue: [],
    rejectQueue: [],
    value,
    writeFn,
  };

  const promise = new Promise<void>((resolve, reject) => {
    entry.resolveQueue.push(resolve);
    entry.rejectQueue.push(reject);
  });

  pendingWrites.set(name, entry);
  schedule(name, wait, maxWait);

  return promise;
}

export function flushDebouncedSet(name: string): Promise<void> {
  const entry = pendingWrites.get(name);
  if (!entry) return Promise.resolve();
  if (entry.timer) {
    clearTimeout(entry.timer);
  }
  pendingWrites.delete(name);
  return entry.writeFn(entry.value);
}
