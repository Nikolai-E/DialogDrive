// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// ChatGPT-specific adapter for pasting prompts and capturing chats.

import { BasePlatformAdapter, CaptureResult } from './adapter';

export class ChatGPTAdapter extends BasePlatformAdapter {
  name = 'ChatGPT';
  
  detect(): boolean {
    return window.location.hostname.includes('chatgpt.com') || 
           window.location.hostname.includes('chat.openai.com');
  }
  
  async paste(text: string): Promise<boolean> {
    try {
      // First try to find the input
      // Probe a few known selectors before falling back to the clipboard.
      const possibleSelectors = [
        '#prompt-textarea',
        'textarea[placeholder*="Message"]',
        '[contenteditable="true"]'
      ];
      
      let input: HTMLElement | null = null;
      for (const selector of possibleSelectors) {
        input = document.querySelector(selector);
        if (input) break;
      }
      
      if (!input) {
        // Fallback to clipboard
        return this.copyToClipboard(text);
      }
      
      // Try to paste
      if (input instanceof HTMLTextAreaElement) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      } else if (input.isContentEditable) {
        input.textContent = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      
      return this.copyToClipboard(text);
    } catch {
      return this.copyToClipboard(text);
    }
  }
  
  async capture(): Promise<CaptureResult> {
    // Build a lightweight summary of the current conversation.
    try {
      const title = document.title.replace(' | ChatGPT', '') || 'ChatGPT Conversation';
      const messages = document.querySelectorAll('[data-message-author-role]');
      
      return {
        success: true,
        platform: 'chatgpt',
        title,
        url: window.location.href,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.textContent?.slice(0, 100) || ''
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture'
      };
    }
  }
}
