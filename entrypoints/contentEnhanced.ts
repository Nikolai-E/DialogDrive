/**
 * Enhanced Content Script for DialogDrive
 * Addresses selector fragility and improved pasting mechanisms
 * Implements feature detection instead of hardcoded selectors
 */

import { logger } from '../lib/logger';
import { ClipboardManager, initializeGlobalShortcuts } from '../lib/shortcuts';
import { ChatStorage } from '../lib/chatStorage';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*'
  ],
  main() {
    initializeContentScript();
  }
});

function initializeContentScript() {
  // Initialize global shortcuts
  initializeGlobalShortcuts();

// Platform detection with feature detection
interface PlatformDetector {
  name: string;
  detect: () => boolean;
  getInputElement: () => HTMLElement | null;
  getChatContainer: () => HTMLElement | null;
  extractTitle: () => string;
  extractMessages: () => Array<{ role: string; content: string }>;
}

const platformDetectors: PlatformDetector[] = [
  {
    name: 'chatgpt',
    detect: () => window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('chat.openai.com'),
    getInputElement: () => {
      // Try multiple selectors in order of preference
      const selectors = [
        '#prompt-textarea',
        '[data-testid="text-input"]',
        '[contenteditable="true"][data-id]',
        'textarea[placeholder*="Message"]',
        '[contenteditable="true"]:not([data-slate-editor]):last-of-type',
        'div[contenteditable="true"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && isValidInputElement(element)) {
          return element;
        }
      }
      
      // Fallback: find any contenteditable in the input area
      const mainContent = document.querySelector('main, [data-testid="conversation"], .flex.flex-col');
      if (mainContent) {
        const editables = mainContent.querySelectorAll('[contenteditable="true"]');
        for (const editable of editables) {
          if (isValidInputElement(editable as HTMLElement)) {
            return editable as HTMLElement;
          }
        }
      }
      
      return null;
    },
    getChatContainer: () => {
      const selectors = [
        '[data-testid="conversation"]',
        '.flex-1.overflow-hidden',
        'main .overflow-y-auto',
        '[role="main"] .flex-1'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) return element;
      }
      
      return document.querySelector('main') as HTMLElement;
    },
    extractTitle: () => {
      const titleElement = document.querySelector('title, h1, [data-testid="conversation-title"]');
      return titleElement?.textContent?.trim() || 'ChatGPT Conversation';
    },
    extractMessages: () => {
      const messages: Array<{ role: string; content: string }> = [];
      
      // Try different message container selectors
      const messageSelectors = [
        '[data-message-author-role]',
        '[data-testid*="message"]',
        '.group.w-full',
        '.message'
      ];
      
      for (const selector of messageSelectors) {
        const messageElements = document.querySelectorAll(selector);
        if (messageElements.length > 0) {
          messageElements.forEach(msg => {
            const role = msg.getAttribute('data-message-author-role') || 
                        (msg.textContent?.includes('ChatGPT') ? 'assistant' : 'user');
            const content = msg.textContent?.trim() || '';
            if (content) {
              messages.push({ role, content });
            }
          });
          break;
        }
      }
      
      return messages;
    }
  },
  
  {
    name: 'claude',
    detect: () => window.location.hostname.includes('claude.ai'),
    getInputElement: () => {
      const selectors = [
        '[data-testid="chat-input"]',
        '.ProseMirror',
        '[contenteditable="true"][data-placeholder]',
        'div[contenteditable="true"]',
        'textarea'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && isValidInputElement(element)) {
          return element;
        }
      }
      
      return null;
    },
    getChatContainer: () => {
      return document.querySelector('[data-testid="chat-messages"], .chat-container, main') as HTMLElement;
    },
    extractTitle: () => {
      return document.querySelector('title, h1')?.textContent?.trim() || 'Claude Conversation';
    },
    extractMessages: () => {
      const messages: Array<{ role: string; content: string }> = [];
      const messageElements = document.querySelectorAll('[data-testid*="message"], .message, .chat-message');
      
      messageElements.forEach(msg => {
        const isUser = msg.classList.contains('user') || msg.querySelector('.user');
        const role = isUser ? 'user' : 'assistant';
        const content = msg.textContent?.trim() || '';
        if (content) {
          messages.push({ role, content });
        }
      });
      
      return messages;
    }
  },
  
  {
    name: 'gemini',
    detect: () => window.location.hostname.includes('gemini.google.com'),
    getInputElement: () => {
      const selectors = [
        '[data-testid="chat-input"]',
        'rich-textarea[data-initial-value]',
        '[contenteditable="true"]',
        'textarea'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && isValidInputElement(element)) {
          return element;
        }
      }
      
      return null;
    },
    getChatContainer: () => {
      return document.querySelector('[data-testid="chat-messages"], .chat-container, main') as HTMLElement;
    },
    extractTitle: () => {
      return document.querySelector('title, h1')?.textContent?.trim() || 'Gemini Conversation';
    },
    extractMessages: () => {
      const messages: Array<{ role: string; content: string }> = [];
      const messageElements = document.querySelectorAll('[data-testid*="message"], .message');
      
      messageElements.forEach(msg => {
        const role = msg.classList.contains('user-message') ? 'user' : 'assistant';
        const content = msg.textContent?.trim() || '';
        if (content) {
          messages.push({ role, content });
        }
      });
      
      return messages;
    }
  }
];

// Helper function to validate input elements
function isValidInputElement(element: HTMLElement): boolean {
  if (!element) return false;
  
  // Check if element is visible and editable
  const rect = element.getBoundingClientRect();
  const isVisible = rect.width > 0 && rect.height > 0 && 
                   window.getComputedStyle(element).display !== 'none';
  
  const isEditable = element.isContentEditable || 
                    element.tagName === 'TEXTAREA' || 
                    element.tagName === 'INPUT';
                    
  // Check if element is likely an input (not just any contenteditable)
  const isInputLike = !!(element.closest('[data-testid*="input"], .input, .chat-input') ||
                     element.getAttribute('placeholder') ||
                     element.getAttribute('data-placeholder') ||
                     element.tagName === 'TEXTAREA' ||
                     element.tagName === 'INPUT');
  
  return isVisible && isEditable && isInputLike;
}

// Enhanced paste functionality
class EnhancedPasteManager {
  private clipboardManager = ClipboardManager.getInstance();
  
  async pasteText(text: string): Promise<boolean> {
    const platform = this.getCurrentPlatform();
    if (!platform) {
      logger.warn('No supported platform detected');
      return false;
    }
    
    const inputElement = platform.getInputElement();
    if (!inputElement) {
      logger.warn('No input element found');
      return await this.clipboardManager.writeText(text);
    }
    
    // Try direct insertion first
    const success = await this.insertTextDirect(inputElement, text);
    if (success) return true;
    
    // Fallback to clipboard
    const clipboardSuccess = await this.clipboardManager.writeText(text);
    if (clipboardSuccess) {
      this.showPasteHint(inputElement);
    }
    
    return clipboardSuccess;
  }
  
  private async insertTextDirect(element: HTMLElement, text: string): Promise<boolean> {
    try {
      // Focus the element first
      element.focus();
      
      if (element.isContentEditable) {
        return this.insertIntoContentEditable(element, text);
      } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        return this.insertIntoInput(element as HTMLInputElement | HTMLTextAreaElement, text);
      }
      
      return false;
    } catch (error) {
      logger.error('Direct insertion failed:', error);
      return false;
    }
  }
  
  private insertIntoContentEditable(element: HTMLElement, text: string): boolean {
    try {
      // Method 1: Use execCommand if available
      if (document.execCommand) {
        document.execCommand('insertText', false, text);
        return true;
      }
      
      // Method 2: Use Selection API
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        return true;
      }
      
      // Method 3: Direct text manipulation (last resort)
      element.textContent = (element.textContent || '') + text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      return true;
    } catch (error) {
      logger.error('ContentEditable insertion failed:', error);
      return false;
    }
  }
  
  private insertIntoInput(element: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
    try {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const currentValue = element.value;
      
      element.value = currentValue.slice(0, start) + text + currentValue.slice(end);
      element.selectionStart = element.selectionEnd = start + text.length;
      
      // Trigger events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    } catch (error) {
      logger.error('Input insertion failed:', error);
      return false;
    }
  }
  
  private showPasteHint(element: HTMLElement) {
    // Create a temporary hint
    const hint = document.createElement('div');
    hint.textContent = 'Text copied to clipboard - Press Ctrl/Cmd+V to paste';
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(hint);
    
    // Remove hint after 3 seconds
    setTimeout(() => {
      hint.style.opacity = '0';
      setTimeout(() => {
        if (hint.parentNode) {
          hint.parentNode.removeChild(hint);
        }
      }, 300);
    }, 3000);
    
    // Also try to focus the input element
    element.focus();
  }
  
  private getCurrentPlatform(): PlatformDetector | null {
    return platformDetectors.find(detector => detector.detect()) || null;
  }
}

// Chat capture functionality
class ChatCapture {
  private chatStorage = new ChatStorage();
  
  async captureCurrentChat(): Promise<{ success: boolean; message: string }> {
    try {
      const platform = platformDetectors.find(detector => detector.detect());
      if (!platform) {
        return { success: false, message: 'Current page is not a supported chat platform' };
      }
      
      const title = platform.extractTitle();
      const messages = platform.extractMessages();
      const url = window.location.href;
      
      if (messages.length === 0) {
        return { success: false, message: 'No chat messages found to capture' };
      }
      
      const chatData = {
        title,
        url,
        platform: platform.name,
        messages,
        captured: new Date().toISOString(),
        metadata: {
          messageCount: messages.length,
          userAgent: navigator.userAgent,
          windowSize: { width: window.innerWidth, height: window.innerHeight }
        }
      };
      
      await this.chatStorage.add({
        title,
        url,
        platform: platform.name as 'chatgpt' | 'gemini' | 'claude',
        workspace: 'Captured',
        tags: ['auto-captured'],
        isPinned: false,
        scrapedContent: {
          summary: `${messages.length} messages captured from ${platform.name}`,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]?.content || '',
          scrapedAt: new Date().toISOString()
        }
      });
      
      return { 
        success: true, 
        message: `Chat captured successfully! ${messages.length} messages saved.` 
      };
    } catch (error) {
      logger.error('Failed to capture chat:', error);
      return { 
        success: false, 
        message: `Failed to capture chat: ${(error as Error).message || 'Unknown error'}` 
      };
    }
  }
  
  async captureSelection(): Promise<{ success: boolean; message: string }> {
    try {
      const selection = window.getSelection();
      if (!selection || selection.toString().trim() === '') {
        return { success: false, message: 'No text selected' };
      }
      
      const selectedText = selection.toString().trim();
      const platform = platformDetectors.find(detector => detector.detect());
      
      const captureData = {
        title: `Selection from ${platform?.name || 'unknown'} - ${new Date().toLocaleDateString()}`,
        content: selectedText,
        url: window.location.href,
        platform: platform?.name || 'unknown',
        captured: new Date().toISOString(),
        type: 'selection'
      };
      
      // Send to background for processing
      browser.runtime.sendMessage({
        type: 'SAVE_SELECTION',
        data: captureData
      });
      
      return { 
        success: true, 
        message: 'Selection captured successfully!' 
      };
    } catch (error) {
      logger.error('Failed to capture selection:', error);
      return { 
        success: false, 
        message: `Failed to capture selection: ${(error as Error).message || 'Unknown error'}` 
      };
    }
  }
}

// Initialize instances
const pasteManager = new EnhancedPasteManager();
const chatCapture = new ChatCapture();

// Message listener
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PASTE_PROMPT':
      pasteManager.pasteText(message.text).then(success => {
        sendResponse({ success });
      });
      return true; // Keep message channel open
      
    case 'CAPTURE_CHAT':
      chatCapture.captureCurrentChat().then(result => {
        sendResponse(result);
      });
      return true;
      
    case 'CAPTURE_CHAT_BOOKMARK':
      chatCapture.captureCurrentChat().then(result => {
        sendResponse(result);
      });
      return true;
      
    case 'CAPTURE_SELECTION':
      chatCapture.captureSelection().then(result => {
        sendResponse(result);
      });
      return true;
      
    case 'PING':
      sendResponse({ success: true, platform: platformDetectors.find(d => d.detect())?.name });
      return true;
  }
});

// Auto-detection and improvement suggestions
function runDiagnostics() {
  const platform = platformDetectors.find(detector => detector.detect());
  if (!platform) {
    logger.info('Page not detected as supported platform');
    return;
  }
  
  const inputElement = platform.getInputElement();
  const chatContainer = platform.getChatContainer();
  
  logger.info('Platform diagnostics:', {
    platform: platform.name,
    inputElement: !!inputElement,
    inputType: inputElement?.tagName,
    inputSelector: inputElement?.getAttribute('data-testid') || inputElement?.className,
    chatContainer: !!chatContainer,
    messages: platform.extractMessages().length
  });
}

// Run diagnostics on load and periodically
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runDiagnostics, 1000);
  });
} else {
  setTimeout(runDiagnostics, 1000);
}

// Periodic diagnostics for SPA navigation
setInterval(runDiagnostics, 30000);

logger.info('DialogDrive enhanced content script loaded');
}
