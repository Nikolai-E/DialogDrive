import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { installBrowserMocks, resetBrowserMocks } from './utils/chrome';

// Seeded RNG (Park–Miller LCG) for deterministic Math.random behaviour
const LCG_A = 48271;
const LCG_M = 2147483647;
let lcgSeed = 1337;
Math.random = () => {
  lcgSeed = (lcgSeed * LCG_A) % LCG_M;
  return lcgSeed / LCG_M;
};

// Stable crypto.randomUUID stub
const existingCrypto = globalThis.crypto ? { ...globalThis.crypto } : ({} as Crypto);
let uuidCounter = 0;
const fakeRandomUUID = (): `${string}-${string}-${string}-${string}-${string}` => {
  const hex = (uuidCounter++).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}` as `${string}-${string}-${string}-${string}-${string}`;
};

existingCrypto.randomUUID = fakeRandomUUID as Crypto['randomUUID'];
existingCrypto.getRandomValues ??= <T extends ArrayBufferView>(array: T): T => {
  if (array instanceof Uint8Array) {
    array.fill(0);
    return array;
  }
  throw new TypeError('fake getRandomValues only supports Uint8Array for now');
};

vi.stubGlobal('crypto', existingCrypto);

// Block outbound network calls during unit tests
const networkError = () => {
  throw new Error('Network access is disabled in tests. Mock the request instead.');
};

vi.stubGlobal(
  'fetch',
  vi.fn(async () => {
    networkError();
  })
);

class BlockedXMLHttpRequest {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._args: unknown[]) {
    networkError();
  }
}

vi.stubGlobal('XMLHttpRequest', BlockedXMLHttpRequest);

// Install shared browser/chrome mocks for WebExtension APIs
installBrowserMocks();

beforeEach(() => {
  resetBrowserMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});
