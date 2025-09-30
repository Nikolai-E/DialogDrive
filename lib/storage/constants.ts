export const STORAGE_KEYS = {
  prefs: 'dd:prefs:v2',
  ui: 'dd:ui:v1',
  drafts: 'dd:drafts:v1',
} as const;

export const STORAGE_SCHEMA_VERSION = {
  prefs: 2,
  ui: 1,
  drafts: 1,
} as const;

export const STORAGE_DEBOUNCE = {
  wait: 300,
  maxWait: 1500,
} as const;

export const DRAFT_LIMITS = {
  ttlMs: 14 * 24 * 60 * 60 * 1000,
  maxItems: 250,
} as const;

export const STORAGE_LISTENER_NAMESPACE = 'dialogdrive-storage-listeners';
