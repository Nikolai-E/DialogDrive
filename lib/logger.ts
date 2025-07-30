// Logger utility to replace console.log statements
// Only logs in development, errors always logged
interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger: Logger = {
  log: isDevelopment ? console.log : () => {},
  error: console.error, // Always log errors
  warn: isDevelopment ? console.warn : () => {},
  info: isDevelopment ? console.info : () => {},
};

// Usage tracking for debugging
export const logPromptAction = (action: string, promptId?: string, data?: any) => {
  if (isDevelopment) {
    console.log(`[DialogDrive] ${action}`, { promptId, data, timestamp: new Date().toISOString() });
  }
};

export const logStorageAction = (action: string, success: boolean, error?: Error) => {
  if (isDevelopment) {
    console.log(`[Storage] ${action}`, { success, error: error?.message, timestamp: new Date().toISOString() });
  }
};
