import { StateStorage } from 'zustand/middleware';
import { debouncedSet } from './debouncedSet';
import { logStorageError } from './diagnostics';

function safeStringify(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    logStorageError({
      area: 'persist-stringify',
      reason: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

async function readFromArea(area: 'local' | 'sync', name: string): Promise<string | null> {
  try {
    const result = await browser.storage[area].get(name);
    if (!(name in result)) return null;
    const value = result[name];
    if (typeof value === 'string') return value;
    return safeStringify(value);
  } catch (error) {
    logStorageError({
      area: `${area}:get`,
      key: name,
      reason: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

function writeToArea(area: 'local' | 'sync', name: string, value: string): Promise<void> {
  return debouncedSet(`${area}:${name}`, value, async (payload) => {
    await browser.storage[area].set({ [name]: payload });
  });
}

async function removeFromArea(area: 'local' | 'sync', name: string): Promise<void> {
  try {
    await browser.storage[area].remove(name);
  } catch (error) {
    logStorageError({
      area: `${area}:remove`,
      key: name,
      reason: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

export const chromeLocalStateStorage: StateStorage = {
  getItem: (name) => readFromArea('local', name),
  setItem: (name, value) => writeToArea('local', name, value),
  removeItem: (name) => removeFromArea('local', name),
};

export function createChromeSyncStateStorage(
  onFallback?: (name: string, value: string, error: unknown) => void
): StateStorage {
  return {
    getItem: (name) =>
      readFromArea('sync', name).then(async (value) => {
        if (value !== null) return value;
        // Attempt to read fallback copy from local if sync has nothing.
        const localValue = await readFromArea('local', name);
        if (localValue !== null) {
          onFallback?.(name, localValue, new Error('Sync storage missing; using local fallback'));
        }
        return localValue;
      }),
    setItem: async (name, value) => {
      try {
        await writeToArea('sync', name, value);
      } catch (error) {
        logStorageError({
          area: 'sync:set',
          key: name,
          reason: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        await writeToArea('local', name, value);
        onFallback?.(name, value, error);
      }
    },
    removeItem: async (name) => {
      try {
        await removeFromArea('sync', name);
      } catch (error) {
        logStorageError({
          area: 'sync:remove',
          key: name,
          reason: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        onFallback?.(name, '', error);
      }
      await removeFromArea('local', name);
    },
  };
}
