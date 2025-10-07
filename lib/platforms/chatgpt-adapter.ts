// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// ChatGPT-specific adapter for pasting prompts and capturing chats.

import { BasePlatformAdapter, CaptureResult } from './adapter';

export class ChatGPTAdapter extends BasePlatformAdapter {
  name = 'ChatGPT';

  detect(): boolean {
    return (
      window.location.hostname.includes('chatgpt.com') ||
      window.location.hostname.includes('chat.openai.com')
    );
  }

  async paste(text: string): Promise<boolean> {
    try {
      // First try to find the input
      // Probe a few known selectors before falling back to the clipboard.
      const possibleSelectors = [
        '#prompt-textarea',
        'textarea#prompt-textarea',
        'textarea[placeholder*="Message" i]',
        'textarea[aria-label*="message" i]',
        '[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"][data-testid="textbox"]',
        'div[contenteditable="true"][data-lexical-editor]',
        'div[data-testid="prosemirror-editor"]',
        '[data-slate-editor="true"]',
        'textarea',
        '[contenteditable="true"]',
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
        lastMessage: messages[messages.length - 1]?.textContent?.slice(0, 100) || '',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture',
      };
    }
  }
}
