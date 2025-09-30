import type { StateStorage } from 'zustand/middleware';

interface Envelope<T = unknown> {
  schemaVersion: number;
  updatedAt: number;
  version?: number;
  state: T;
}

/**
 * Wrap a StateStorage to persist values inside an envelope { schemaVersion, updatedAt, version, state }.
 * Compatible with createJSONStorage by unwrapping on getItem and re-wrapping on setItem.
 */
export function withEnvelope(base: StateStorage, schemaVersion: number): StateStorage {
  return {
    async getItem(name) {
      const raw = await base.getItem(name as string);
      if (raw == null) return raw as any;
      if (typeof raw !== 'string') return raw as any;
      try {
        const parsed = JSON.parse(raw) as Envelope | Record<string, unknown>;
        // If it's an envelope, unwrap to { state, version } for createJSONStorage
        if (parsed && typeof parsed === 'object' && 'state' in parsed && 'updatedAt' in parsed) {
          const version = typeof (parsed as Envelope).version === 'number' ? (parsed as Envelope).version : schemaVersion;
          return JSON.stringify({ state: (parsed as Envelope).state, version });
        }
        return raw;
      } catch {
        return raw;
      }
    },
    async setItem(name, value) {
      try {
        const payload = JSON.parse(value as string) as { state: unknown; version?: number };
        const envelope: Envelope = {
          schemaVersion,
          updatedAt: Date.now(),
          version: typeof payload.version === 'number' ? payload.version : schemaVersion,
          state: payload.state,
        };
        return base.setItem(name as string, JSON.stringify(envelope));
      } catch {
        const fallback: Envelope = {
          schemaVersion,
          updatedAt: Date.now(),
          state: value as any,
        };
        return base.setItem(name as string, JSON.stringify(fallback));
      }
    },
    removeItem(name) {
      return base.removeItem(name as string);
    },
  };
}
