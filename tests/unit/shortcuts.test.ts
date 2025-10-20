import { beforeEach, describe, expect, test, vi } from 'vitest';

import { initializeContextMenu, initializeKeyboardShortcuts } from '@/lib/shortcuts';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const { promptStorageMocks } = vi.hoisted(() => {
  const mocks = {
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    incrementUsage: vi.fn(),
  };
  return { promptStorageMocks: mocks };
});

vi.mock('@/lib/storage', () => ({
  promptStorage: promptStorageMocks,
}));

const resetBrowserCommands = () => {
  const listeners: Array<(command: string) => void> = [];
  (browser as any).commands = {
    onCommand: {
      addListener: (listener: (command: string) => void) => {
        listeners.push(listener);
      },
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      dispatch: async (command: string) => {
        const results = listeners.map((listener) => listener(command));
        await Promise.all(results);
      },
    },
  };
  return (browser.commands.onCommand as any).dispatch;
};

const resetContextMenus = () => {
  const listeners: Array<(info: any, tab?: any) => void> = [];
  (browser.contextMenus as any).onClicked = {
    addListener: (listener: (info: any, tab?: any) => void) => {
      listeners.push(listener);
    },
    removeListener: vi.fn(),
    hasListener: vi.fn(),
    dispatch: async (info: any, tab?: any) => {
      const results = listeners.map((listener) => listener(info, tab));
      await Promise.all(results);
    },
  };
  return (browser.contextMenus.onClicked as any).dispatch;
};

describe('keyboard shortcuts', () => {
  let dispatchCommand: (command: string) => Promise<void>;

  beforeEach(() => {
    Object.values(promptStorageMocks).forEach((mock) => mock.mockReset());
    (browser.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 42 } as any]);
    (browser.tabs.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (browser.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    dispatchCommand = resetBrowserCommands();
    const nav = navigator as unknown as {
      clipboard?: { writeText: ReturnType<typeof vi.fn> };
    };
    if (!nav.clipboard) {
      nav.clipboard = { writeText: vi.fn() };
    } else {
      nav.clipboard.writeText = vi.fn();
    }
  });

  test('paste-latest-prompt sends prompt to active tab', async () => {
    promptStorageMocks.getAll.mockResolvedValue([
      { id: 'prompt-1', text: 'Hello', created: '2024-01-01', lastUsed: '2024-05-01' },
      { id: 'prompt-2', text: 'World', created: '2024-03-01' },
    ]);

    initializeKeyboardShortcuts();
    await dispatchCommand('paste-latest-prompt');

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(42, {
      type: 'PASTE_PROMPT',
      text: 'Hello',
    });
    expect(promptStorageMocks.incrementUsage).toHaveBeenCalledWith('prompt-1');
  });

  test('paste-latest-prompt falls back to clipboard when no tab ready', async () => {
    promptStorageMocks.getAll.mockResolvedValue([
      { id: 'prompt-1', text: 'Fallback', created: '2024-01-01' },
    ]);
    (browser.tabs.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: undefined } as any]);

    initializeKeyboardShortcuts();
    await dispatchCommand('paste-latest-prompt');

    const nav = navigator as unknown as {
      clipboard: { writeText: ReturnType<typeof vi.fn> };
    };
    expect(nav.clipboard.writeText).toHaveBeenCalledWith('Fallback');
  });
});

describe('context menu integrations', () => {
  let dispatchMenu: (info: any, tab?: any) => Promise<void>;

  beforeEach(() => {
    dispatchMenu = resetContextMenus();
    (browser.contextMenus.create as ReturnType<typeof vi.fn>).mockReset();
    (browser.contextMenus.removeAll as ReturnType<typeof vi.fn>).mockReset();
    browser.notifications = {
      create: vi.fn(),
    } as any;
    promptStorageMocks.add.mockResolvedValue({ id: 'new-prompt' });
  });

  test('initializeContextMenu registers expected entries', () => {
    initializeContextMenu();

    expect(browser.contextMenus.removeAll).toHaveBeenCalled();
    expect(browser.contextMenus.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'save-selection-as-prompt' })
    );
    expect(browser.contextMenus.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'open-dialogdrive' })
    );
  });

  test('context menu save-selection-as-prompt creates prompt', async () => {
    initializeContextMenu();

    await dispatchMenu(
      { menuItemId: 'save-selection-as-prompt', selectionText: 'Selected text' },
      { id: 5 }
    );

    expect(promptStorageMocks.add).toHaveBeenCalled();
    expect(browser.notifications?.create).toHaveBeenCalled();
  });
});
