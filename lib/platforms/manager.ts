import { PlatformAdapter } from './adapter';
import { ChatGPTAdapter } from './chatgpt-adapter';

class PlatformManager {
  private adapters: PlatformAdapter[] = [
    new ChatGPTAdapter(),
    // Add more adapters here as needed
  ];
  
  getCurrentAdapter(): PlatformAdapter | null {
    return this.adapters.find(adapter => adapter.detect()) || null;
  }
  
  async paste(text: string): Promise<boolean> {
    const adapter = this.getCurrentAdapter();
    if (!adapter) {
      return this.fallbackPaste(text);
    }
    
    await adapter.isReady();
    return adapter.paste(text);
  }
  
  async capture() {
    const adapter = this.getCurrentAdapter();
    if (!adapter) {
      return { success: false, error: 'Platform not supported' };
    }
    
    await adapter.isReady();
    return adapter.capture();
  }
  
  private async fallbackPaste(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

export const platformManager = new PlatformManager();
