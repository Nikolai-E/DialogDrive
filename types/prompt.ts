export interface Prompt {
  id: string;
  title: string;
  text: string;
  created: string; // ISO 8601 date string
  lastUsed?: string; // ISO 8601 date string
  tags?: string[];
  // Phase 1: UI Toggles
  includeTimestamp: boolean;
  includeVoiceTag: boolean;
  // Phase 2: Future features
  isFavorite?: boolean;
  folderId?: string;
}
