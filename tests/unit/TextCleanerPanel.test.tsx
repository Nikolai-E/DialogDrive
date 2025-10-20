import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { defaultCleanOptions } from '@/lib/textCleaner';

type CleanerState = typeof defaultCleanOptions;

type PrefsStateShape = {
  cleanerOptions: CleanerState;
  setCleanerOptions: (patch: Partial<CleanerState>) => void;
  cleanerTipsVisible: boolean;
  setCleanerTipsVisible: (visible: boolean) => void;
  pickerTrigger: 'doubleSlash' | 'backslash' | 'none';
  setPickerTrigger: (trigger: 'doubleSlash' | 'backslash' | 'none') => void;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (value: boolean) => void;
  developer: {
    syncFallback: boolean;
    lastSyncFallbackReason?: string;
  };
  syncFallback: boolean;
  markSyncFallback: (reason?: string) => void;
  resetSyncFallback: () => void;
  _rehydrated: boolean;
};

type PrefsStoreTestUtils = {
  reset: () => void;
  getState: () => PrefsStateShape;
};

declare global {
  // eslint-disable-next-line no-var
  var __DD_PREFS_TEST_UTILS__: PrefsStoreTestUtils | undefined;
  // eslint-disable-next-line no-var
  var __DD_COPY_SPY__: ReturnType<typeof vi.fn> | undefined;
}

let prefsStoreTestUtils: PrefsStoreTestUtils;
let copySpy: ReturnType<typeof vi.fn>;

vi.mock('@/lib/prefsStore', () => {
  const cloneOptions = (): CleanerState => JSON.parse(JSON.stringify(defaultCleanOptions));

  const createBasePrefsState = (): PrefsStateShape => ({
    cleanerOptions: cloneOptions(),
    cleanerTipsVisible: true,
    pickerTrigger: 'doubleSlash',
    onboardingDismissed: false,
    developer: { syncFallback: false, lastSyncFallbackReason: undefined },
    syncFallback: false,
    _rehydrated: true,
    setCleanerOptions: () => {},
    setCleanerTipsVisible: () => {},
    setPickerTrigger: () => {},
    setOnboardingDismissed: () => {},
    markSyncFallback: () => {},
    resetSyncFallback: () => {},
  });

  const bindPrefsStoreActions = (state: PrefsStateShape) => {
    state.setCleanerOptions = (patch) => {
      const next = { ...state.cleanerOptions, ...patch };
      if (patch.structure) {
        next.structure = { ...state.cleanerOptions.structure, ...patch.structure };
      }
      if (patch.punctuation) {
        next.punctuation = { ...state.cleanerOptions.punctuation, ...patch.punctuation };
      }
      if (patch.whitespace) {
        next.whitespace = { ...state.cleanerOptions.whitespace, ...patch.whitespace };
      }
      state.cleanerOptions = next;
    };

    state.setCleanerTipsVisible = (visible) => {
      state.cleanerTipsVisible = visible;
    };

    state.setPickerTrigger = (trigger) => {
      state.pickerTrigger = trigger;
    };

    state.setOnboardingDismissed = (value) => {
      state.onboardingDismissed = value;
    };

    state.markSyncFallback = (reason) => {
      state.developer = { syncFallback: true, lastSyncFallbackReason: reason };
      state.syncFallback = true;
    };

    state.resetSyncFallback = () => {
      state.developer = { syncFallback: false, lastSyncFallbackReason: undefined };
      state.syncFallback = false;
    };
  };

  const prefsStoreState = createBasePrefsState();
  bindPrefsStoreActions(prefsStoreState);

  const store = (selector?: (s: PrefsStateShape) => unknown) =>
    selector ? selector(prefsStoreState) : prefsStoreState;
  const getState = () => prefsStoreState;
  const reset = () => {
    Object.assign(prefsStoreState, createBasePrefsState());
    bindPrefsStoreActions(prefsStoreState);
  };

  globalThis.__DD_PREFS_TEST_UTILS__ = {
    reset,
    getState,
  };

  return {
    usePrefsStore: store,
    waitForPrefsHydration: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('@/entrypoints/popup/hooks/useCopyToClipboard', () => {
  const spy = vi.fn();
  globalThis.__DD_COPY_SPY__ = spy;
  return {
    useCopyToClipboard: () => ({ isCopied: false, copyToClipboard: spy }),
  };
});

const resolveTestGlobals = () => {
  const prefsUtils = globalThis.__DD_PREFS_TEST_UTILS__;
  if (!prefsUtils) {
    throw new Error('prefs store test utils not initialized');
  }
  prefsStoreTestUtils = prefsUtils;

  const clipboardSpy = globalThis.__DD_COPY_SPY__;
  if (!clipboardSpy) {
    throw new Error('copy spy not initialized');
  }
  copySpy = clipboardSpy;
};

resolveTestGlobals();

import { TextCleanerPanel } from '@/entrypoints/popup/components/TextCleanerPanel';

describe('TextCleanerPanel', () => {
  beforeEach(() => {
    prefsStoreTestUtils.reset();
    copySpy.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('advanced controls toggle visibility', () => {
    render(<TextCleanerPanel />);

    const toggleButton = screen.getByTestId('toggle-advanced-controls');
    expect(screen.queryByTestId('advanced-controls')).toBeNull();

    fireEvent.click(toggleButton);
    expect(screen.getByTestId('advanced-controls')).toBeInTheDocument();
  });

  test('remove markdown switch updates cleaner options', () => {
    render(<TextCleanerPanel />);

    const switchEl = screen.getByRole('switch', { name: /Toggle Remove Markdown/i });
    expect(prefsStoreTestUtils.getState().cleanerOptions.structure.keepBasicMarkdown).toBe(false);

    fireEvent.click(switchEl);

    const state = prefsStoreTestUtils.getState();
    expect(state.cleanerOptions.structure.keepBasicMarkdown).toBe(true);
    expect(state.cleanerOptions.listMode).toBe('keepBullets');
  });

  test('copy button delegates to clipboard helper', () => {
    render(<TextCleanerPanel />);

    const input = screen.getByTestId('text-cleaner-input');
    act(() => {
      fireEvent.change(input, { target: { value: '# Heading\n\n- Item' } });
    });

    const copyButton = screen.getByTestId('copy-button');
    fireEvent.click(copyButton);

    expect(copySpy).toHaveBeenCalledWith(expect.stringContaining('Heading'));
  });
});
