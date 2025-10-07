// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Mistral-specific adapter for pasting prompts and capturing chats.

import { BasePlatformAdapter, CaptureResult } from './adapter';

export class MistralAdapter extends BasePlatformAdapter {
  name = 'Mistral';

  detect(): boolean {
    return window.location.hostname.includes('mistral.ai');
  }

  async paste(text: string): Promise<boolean> {
    try {
      // Mistral likely uses a textarea or contenteditable div
      const possibleSelectors = [
        'textarea[placeholder*="Ask" i]',
        'textarea[placeholder*="Message" i]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][aria-label*="message" i]',
        'div[contenteditable="true"]',
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
        input.textContent = text;
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
    try {
      const title = document.title.replace(' - Mistral AI', '').replace(' | Mistral', '') || 'Mistral Conversation';
      
      const messages = document.querySelectorAll(
        '[role="article"], .message, [data-message], div[class*="message"]'
      );

      let lastMessage = '';
      if (messages.length > 0) {
        const lastEl = messages[messages.length - 1];
        lastMessage = lastEl.textContent?.trim().slice(0, 100) || '';
      }

      return {
        success: true,
        platform: 'mistral',
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
