// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Claude-specific adapter for pasting prompts and capturing chats.

import { BasePlatformAdapter, CaptureResult } from './adapter';

export class ClaudeAdapter extends BasePlatformAdapter {
  name = 'Claude';

  detect(): boolean {
    return window.location.hostname.includes('claude.ai');
  }

  async paste(text: string): Promise<boolean> {
    try {
      // Claude uses a contenteditable div with ProseMirror
      const possibleSelectors = [
        'div[contenteditable="true"][data-placeholder]',
        'div[contenteditable="true"].ProseMirror',
        'div[contenteditable="true"][aria-label*="message" i]',
        'div.ProseMirror[contenteditable="true"]',
        'fieldset div[contenteditable="true"]',
        '[role="textbox"][contenteditable="true"]',
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
        
        // For ProseMirror (Claude's editor), we need to clear and set content
        input.textContent = text;
        
        // Dispatch multiple events to ensure Claude's state updates
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        try {
          // ProseMirror-specific events
          input.dispatchEvent(
            new InputEvent('beforeinput', {
              bubbles: true,
              inputType: 'insertText',
              data: text,
            })
          );
          input.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
              inputType: 'insertText',
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
    // Build a lightweight summary of the current Claude conversation.
    try {
      const title = document.title.replace(' \ Claude', '').replace(' — Claude', '') || 'Claude Conversation';
      
      // Claude uses specific message containers
      const messages = document.querySelectorAll(
        '[data-test-render-count], .font-claude-message, [data-is-author], div[class*="message"]'
      );

      let lastMessage = '';
      if (messages.length > 0) {
        const lastEl = messages[messages.length - 1];
        lastMessage = lastEl.textContent?.trim().slice(0, 100) || '';
      }

      return {
        success: true,
        platform: 'claude',
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
