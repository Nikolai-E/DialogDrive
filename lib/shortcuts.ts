// An extension by Nikolai Eidheim, built with WXT + TypeScript.
/**
 * Keyboard shortcuts and context menu implementation
 * Addresses UX improvements from expert review
 */

import { logger } from '../lib/logger';
import { promptStorage } from '../lib/storage';

// Command handlers
// Map browser command ids to friendly async actions.
const commandHandlers = {
  'paste-latest-prompt': async () => {
    try {
      const prompts = await promptStorage.getAll();
      if (prompts.length === 0) return;

      // Get most recently used prompt
      const latestPrompt = prompts
        .sort((a, b) => 
          new Date(b.lastUsed || b.created).getTime() - 
          new Date(a.lastUsed || a.created).getTime()
        )[0];

      // Try send to active tab; fallback to clipboard
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          await browser.tabs.sendMessage(tabs[0].id, {
            type: 'PASTE_PROMPT',
            text: latestPrompt.text
          });
          await promptStorage.incrementUsage(latestPrompt.id);
          return;
        }
      } catch (_) {}

      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(latestPrompt.text);
      await promptStorage.incrementUsage(latestPrompt.id);
    } catch (error) {
      logger.error('Failed to paste latest prompt:', error);
    }
  },

  'save-current-chat': async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const response = await browser.tabs.sendMessage(tabs[0].id, {
          type: 'CAPTURE_CHAT'
        });

        if (response?.success && response.url && response.title) {
          // Forward to background to persist as bookmark
          await browser.runtime.sendMessage({
            type: 'SAVE_CHAT_BOOKMARK',
            data: {
              title: response.title,
              url: response.url,
              platform: (response.platform || (response.url.includes('chatgpt') ? 'chatgpt' : 'chatgpt')),
              workspace: 'General',
              tags: [],
              scrapedContent: {
                summary: response.title,
                messageCount: response.messageCount || 0,
                lastMessage: response.lastMessage || '',
                scrapedAt: new Date().toISOString()
              }
            }
          });
        }
      }
    } catch (error) {
      logger.error('Failed to save current chat:', error);
    }
  },

  'open-side-panel': async () => {
    try {
      if (browser.sidePanel && browser.windows) {
        const currentWindow = await browser.windows.getCurrent();
        if (currentWindow.id) {
          await browser.sidePanel.open({ windowId: currentWindow.id });
        }
      } else if (browser.action) {
        // Fallback to popup if side panel not available
        await browser.action.openPopup();
      }
    } catch (error) {
      logger.error('Failed to open side panel:', error);
    }
  },

  'quick-search': async () => {
    try {
      // Open popup focused on search
      if (browser.action) {
        await browser.action.openPopup();
        // Send message to focus search
        setTimeout(() => {
          browser.runtime.sendMessage({ type: 'FOCUS_SEARCH' });
        }, 100);
      }
    } catch (error) {
      logger.error('Failed to open quick search:', error);
    }
  }
};

// Context menu items
const contextMenuItems = [
  // Highlight a few high-value tasks directly from the right-click menu.
  {
    id: 'save-selection-as-prompt',
    title: 'Save selection as prompt',
    contexts: ['selection'],
    documentUrlPatterns: ['*://*/*']
  },
  {
    id: 'paste-latest-prompt',
    title: 'Paste latest prompt',
    contexts: ['editable'],
    documentUrlPatterns: [
      '*://chatgpt.com/*',
      '*://chat.openai.com/*'
    ]
  },
  {
    id: 'save-chat-bookmark',
    title: 'Save chat as bookmark',
    contexts: ['page'],
    documentUrlPatterns: [
      '*://chatgpt.com/*',
      '*://chat.openai.com/*'
    ]
  },
  {
    id: 'separator-1',
    type: 'separator' as const,
    contexts: ['all']
  },
  {
    id: 'open-dialogdrive',
    title: 'Open DialogDrive',
    contexts: ['all'],
    documentUrlPatterns: ['*://*/*']
  }
];

// Initialize keyboard shortcuts
export function initializeKeyboardShortcuts() {
  // Bind native browser shortcuts to our command handler map.
  if (browser.commands) {
    browser.commands.onCommand.addListener((command) => {
      const handler = commandHandlers[command as keyof typeof commandHandlers];
      if (handler) {
        handler();
      } else {
        logger.warn('Unknown command:', command);
      }
    });
  }
}

// Initialize context menu
export function initializeContextMenu() {
  // Rebuild the context menu every time the background boots up.
  if (browser.contextMenus) {
    // Remove existing items
    browser.contextMenus.removeAll();

    // Create new items
    // Recreate each context-menu entry from our local descriptor list.
    contextMenuItems.forEach(item => {
      if (browser.contextMenus) {
        browser.contextMenus.create(item as any);
      }
    });

    // Handle context menu clicks
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        switch (info.menuItemId) {
          case 'save-selection-as-prompt':
            await handleSaveSelectionAsPrompt(info, tab);
            break;
            
          case 'paste-latest-prompt':
            await commandHandlers['paste-latest-prompt']();
            break;
            
          case 'save-chat-bookmark':
            await handleSaveChatBookmark(tab);
            break;
            
          case 'open-dialogdrive':
            if (browser.action) {
              await browser.action.openPopup();
            }
            break;
        }
      } catch (error) {
        logger.error('Context menu handler error:', error);
      }
    });
  }
}

// Context menu handlers
async function handleSaveSelectionAsPrompt(info: any, tab?: any) {
  if (!info.selectionText || !tab?.id) return;

  try {
    // Create prompt from selection
    const prompt = await promptStorage.add({
      title: info.selectionText.substring(0, 50) + (info.selectionText.length > 50 ? '...' : ''),
      text: info.selectionText,
      workspace: 'Captured',
      tags: ['selection', 'captured'],
      usageCount: 0,
      isPinned: false,
      includeTimestamp: true
    });

    // Show notification
    if (browser.notifications) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'icon/icon-48.png',
        title: 'DialogDrive',
        message: 'Selection saved as prompt'
      });
    }

    logger.info('Saved selection as prompt:', prompt.id);
  } catch (error) {
    logger.error('Failed to save selection as prompt:', error);
  }
}

async function handleSaveChatBookmark(tab?: any) {
  if (!tab?.id || !tab.url) return;

  try {
    // Capture from content script
    const response = await browser.tabs.sendMessage(tab.id, { type: 'CAPTURE_CHAT' });

    if (response?.success && response.url && response.title) {
      await browser.runtime.sendMessage({
        type: 'SAVE_CHAT_BOOKMARK',
        data: {
          title: response.title,
          url: response.url,
          platform: (response.platform || (response.url.includes('chatgpt') ? 'chatgpt' : 'chatgpt')),
          workspace: 'General',
          tags: [],
          scrapedContent: {
            summary: response.title,
            messageCount: response.messageCount || 0,
            lastMessage: response.lastMessage || '',
            scrapedAt: new Date().toISOString()
          }
        }
      });

      if (browser.notifications) {
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'icon/icon-48.png',
          title: 'DialogDrive',
          message: 'Chat saved as bookmark'
        });
      }
    }
  } catch (error) {
    logger.error('Failed to save chat bookmark:', error);
  }
}

// Global shortcut detection for content scripts
// Removed unused initializeGlobalShortcuts (content-level)

