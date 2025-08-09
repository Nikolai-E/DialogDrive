/**
 * Keyboard shortcuts and context menu implementation
 * Addresses UX improvements from expert review
 */

import { logger } from '../lib/logger';
import { promptStorage } from '../lib/storage';

// Command handlers
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

      // Send to active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: 'PASTE_PROMPT',
          text: latestPrompt.text
        });

        // Increment usage
        await promptStorage.incrementUsage(latestPrompt.id);
      }
    } catch (error) {
      logger.error('Failed to paste latest prompt:', error);
    }
  },

  'save-current-chat': async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: 'CAPTURE_CHAT'
        });
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
      '*://claude.ai/*',
      '*://gemini.google.com/*'
    ]
  },
  {
    id: 'save-chat-bookmark',
    title: 'Save chat as bookmark',
    contexts: ['page'],
    documentUrlPatterns: [
      '*://chatgpt.com/*',
      '*://claude.ai/*',
      '*://gemini.google.com/*'
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
  if (browser.contextMenus) {
    // Remove existing items
    browser.contextMenus.removeAll();

    // Create new items
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
        iconUrl: '/icon/48.png',
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
    // Send message to content script to capture chat data
    const response = await browser.tabs.sendMessage(tab.id, {
      type: 'CAPTURE_CHAT_BOOKMARK'
    });

    if (response?.success) {
      // Show notification
      if (browser.notifications) {
        browser.notifications.create({
          type: 'basic',
          iconUrl: '/icon/48.png',
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
export function initializeGlobalShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + Shift + P - Paste latest prompt
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      browser.runtime.sendMessage({ type: 'PASTE_LATEST_PROMPT' });
    }

    // Ctrl/Cmd + Shift + B - Save current chat
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'B') {
      event.preventDefault();
      browser.runtime.sendMessage({ type: 'SAVE_CURRENT_CHAT' });
    }

    // Ctrl/Cmd + Shift + D - Open DialogDrive
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      browser.runtime.sendMessage({ type: 'OPEN_DIALOGDRIVE' });
    }
  });
}

// Enhanced clipboard operations
export class ClipboardManager {
  private static instance: ClipboardManager;

  static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager();
    }
    return ClipboardManager.instance;
  }

  async writeText(text: string): Promise<boolean> {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback to legacy method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      
      document.body.appendChild(textArea);
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return success;
    } catch (error) {
      logger.error('Failed to write to clipboard:', error);
      return false;
    }
  }

  async readText(): Promise<string | null> {
    try {
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }
      return null;
    } catch (error) {
      logger.error('Failed to read from clipboard:', error);
      return null;
    }
  }

  async writeWithFallback(text: string, element?: HTMLElement): Promise<boolean> {
    // Try clipboard API first
    const clipboardSuccess = await this.writeText(text);
    if (clipboardSuccess) return true;

    // If clipboard fails, try to insert directly into focused element
    if (element && (element.isContentEditable || element.tagName === 'TEXTAREA' || element.tagName === 'INPUT')) {
      try {
        if (element.isContentEditable) {
          // For contenteditable elements (ChatGPT, Claude)
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            element.textContent = (element.textContent || '') + text;
          }
        } else {
          // For input/textarea elements
          const input = element as HTMLInputElement | HTMLTextAreaElement;
          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;
          const currentValue = input.value;
          
          input.value = currentValue.slice(0, start) + text + currentValue.slice(end);
          input.selectionStart = input.selectionEnd = start + text.length;
        }

        // Trigger events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        return true;
      } catch (error) {
        logger.error('Failed to insert text directly:', error);
      }
    }

    return false;
  }
}
