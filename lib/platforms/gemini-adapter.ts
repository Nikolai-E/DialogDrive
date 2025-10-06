// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Gemini-specific adapter for pasting prompts and capturing chats.

import { BasePlatformAdapter, CaptureResult } from './adapter';

export class GeminiAdapter extends BasePlatformAdapter {
  name = 'Gemini';

  detect(): boolean {
    return window.location.hostname.includes('gemini.google.com');
  }

  async paste(text: string): Promise<boolean> {
    try {
      // Gemini uses a rich-textarea component
      const possibleSelectors = [
        'rich-textarea[aria-label*="prompt" i]',
        'rich-textarea[placeholder]',
        'div[contenteditable="true"][aria-label*="prompt" i]',
        'div[contenteditable="true"][data-placeholder]',
        'textarea[aria-label*="prompt" i]',
        'div.ql-editor[contenteditable="true"]',
        '[contenteditable="true"]',
        'textarea',
      ];

      let input: HTMLElement | null = null;
      for (const selector of possibleSelectors) {
        input = document.querySelector(selector);
        if (input && (input.offsetParent !== null || input === document.activeElement)) {
          break;
        }
      }

      if (!input) {
        // Fallback to clipboard
        return this.copyToClipboard(text);
      }

      // Try to paste
      if (input instanceof HTMLTextAreaElement) {
        input.focus();
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(
          new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text })
        );
        return true;
      } else if (input.isContentEditable) {
        input.focus();
        
        // Clear existing content
        input.textContent = text;
        
        // Dispatch events to trigger Gemini's internal state
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        try {
          input.dispatchEvent(
            new InputEvent('beforeinput', {
              bubbles: true,
              inputType: 'insertFromPaste',
              data: text,
            })
          );
        } catch {}
        
        // Place caret at end
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        
        return true;
      }

      return this.copyToClipboard(text);
    } catch {
      return this.copyToClipboard(text);
    }
  }

  async capture(): Promise<CaptureResult> {
    // Build a lightweight summary of the current Gemini conversation.
    try {
      const title = document.title.replace(' - Gemini', '').replace(' | Gemini', '') || 'Gemini Conversation';
      
      // Gemini uses message-content or similar containers
      const messages = document.querySelectorAll(
        'message-content, [data-test-id*="message"], .conversation-turn, .model-response-text, .user-message'
      );

      let lastMessage = '';
      if (messages.length > 0) {
        const lastEl = messages[messages.length - 1];
        lastMessage = lastEl.textContent?.trim().slice(0, 100) || '';
      }

      return {
        success: true,
        platform: 'gemini',
        title,
        url: window.location.href,
        messageCount: messages.length,
        lastMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture',
      };
    }
  }
}
