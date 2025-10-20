/// <reference path="../.wxt/wxt.d.ts" />

// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Background worker that wires up install hooks, messaging, and storage.

import { chatStorage } from '../lib/chatStorage';
import { handleBackgroundMessage } from '../lib/background/handler';
import { logger } from '../lib/logger';
import { initializeContextMenu, initializeKeyboardShortcuts } from '../lib/shortcuts';
import { initializeStorage, promptStorage } from '../lib/storage';

export default defineBackground(() => {
  logger.info('DialogDrive background script loaded!', { id: browser.runtime.id });

  // Handle install/update so we can seed storage and affordances on day one.
  browser.runtime.onInstalled.addListener(
    async (details: { reason: 'install' | 'update' | string }) => {
      if (details.reason === 'install') {
        logger.info('Extension installed, initializing storage...');
        await initializeStorage();
      }

      initializeKeyboardShortcuts();
      initializeContextMenu();
    }
  );

  // Refresh keyboard shortcuts and menus on every restart.
  initializeKeyboardShortcuts();
  initializeContextMenu();

  // Central router that validates every message and dispatches to storage helpers.
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    handleBackgroundMessage(message, { chatStorage, promptStorage, logger })
      .then((result) => {
        if (!result.handled) {
          sendResponse({ success: false, error: 'Unknown message type' });
          return;
        }
        sendResponse(result.response ?? { success: true });
      })
      .catch((error) => {
        logger.error('Unhandled background message error', error);
        sendResponse({ success: false, error: 'Failed to process request' });
      });
    return true;
  });
});
