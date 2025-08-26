export interface PlatformAdapter {
  name: string;
  detect(): boolean;
  isReady(): Promise<boolean>;
  paste(text: string): Promise<boolean>;
  capture(): Promise<CaptureResult>;
}

export interface CaptureResult {
  success: boolean;
  title?: string;
  url?: string;
  platform?: string;
  messageCount?: number;
  lastMessage?: string;
  error?: string;
}

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract name: string;
  abstract detect(): boolean;
  
  async isReady(): Promise<boolean> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve(true);
      } else {
        window.addEventListener('load', () => resolve(true));
        setTimeout(() => resolve(true), 5000); // Timeout after 5s
      }
    });
  }
  
  abstract paste(text: string): Promise<boolean>;
  abstract capture(): Promise<CaptureResult>;
  
  protected async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return this.fallbackCopy(text);
    }
  }
  
  private fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
