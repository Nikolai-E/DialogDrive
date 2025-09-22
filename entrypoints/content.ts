// An extension by Nikolai Eidheim, built with WXT + TypeScript.

import { logger } from '../lib/logger';
import { platformManager } from '../lib/platforms/manager';

export default defineContentScript({
  // Only run on the ChatGPT domains we support today.
  matches: ['*://chatgpt.com/*', '*://chat.openai.com/*'],
  main() {
    logger.info('DialogDrive content script loaded');

    // Relay popup actions into the active page via the platform manager.
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      (async () => {
        switch (message.type) {
          case 'PASTE_PROMPT': {
            // Drops the selected prompt straight into the chat input.
            const pasteSuccess = await platformManager.paste(message.text);
            sendResponse({ success: pasteSuccess });
            break;
          }
          case 'CAPTURE_CHAT': {
            // Captures the latest conversation so it can be saved as a bookmark.
            const captureResult = await platformManager.capture();
            sendResponse(captureResult);
            break;
          }
          case 'PING': {
            // Gives the UI a quick heartbeat and the active adapter name.
            sendResponse({
              success: true,
              platform: platformManager.getCurrentAdapter()?.name || 'unknown',
            });
            break;
          }
          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      })();

      // Keep the channel open for the async response.
      return true;
    });
  },
});
