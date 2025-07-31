// This file was causing build errors due to MutationObserver usage during build time
// All functionality has been moved to content.ts to avoid WXT build conflicts

import { logger } from '../lib/logger';

// Minimal placeholder to prevent build errors
export default defineContentScript({
  matches: ['*://chatgpt.com/*', '*://claude.ai/*', '*://gemini.google.com/*'],
  main() {
    // Content capture functionality is now handled in the main content.ts file
    logger.log('ChatCapture functionality moved to content.ts - this file is deprecated');
  },
});
