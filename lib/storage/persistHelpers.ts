import { logStorageError } from './diagnostics';
import type { PersistMeta } from './types';

export interface PersistedState<T> {
  state: T;
  version?: number;
}

export interface PersistEnvelope<T> {
  schemaVersion: number;
  updatedAt: number;
  version?: number;
  state: T;
}

export function serializePersistState<T extends { _persistMeta: PersistMeta }>(
  schemaVersion: number,
  persisted: PersistedState<T>
): string {
  const updatedAt = Date.now();
  const stateWithMeta: T = {
    ...persisted.state,
    _persistMeta: {
      schemaVersion,
      updatedAt,
    },
  };

  const envelope: PersistEnvelope<T> = {
    schemaVersion,
    updatedAt,
    version: persisted.version ?? schemaVersion,
    state: stateWithMeta,
  };

  try {
    return JSON.stringify(envelope);
  } catch (error) {
    logStorageError({
      area: 'persist-serialize',
      reason: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return JSON.stringify({ schemaVersion, updatedAt, state: stateWithMeta });
  }
}

export function deserializePersistState<T extends { _persistMeta?: PersistMeta }>(
  schemaVersion: number,
  value: string,
  defaults: () => T
): PersistedState<T> {
  try {
    const parsed = JSON.parse(value) as PersistEnvelope<T> | T;
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
      const envelope = parsed as PersistEnvelope<T>;
      const state = envelope.state ?? defaults();
      state._persistMeta = {
        schemaVersion: envelope.schemaVersion ?? schemaVersion,
        updatedAt: envelope.updatedAt ?? Date.now(),
      };
      return {
        state,
        version: typeof envelope.version === 'number' ? envelope.version : schemaVersion,
      };
    }
    const fallbackState = (parsed as T) ?? defaults();
    fallbackState._persistMeta = {
      schemaVersion,
      updatedAt: Date.now(),
    };
    return { state: fallbackState, version: schemaVersion };
  } catch (error) {
    logStorageError({
      area: 'persist-deserialize',
      reason: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const fallbackState = defaults();
    fallbackState._persistMeta = {
      schemaVersion,
      updatedAt: Date.now(),
    };
    return { state: fallbackState, version: schemaVersion };
  }
}
