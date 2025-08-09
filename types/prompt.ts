export interface Prompt {
  id: string;
  title: string;
  text: string;
  workspace: string; // Required - used throughout app
  created: string; // ISO 8601 date string
  lastUsed?: string; // ISO 8601 date string
  tags: string[]; // Required array - used throughout app
  usageCount: number; // Required - used for tracking
  isPinned: boolean; // Required - used for pinning
  // UI Toggles
  includeTimestamp: boolean;
  // includeVoiceTag removed (legacy)
  // Phase 2: Future features
  isFavorite?: boolean;
  folderId?: string;
}
