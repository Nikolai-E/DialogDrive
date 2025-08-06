import { logger } from '../lib/logger';
import { platformManager } from '../lib/platforms/manager';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*'
  ],
  main() {
    logger.info('DialogDrive content script loaded');
    
    // Listen for messages from extension
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        switch (message.type) {
          case 'PASTE_PROMPT':
            const pasteSuccess = await platformManager.paste(message.text);
            sendResponse({ success: pasteSuccess });
            break;
            
          case 'CAPTURE_CURRENT_CHAT':
            const captureResult = await platformManager.capture();
            sendResponse(captureResult);
            break;
            
          case 'PING':
            sendResponse({ 
              success: true, 
              platform: platformManager.getCurrentAdapter()?.name || 'unknown' 
            });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      })();
      
      return true; // Keep channel open for async response
    });
  }
});
