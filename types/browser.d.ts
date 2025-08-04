declare global {
  const browser: {
    storage: {
      local: {
        get: (keys?: string | string[] | null) => Promise<{ [key: string]: any }>;
        set: (items: { [key: string]: any }) => Promise<void>;
        remove: (keys: string | string[]) => Promise<void>;
        clear: () => Promise<void>;
      };
      sync: {
        get: (keys?: string | string[] | null) => Promise<{ [key: string]: any }>;
        set: (items: { [key: string]: any }) => Promise<void>;
        remove: (keys: string | string[]) => Promise<void>;
        clear: () => Promise<void>;
      };
    };
    tabs: {
      query: (queryInfo: { active?: boolean; currentWindow?: boolean }) => Promise<{ id?: number; url?: string }[]>;
      sendMessage: (tabId: number, message: any) => Promise<any>;
    };
    runtime: {
      sendMessage: (message: any) => Promise<any>;
      id: string;
      onInstalled: {
        addListener: (callback: (details: { reason: string }) => void) => void;
      };
      onMessage: {
        addListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void) => void;
      };
    };
    action?: {
      openPopup: () => Promise<void>;
    };
    commands?: {
      onCommand: {
        addListener: (callback: (command: string) => void) => void;
      };
    };
    contextMenus?: {
      create: (properties: any) => void;
      removeAll: () => void;
      onClicked: {
        addListener: (callback: (info: any, tab?: any) => void) => void;
      };
      OnClickData: any;
    };
    notifications?: {
      create: (options: {
        type: string;
        iconUrl: string;
        title: string;
        message: string;
      }) => void;
    };
    sidePanel?: {
      open: (options: { windowId?: number }) => Promise<void>;
    };
    windows?: {
      getCurrent: () => Promise<{ id?: number }>;
    };
  };
}

export {};
