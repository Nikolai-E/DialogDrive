import { vi } from 'vitest';

type Listener<T extends any[] = any[]> = (...args: T) => unknown;

type BrowserEvent<T extends any[] = any[]> = {
  addListener: (listener: Listener<T>) => void;
  removeListener: (listener: Listener<T>) => void;
  hasListener: (listener: Listener<T>) => boolean;
  dispatch: (...args: T) => Promise<unknown>[];
};

const createEvent = <T extends any[]>(): BrowserEvent<T> => {
  const listeners = new Set<Listener<T>>();
  return {
    addListener: (listener) => listeners.add(listener),
    removeListener: (listener) => listeners.delete(listener),
    hasListener: (listener) => listeners.has(listener),
    dispatch: (...args) => {
      const results: Promise<unknown>[] = [];
      for (const listener of listeners) {
        try {
          const result = listener(...args);
          if (result instanceof Promise) {
            results.push(result);
          }
        } catch (error) {
          results.push(Promise.reject(error));
        }
      }
      return results;
    },
  };
};

const createStorageArea = () => {
  let store: Record<string, unknown> = {};

  return {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
      if (!keys) return { ...store };
      if (typeof keys === 'string') return { [keys]: store[keys] };
      if (Array.isArray(keys)) {
        return keys.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = store[key];
          return acc;
        }, {});
      }
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(keys)) {
        result[key] = store[key] ?? (keys as Record<string, unknown>)[key];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      store = { ...store, ...items };
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const toRemove = Array.isArray(keys) ? keys : [keys];
      for (const key of toRemove) {
        delete store[key];
      }
    }),
    clear: vi.fn(async () => {
      store = {};
    }),
    __getState: () => ({ ...store }),
    __setState: (next: Record<string, unknown>) => {
      store = { ...next };
    },
    __reset: () => {
      store = {};
    },
  };
};

const runtime = {
  onMessage: createEvent<[unknown, unknown, (response?: unknown) => void]>(),
  onInstalled: createEvent<[unknown]>(),
  sendMessage: vi.fn(),
};

const storage = {
  local: createStorageArea(),
  sync: createStorageArea(),
};

const contextMenus = {
  create: vi.fn(),
  removeAll: vi.fn(),
};

const action = {
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
};

const browserMock = {
  runtime,
  storage,
  contextMenus,
  action,
  permissions: {
    contains: vi.fn(async () => true),
    request: vi.fn(async () => true),
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(async () => []),
  },
};

export type BrowserMock = typeof browserMock;

export const installBrowserMocks = (): BrowserMock => {
  const globalObj = globalThis as Record<string, any>;
  if (!('browser' in globalObj)) {
    vi.stubGlobal('browser', browserMock);
  } else {
    Object.assign(globalObj.browser, browserMock);
  }
  return browserMock;
};

export const resetBrowserMocks = (): void => {
  storage.local.__reset();
  storage.sync.__reset();
  runtime.sendMessage.mockReset();
  contextMenus.create.mockReset();
  contextMenus.removeAll.mockReset();
  action.setBadgeText.mockReset();
  action.setBadgeBackgroundColor.mockReset();
  browserMock.permissions.contains.mockClear();
  browserMock.permissions.request.mockClear();
  browserMock.tabs.sendMessage.mockReset();
  browserMock.tabs.query.mockReset();
};

export const browser = browserMock;

export type { BrowserMock as TestBrowserMock };
