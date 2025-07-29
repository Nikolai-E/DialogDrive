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
    };
  };
}

export {};
