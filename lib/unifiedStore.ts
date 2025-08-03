import { create } from 'zustand';
import type { Prompt } from '../types/prompt';
import type { ChatBookmark, WorkspaceItem, AddChatBookmark } from '../types/chat';
import type { ViewType, SortOption, SearchFilters, AppStats } from '../types/app';
import { promptStorage } from './storage';
import { chatStorage } from './chatStorage';
import { logger, logPromptAction } from './logger';
import { DEFAULT_WORKSPACES } from './constants';

type AddPrompt = Omit<Prompt, 'id' | 'created'>;
type ContentFilter = 'all' | 'prompts' | 'chats';

interface UnifiedState {
  // Data
  prompts: Prompt[];
  chats: ChatBookmark[];
  isLoading: boolean;
  error: string | null;
  
  // Search and filter state
  searchTerm: string;
  sortBy: SortOption;
  filterTag: string;
  showPinned: boolean;
  contentFilter: ContentFilter; // New: filter by content type
  selectedWorkspace: string; // New: workspace filter
  
  // View state
  currentView: ViewType;
  editingPrompt: Prompt | null;
  editingChat: ChatBookmark | null; // New: for editing chats
  
  // Derived data
  workspaces: string[];
  allTags: string[];
  filteredItems: WorkspaceItem[]; // Unified items
  filteredPrompts: Prompt[]; // Backwards compatibility
  
  // Statistics
  stats: AppStats;
  
  // Prompt actions (existing)
  loadPrompts: () => Promise<void>;
  addPrompt: (prompt: AddPrompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  togglePinPrompt: (id: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;
  
  // Chat actions (new)
  loadChats: () => Promise<void>;
  addChat: (chat: AddChatBookmark) => Promise<void>;
  updateChat: (chat: ChatBookmark) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  togglePinChat: (id: string) => Promise<void>;
  incrementChatAccess: (id: string) => Promise<void>;
  
  // Search and filter actions
  setSearchTerm: (term: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  setFilterTag: (tag: string) => void;
  setShowPinned: (show: boolean) => void;
  setContentFilter: (filter: ContentFilter) => void; // New
  setSelectedWorkspace: (workspace: string) => void; // New
  resetFilters: () => void;
  
  // View actions
  setCurrentView: (view: ViewType) => void;
  setEditingPrompt: (prompt: Prompt | null) => void;
  setEditingChat: (chat: ChatBookmark | null) => void; // New
  
  // Unified actions
  loadAll: () => Promise<void>; // Load both prompts and chats
  openItem: (item: WorkspaceItem) => void; // Open prompt for edit or chat in new tab
}

// Convert prompt to WorkspaceItem
const promptToWorkspaceItem = (prompt: Prompt): WorkspaceItem => ({
  id: prompt.id,
  type: 'prompt',
  title: prompt.title,
  workspace: prompt.workspace,
  tags: prompt.tags,
  created: prompt.created,
  lastUsed: prompt.lastUsed,
  usageCount: prompt.usageCount,
  isPinned: prompt.isPinned,
  data: prompt
});

// Convert chat to WorkspaceItem  
const chatToWorkspaceItem = (chat: ChatBookmark): WorkspaceItem => ({
  id: chat.id,
  type: 'chat',
  title: chat.title,
  workspace: chat.workspace,
  tags: chat.tags,
  created: chat.created,
  lastUsed: chat.lastAccessed,
  usageCount: chat.accessCount,
  isPinned: chat.isPinned,
  data: chat
});

// Helper to filter and sort unified items
const getFilteredAndSortedItems = (
  prompts: Prompt[],
  chats: ChatBookmark[],
  searchTerm: string,
  sortBy: SortOption,
  filterTag: string,
  showPinned: boolean,
  contentFilter: ContentFilter,
  selectedWorkspace: string
): WorkspaceItem[] => {
  let items: WorkspaceItem[] = [];
  
  // Add prompts if allowed by content filter
  if (contentFilter === 'all' || contentFilter === 'prompts') {
    items.push(...prompts.map(promptToWorkspaceItem));
  }
  
  // Add chats if allowed by content filter
  if (contentFilter === 'all' || contentFilter === 'chats') {
    items.push(...chats.map(chatToWorkspaceItem));
  }
  
  // Apply filters
  if (showPinned) {
    items = items.filter(item => item.isPinned);
  }
  
  if (filterTag !== 'all') {
    items = items.filter(item => item.tags?.includes(filterTag));
  }
  
  if (selectedWorkspace !== 'all') {
    items = items.filter(item => item.workspace === selectedWorkspace);
  }
  
  if (searchTerm) {
    const lowercasedTerm = searchTerm.toLowerCase();
    items = items.filter(item =>
      item.title.toLowerCase().includes(lowercasedTerm) ||
      (item.type === 'prompt' && (item.data as Prompt).text.toLowerCase().includes(lowercasedTerm)) ||
      (item.type === 'chat' && (item.data as ChatBookmark).description?.toLowerCase().includes(lowercasedTerm)) ||
      item.tags?.some((t: string) => t.toLowerCase().includes(lowercasedTerm))
    );
  }

  // Sort items
  items.sort((a, b) => {
    // Pinned items first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    switch (sortBy) {
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'usage':
        return b.usageCount - a.usageCount;
      case 'pinned':
        return Number(b.isPinned) - Number(a.isPinned);
      case 'recent':
      default:
        const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return dateB - dateA;
    }
  });

  return items;
};

// Legacy helper for backwards compatibility
const getFilteredAndSortedPrompts = (
  prompts: Prompt[],
  searchTerm: string,
  sortBy: SortOption,
  filterTag: string,
  showPinned: boolean
): Prompt[] => {
  let result = prompts;

  if (showPinned) {
    result = result.filter(p => p.isPinned);
  }
  if (filterTag !== 'all') {
    result = result.filter(p => p.tags?.includes(filterTag));
  }
  if (searchTerm) {
    const lowercasedTerm = searchTerm.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(lowercasedTerm) ||
      p.text.toLowerCase().includes(lowercasedTerm) ||
      p.tags?.some((t: string) => t.toLowerCase().includes(lowercasedTerm))
    );
  }

  result.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    switch (sortBy) {
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'usage':
        return b.usageCount - a.usageCount;
      case 'pinned':
        return Number(b.isPinned) - Number(a.isPinned);
      case 'recent':
      default:
        const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return dateB - dateA;
    }
  });

  return result;
};

const calculateStats = (prompts: Prompt[], chats: ChatBookmark[]): AppStats => {
  return {
    totalPrompts: prompts.length,
    totalChats: chats.length,
    pinnedPrompts: prompts.filter(p => p.isPinned).length,
    totalUsage: prompts.reduce((sum, p) => sum + p.usageCount, 0) + 
                chats.reduce((sum, c) => sum + (c.accessCount || 0), 0),
    activeWorkspaces: Array.from(new Set([
      ...prompts.map(p => p.workspace),
      ...chats.map(c => c.workspace)
    ])).length,
  };
};

const updateAndFilterState = (state: UnifiedState) => {
  // Combine workspaces from both prompts and chats
  const promptWorkspaces = state.prompts.map(p => p.workspace).filter(Boolean);
  const chatWorkspaces = state.chats.map(c => c.workspace).filter(Boolean);
  const workspaces = Array.from(new Set(['General', ...promptWorkspaces, ...chatWorkspaces]));
  
  // Combine tags from both prompts and chats
  const promptTags = state.prompts.flatMap(p => p.tags || []);
  const chatTags = state.chats.flatMap(c => c.tags || []);
  const allTags = Array.from(new Set([...promptTags, ...chatTags]));
  
  // Calculate statistics
  const stats = calculateStats(state.prompts, state.chats);
  
  // Get filtered items (unified)
  const filteredItems = getFilteredAndSortedItems(
    state.prompts,
    state.chats,
    state.searchTerm,
    state.sortBy,
    state.filterTag,
    state.showPinned,
    state.contentFilter,
    state.selectedWorkspace
  );
  
  // Get filtered prompts (backwards compatibility)
  const filteredPrompts = getFilteredAndSortedPrompts(
    state.prompts,
    state.searchTerm,
    state.sortBy,
    state.filterTag,
    state.showPinned
  );
  
  return { ...state, workspaces, allTags, stats, filteredItems, filteredPrompts };
};

export const useUnifiedStore = create<UnifiedState>((set, get) => ({
  // Initial state
  prompts: [],
  chats: [],
  isLoading: true,
  error: null,
  
  searchTerm: '',
  sortBy: 'recent',
  filterTag: 'all',
  showPinned: false,
  contentFilter: 'all',
  selectedWorkspace: 'all',
  
  currentView: 'list',
  editingPrompt: null,
  editingChat: null,
  
  workspaces: ['General'],
  allTags: [],
  filteredItems: [],
  filteredPrompts: [],
  
  stats: {
    totalPrompts: 0,
    totalChats: 0,
    pinnedPrompts: 0,
    totalUsage: 0,
    activeWorkspaces: 0,
  },

  // Load all data
  loadAll: async () => {
    try {
      set({ isLoading: true, error: null });
      logger.log('Loading all data...');
      
      const [prompts, chats] = await Promise.all([
        promptStorage.getAll(),
        chatStorage.getAll()
      ]);
      
      set(state => updateAndFilterState({ 
        ...state, 
        prompts, 
        chats, 
        isLoading: false 
      }));
      
      logger.log('All data loaded successfully', { 
        promptCount: prompts.length, 
        chatCount: chats.length 
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load data';
      logger.error('Failed to load data:', err);
      set({ error, isLoading: false });
    }
  },

  // Prompt actions (existing)
  loadPrompts: async () => {
    try {
      set({ isLoading: true, error: null });
      const prompts = await promptStorage.getAll();
      set(state => updateAndFilterState({ ...state, prompts, isLoading: false }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load prompts';
      set({ error, isLoading: false });
    }
  },

  addPrompt: async (prompt) => {
    try {
      const newPrompt = await promptStorage.add(prompt);
      set(state => updateAndFilterState({ ...state, prompts: [...state.prompts, newPrompt] }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add prompt';
      set({ error });
    }
  },

  updatePrompt: async (prompt) => {
    try {
      const updatedPrompt = await promptStorage.update(prompt);
      set(state => {
        const updatedPrompts = state.prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
        return updateAndFilterState({ ...state, prompts: updatedPrompts });
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update prompt';
      set({ error });
    }
  },

  deletePrompt: async (id) => {
    try {
      await promptStorage.delete(id);
      set(state => {
        const updatedPrompts = state.prompts.filter((p) => p.id !== id);
        return updateAndFilterState({ ...state, prompts: updatedPrompts });
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete prompt';
      set({ error });
    }
  },

  togglePinPrompt: async (id) => {
    try {
      const state = get();
      const prompt = state.prompts.find(p => p.id === id);
      if (!prompt) throw new Error('Prompt not found');
      
      const updatedPrompt = { ...prompt, isPinned: !prompt.isPinned };
      await get().updatePrompt(updatedPrompt);
    } catch (err) {
      logger.error('Failed to toggle pin:', err);
    }
  },

  incrementUsage: async (id) => {
    try {
      const state = get();
      const prompt = state.prompts.find(p => p.id === id);
      if (!prompt) throw new Error('Prompt not found');
      
      const updatedPrompt = { 
        ...prompt, 
        usageCount: (prompt.usageCount || 0) + 1,
        lastUsed: new Date().toISOString()
      };
      await get().updatePrompt(updatedPrompt);
    } catch (err) {
      logger.error('Failed to increment usage:', err);
    }
  },

  // Chat actions (new)
  loadChats: async () => {
    try {
      const chats = await chatStorage.getAll();
      set(state => updateAndFilterState({ ...state, chats }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load chats';
      set({ error });
    }
  },

  addChat: async (chat) => {
    try {
      const newChat = await chatStorage.add(chat);
      set(state => updateAndFilterState({ ...state, chats: [...state.chats, newChat] }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add chat';
      set({ error });
    }
  },

  updateChat: async (chat) => {
    try {
      const updatedChat = await chatStorage.update(chat);
      set(state => {
        const updatedChats = state.chats.map((c) => (c.id === updatedChat.id ? updatedChat : c));
        return updateAndFilterState({ ...state, chats: updatedChats });
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update chat';
      set({ error });
    }
  },

  deleteChat: async (id) => {
    try {
      await chatStorage.delete(id);
      set(state => {
        const updatedChats = state.chats.filter((c) => c.id !== id);
        return updateAndFilterState({ ...state, chats: updatedChats });
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete chat';
      set({ error });
    }
  },

  togglePinChat: async (id) => {
    try {
      const state = get();
      const chat = state.chats.find(c => c.id === id);
      if (!chat) throw new Error('Chat not found');
      
      const updatedChat = { ...chat, isPinned: !chat.isPinned };
      await get().updateChat(updatedChat);
    } catch (err) {
      logger.error('Failed to toggle chat pin:', err);
    }
  },

  incrementChatAccess: async (id) => {
    try {
      await chatStorage.incrementAccess(id);
      // Update only the specific chat in the store
      set(state => {
        const updatedChats = state.chats.map(chat =>
          chat.id === id
            ? {
                ...chat,
                accessCount: (chat.accessCount || 0) + 1,
                lastAccessed: new Date().toISOString()
              }
            : chat
        );
        return updateAndFilterState({ ...state, chats: updatedChats });
      });
    } catch (err) {
      logger.error('Failed to increment chat access:', err);
    }
  },

  // Filter actions
  setSearchTerm: (term) => set(state => updateAndFilterState({ ...state, searchTerm: term })),
  setSortBy: (sortBy) => set(state => updateAndFilterState({ ...state, sortBy })),
  setFilterTag: (tag) => set(state => updateAndFilterState({ ...state, filterTag: tag })),
  setShowPinned: (show) => set(state => updateAndFilterState({ ...state, showPinned: show })),
  setContentFilter: (filter) => set(state => updateAndFilterState({ ...state, contentFilter: filter })),
  setSelectedWorkspace: (workspace) => set(state => updateAndFilterState({ ...state, selectedWorkspace: workspace })),
  
  resetFilters: () => set(state => updateAndFilterState({ 
    ...state, 
    searchTerm: '', 
    filterTag: 'all', 
    showPinned: false,
    contentFilter: 'all',
    selectedWorkspace: 'all'
  })),
  
  // View actions
  setCurrentView: (view) => set({ currentView: view }),
  setEditingPrompt: (prompt) => set({ editingPrompt: prompt }),
  setEditingChat: (chat) => set({ editingChat: chat }),
  
  // Unified actions
  openItem: (item) => {
    if (item.type === 'prompt') {
      get().setEditingPrompt(item.data as Prompt);
      get().setCurrentView('form');
    } else if (item.type === 'chat') {
      const chat = item.data as ChatBookmark;
      // Open chat in new tab and increment access
      window.open(chat.url, '_blank');
      get().incrementChatAccess(chat.id);
    }
  },
}));

// Create alias for backwards compatibility
export const usePromptStore = useUnifiedStore;
