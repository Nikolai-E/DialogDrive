// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Chooses the right platform adapter to talk to the active AI page.

import { PlatformAdapter } from './adapter';
import { ChatGPTAdapter } from './chatgpt-adapter';
import { ClaudeAdapter } from './claude-adapter';
import { DeepSeekAdapter } from './deepseek-adapter';
import { GeminiAdapter } from './gemini-adapter';
import { GoogleAIStudioAdapter } from './google-ai-studio-adapter';
import { MistralAdapter } from './mistral-adapter';

class PlatformManager {
  private adapters: PlatformAdapter[] = [
    new ChatGPTAdapter(),
    new GeminiAdapter(),
    new ClaudeAdapter(),
    new MistralAdapter(),
    new DeepSeekAdapter(),
    new GoogleAIStudioAdapter(),
  ];

  getCurrentAdapter(): PlatformAdapter | null {
    return this.adapters.find((adapter) => adapter.detect()) || null;
  }

  async paste(text: string): Promise<boolean> {
    // Ask the detected adapter to handle the paste, falling back to clipboard copy.
    const adapter = this.getCurrentAdapter();
    if (!adapter) {
      return this.fallbackPaste(text);
    }

    await adapter.isReady();
    return adapter.paste(text);
  }

  async capture() {
    // Request the latest conversation snapshot from the active adapter.
    const adapter = this.getCurrentAdapter();
    if (!adapter) {
      return { success: false, error: 'Platform not supported' };
    }

    await adapter.isReady();
    return adapter.capture();
  }

  private async fallbackPaste(text: string): Promise<boolean> {
    // Last resort copy to clipboard when we can't reach the DOM.
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

export const platformManager = new PlatformManager();
