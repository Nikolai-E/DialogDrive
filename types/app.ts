// Store and component state types
export type ViewType = 'list' | 'form' | 'chat-form' | 'settings' | 'cleaner';
export type TabType = 'all' | 'prompts' | 'chats';
export type SortOption = 'recent' | 'usage' | 'alphabetical' | 'pinned';

// Form data interfaces
export interface PromptFormData {
  title: string;
  text: string;
  workspace: string;
  tags: string[];
  includeTimestamp: boolean;
  isPinned: boolean;
}

export interface ChatFormData {
  title: string;
  url: string;
  summary: string;
  tags: string[];
  isPinned: boolean;
}

// Search and filter interfaces
export interface SearchFilters {
  searchTerm: string;
  selectedWorkspace: string;
  sortBy: SortOption;
  showPinnedOnly: boolean;
}

// Statistics interface
export interface AppStats {
  totalPrompts: number;
  totalChats: number;
  pinnedPrompts: number;
  totalUsage: number;
  activeWorkspaces: number;
}

// Storage operation result
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Component props interfaces
export interface HeaderProps {
  onNewPrompt: () => void;
  onNewChat: () => void;
  onSettings: () => void;
}

export interface SearchControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedWorkspace: string;
  onWorkspaceChange: (workspace: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showPinnedOnly: boolean;
  onPinnedFilterChange: (pinned: boolean) => void;
}

// Error boundary types
export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}
