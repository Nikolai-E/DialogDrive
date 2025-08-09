import type { Prompt } from './prompt';

// Chat bookmark types
export interface ChatBookmark {
  id: string;
  title: string;
  url: string;
  shareUrl?: string; // Optional share link for cross-device access
  platform: 'chatgpt' | 'gemini' | 'claude' | 'deepseek';
  workspace: string;
  tags?: string[];
  description?: string;
  created: string;
  lastAccessed?: string;
  accessCount: number;
  isPinned: boolean;
  
  // Metadata
  conversationId?: string;
  shareId?: string; // For share URLs
  participantCount?: number;
  estimatedTokens?: number;
  isOwner?: boolean; // True if using direct conversation URL (requires login)
  
  // Optional scraped content for offline access
  scrapedContent?: {
    summary: string;
    messageCount: number;
    lastMessage: string;
    scrapedAt: string;
  };
}

// Combined item type for unified display
export type WorkspaceItem =
  | {
      id: string;
      type: 'prompt';
      title: string;
      workspace: string;
      tags?: string[];
      created: string;
      lastUsed?: string;
      usageCount: number;
      isPinned: boolean;
      data: Prompt;
    }
  | {
      id: string;
      type: 'chat';
      title: string;
      workspace: string;
      tags?: string[];
      created: string;
      lastUsed?: string;
      usageCount: number;
      isPinned: boolean;
      data: ChatBookmark;
    };

// Enhanced workspace with both prompts and chats
export interface Workspace {
  id: string;
  name: string;
  color: string;
  description?: string;
  promptCount: number;
  chatCount: number;
  created: string;
  lastUsed: string;
}

export type AddChatBookmark = Omit<ChatBookmark, 'id' | 'created' | 'accessCount'>;
