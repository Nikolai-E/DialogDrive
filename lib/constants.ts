// Storage keys
export const STORAGE_KEYS = {
  PROMPTS: 'dialogdrive-prompts',
  CHATS: 'dialogdrive-chats',
  SETTINGS: 'dialogdrive-settings',
} as const;

// UI Constants
export const UI_CONFIG = {
  POPUP_WIDTH: 400,
  POPUP_HEIGHT: 580,
  MAX_SEARCH_RESULTS: 50,
  TOAST_DURATION: 2000,
} as const;

// Default workspaces
export const DEFAULT_WORKSPACES = [
  'General',
  'Research',
  'Development',
  'Education',
  'Business',
  'Creative',
] as const;

// Content script selectors for AI platforms
export const AI_PLATFORM_SELECTORS = {
  CHATGPT: {
    input: '[contenteditable="true"]',
    submitButton: '[data-testid="send-button"]',
    container: '#__next',
  },
  CLAUDE: {
    input: '[contenteditable="true"]',
    submitButton: 'button[aria-label="Send Message"]',
    container: 'main',
  },
  GEMINI: {
    input: '[contenteditable="true"]',
    submitButton: 'button[aria-label="Send message"]',
    container: '[jscontroller]',
  },
} as const;

// Animation durations
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  STORAGE_FAILED: 'Failed to save data. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_INPUT: 'Please check your input and try again.',
  NOT_FOUND: 'Item not found.',
  UNAUTHORIZED: 'Authentication required.',
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_AI_IMPROVEMENTS: true,
  ENABLE_VOICE_FEATURES: false,
  ENABLE_CHAIN_EXECUTION: false,
  ENABLE_ANALYTICS: false,
} as const;
