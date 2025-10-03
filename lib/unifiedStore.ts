// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Zustand store that unifies prompts, chats, filters, and destructive actions.

import { toast } from 'sonner';
import { create } from 'zustand';
import type { AppStats, SortOption, ViewType } from '../types/app';
import type { AddChatBookmark, ChatBookmark, WorkspaceItem } from '../types/chat';
import type { Prompt } from '../types/prompt';
import { chatStorage } from './chatStorage';
import { logger } from './logger';
import { secureStorage } from './secureStorageV2';
import { promptStorage } from './storage';

type AddPrompt = Omit<Prompt, 'id' | 'created'>;
type ContentFilter = 'all' | 'prompts' | 'chats';

interface UnifiedState {
  // Data.
  prompts: Prompt[];
  chats: ChatBookmark[];
  isLoading: boolean;
  error: string | null;

  // Pagination.
  pageSize: number;
  promptsCursor: string | null; // Opaque cursor or ISO date id.
  chatsCursor: string | null;
  hasMorePrompts: boolean;
  hasMoreChats: boolean;
  isLoadingMorePrompts: boolean;
  isLoadingMoreChats: boolean;

  // Search and filter state.
  searchTerm: string;
  sortBy: SortOption;
  filterTag: string;
  selectedTags: string[]; // Allow multi-tag selection (OR semantics).
  showPinned: boolean;
  contentFilter: ContentFilter; // Filter by content type.
  selectedWorkspace: string; // Filter by workspace label.

  // View state.
  currentView: ViewType;
  editingPrompt: Prompt | null;
  editingChat: ChatBookmark | null; // Track focused chat for editing.

  // Derived data.
  workspaces: string[];
  allTags: string[];
  filteredItems: WorkspaceItem[]; // Mixed prompt/chat items.
  filteredPrompts: Prompt[]; // Backwards compatibility.

  // Statistics.
  stats: AppStats;
  lastClearedAt: string | null;

  // Prompt actions.
  loadPrompts: (opts?: { reset?: boolean }) => Promise<void>;
  fetchMorePrompts: () => Promise<void>;
  addPrompt: (prompt: AddPrompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  togglePinPrompt: (id: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;

  // Chat actions.
  loadChats: (opts?: { reset?: boolean }) => Promise<void>;
  fetchMoreChats: () => Promise<void>;
  addChat: (chat: AddChatBookmark) => Promise<void>;
  updateChat: (chat: ChatBookmark) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  togglePinChat: (id: string) => Promise<void>;
  incrementChatAccess: (id: string) => Promise<void>;

  // Search and filter actions.
  setSearchTerm: (term: string) => void;
  setSortBy: (sortBy: SortOption) => void;
  setFilterTag: (tag: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setShowPinned: (show: boolean) => void;
  setContentFilter: (filter: ContentFilter) => void;
  setSelectedWorkspace: (workspace: string) => void;
  resetFilters: () => void;

  // View actions.
  setCurrentView: (view: ViewType) => void;
  setEditingPrompt: (prompt: Prompt | null) => void;
  setEditingChat: (chat: ChatBookmark | null) => void;

  // Unified actions.
  loadAll: () => Promise<void>; // Load both prompts and chats (first page).
  openItem: (item: WorkspaceItem) => void; // Open prompt for edit or chat in new tab.
  addWorkspace: (name: string) => void; // Add workspace label.
  deleteWorkspace: (name: string) => Promise<void>; // Delete workspace and migrate items.
  deleteTag: (tag: string) => Promise<void>; // Delete a tag from all items.
  clearAllData: () => Promise<void>;
}

// Convert prompt to WorkspaceItem
// Gives the list a shared shape regardless of the underlying source.
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
  data: prompt,
});

// Convert chat to WorkspaceItem
// Matches the same view model so the mixer can treat chats like prompts.
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
  data: chat,
});

// Helper to filter and sort unified items
// Central brain for search, tag filters, pin-first ordering, etc.
const getFilteredAndSortedItems = (
  prompts: Prompt[],
  chats: ChatBookmark[],
  searchTerm: string,
  sortBy: SortOption,
  filterTag: string,
  selectedTags: string[],
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
    items = items.filter((item) => item.isPinned);
  }

  // Tag filtering: if multi selectedTags provided, OR-match; otherwise fallback to single filterTag
  const effectiveTags =
    selectedTags && selectedTags.length > 0 ? selectedTags : filterTag !== 'all' ? [filterTag] : [];
  if (effectiveTags.length > 0) {
    // AND semantics: require all selected tags to be present on the item
    items = items.filter((item) => effectiveTags.every((t) => item.tags?.includes(t)));
  }

  if (selectedWorkspace !== 'all') {
    items = items.filter((item) => item.workspace === selectedWorkspace);
  }

  if (searchTerm) {
    const lowercasedTerm = searchTerm.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(lowercasedTerm) ||
        (item.type === 'prompt' &&
          (item.data as Prompt).text.toLowerCase().includes(lowercasedTerm)) ||
        (item.type === 'chat' &&
          (item.data as ChatBookmark).description?.toLowerCase().includes(lowercasedTerm)) ||
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
      default: {
        const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return dateB - dateA;
      }
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
  selectedTags: string[],
  showPinned: boolean
): Prompt[] => {
  let result = prompts;

  if (showPinned) {
    result = result.filter((p) => p.isPinned);
  }
  const effectiveTags =
    selectedTags && selectedTags.length > 0 ? selectedTags : filterTag !== 'all' ? [filterTag] : [];
  if (effectiveTags.length > 0) {
    // AND semantics: require all selected tags to be present on the prompt
    result = result.filter((p) => effectiveTags.every((t) => p.tags?.includes(t)));
  }
  if (searchTerm) {
    const lowercasedTerm = searchTerm.toLowerCase();
    result = result.filter(
      (p) =>
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
      default: {
        const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return dateB - dateA;
      }
    }
  });

  return result;
};

const calculateStats = (prompts: Prompt[], chats: ChatBookmark[]): AppStats => {
  // Collapses key counts used on the settings screen.
  return {
    totalPrompts: prompts.length,
    totalChats: chats.length,
    pinnedPrompts: prompts.filter((p) => p.isPinned).length,
    totalUsage:
      prompts.reduce((sum, p) => sum + p.usageCount, 0) +
      chats.reduce((sum, c) => sum + (c.accessCount || 0), 0),
    activeWorkspaces: Array.from(
      new Set([...prompts.map((p) => p.workspace), ...chats.map((c) => c.workspace)])
    ).length,
  };
};

const updateAndFilterState = (state: UnifiedState) => {
  // Sync derived lists, tags, workspaces, and stats anytime base data changes.
  // Combine workspaces from both prompts and chats, and preserve any user-added ones already in state
  const promptWorkspaces = state.prompts.map((p) => p.workspace).filter(Boolean);
  const chatWorkspaces = state.chats.map((c) => c.workspace).filter(Boolean);
  const existing = Array.isArray(state.workspaces) ? state.workspaces : [];
  const workspaces = Array.from(
    new Set(['General', ...existing, ...promptWorkspaces, ...chatWorkspaces])
  ).sort((a, b) => a.localeCompare(b));

  // Combine tags from both prompts and chats
  const promptTags = state.prompts.flatMap((p) => p.tags || []);
  const chatTags = state.chats.flatMap((c) => c.tags || []);
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
    state.selectedTags,
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
    state.selectedTags,
    state.showPinned
  );

  return { ...state, workspaces, allTags, stats, filteredItems, filteredPrompts };
};

// Build the shared Zustand store that backs the popup UI.
export const useUnifiedStore = create<UnifiedState>((set, get) => ({
  // Initial state
  prompts: [],
  chats: [],
  isLoading: true,
  error: null,

  // Pagination defaults
  pageSize: 50,
  promptsCursor: null,
  chatsCursor: null,
  hasMorePrompts: true,
  hasMoreChats: true,
  isLoadingMorePrompts: false,
  isLoadingMoreChats: false,

  searchTerm: '',
  sortBy: 'recent',
  filterTag: 'all',
  selectedTags: [],
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
  lastClearedAt: null,

  // Load all data (first page only)
  // Pulls the opening batch for prompts, chats, and last-cleared meta.
  loadAll: async () => {
    try {
      set({
        isLoading: true,
        error: null,
        promptsCursor: null,
        chatsCursor: null,
        hasMorePrompts: true,
        hasMoreChats: true,
      });
      logger.log('Loading first page of prompts and chats...');

      const { pageSize } = get();
      // Prefer paged APIs if available, fall back to getAll
      const loadPromptsPaged = async () => {
        if (typeof (promptStorage as any).getPage === 'function') {
          return (promptStorage as any).getPage({ limit: pageSize, cursor: null });
        }
        const all = await promptStorage.getAll();
        return {
          items: all.slice(0, pageSize),
          nextCursor: all.length > pageSize ? (all[pageSize - 1]?.id ?? null) : null,
        };
      };
      const loadChatsPaged = async () => {
        if (typeof (chatStorage as any).getPage === 'function') {
          return (chatStorage as any).getPage({ limit: pageSize, cursor: null });
        }
        const all = await chatStorage.getAll();
        return {
          items: all.slice(0, pageSize),
          nextCursor: all.length > pageSize ? (all[pageSize - 1]?.id ?? null) : null,
        };
      };

      const [pRes, cRes, clearedAt] = await Promise.all([
        loadPromptsPaged(),
        loadChatsPaged(),
        secureStorage.getLastClearedAt(),
      ]);

      set((state) =>
        updateAndFilterState({
          ...state,
          prompts: pRes.items,
          chats: cRes.items,
          promptsCursor: pRes.nextCursor ?? null,
          chatsCursor: cRes.nextCursor ?? null,
          hasMorePrompts: !!pRes.nextCursor,
          hasMoreChats: !!cRes.nextCursor,
          isLoading: false,
          lastClearedAt: clearedAt ?? state.lastClearedAt,
        })
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load data';
      logger.error('Failed to load data:', err);
      set({ error, isLoading: false });
    }
  },

  // Prompt actions with pagination
  // Supports both fresh loads and infinite scroll fetches.
  loadPrompts: async ({ reset } = { reset: false }) => {
    try {
      if (reset) set({ prompts: [], promptsCursor: null, hasMorePrompts: true });
      set({ isLoading: true, error: null });
      const { pageSize, promptsCursor } = get();
      if (typeof (promptStorage as any).getPage === 'function') {
        const res = await (promptStorage as any).getPage({
          limit: pageSize,
          cursor: reset ? null : promptsCursor,
        });
        set((state) =>
          updateAndFilterState({
            ...state,
            prompts: reset ? res.items : [...state.prompts, ...res.items],
            promptsCursor: res.nextCursor ?? null,
            hasMorePrompts: !!res.nextCursor,
            isLoading: false,
          })
        );
      } else {
        const all = await promptStorage.getAll();
        set((state) =>
          updateAndFilterState({
            ...state,
            prompts: all.slice(0, pageSize),
            promptsCursor: all.length > pageSize ? (all[pageSize - 1]?.id ?? null) : null,
            hasMorePrompts: all.length > pageSize,
            isLoading: false,
          })
        );
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load prompts';
      set({ error, isLoading: false });
    }
  },

  fetchMorePrompts: async () => {
    // Load next prompt page when the user scrolls for more.
    const { hasMorePrompts, isLoadingMorePrompts, pageSize, promptsCursor } = get();
    if (!hasMorePrompts || isLoadingMorePrompts) return;
    try {
      set({ isLoadingMorePrompts: true });
      if (typeof (promptStorage as any).getPage === 'function') {
        const res = await (promptStorage as any).getPage({
          limit: pageSize,
          cursor: promptsCursor,
        });
        set((state) =>
          updateAndFilterState({
            ...state,
            prompts: [...state.prompts, ...res.items],
            promptsCursor: res.nextCursor ?? null,
            hasMorePrompts: !!res.nextCursor,
            isLoadingMorePrompts: false,
          })
        );
      } else {
        set({ isLoadingMorePrompts: false });
      }
    } catch (err) {
      logger.error('Failed to fetch more prompts', err);
      set({ isLoadingMorePrompts: false });
    }
  },

  addPrompt: async (prompt) => {
    try {
      const newPrompt = await promptStorage.add(prompt);
      set((state) => updateAndFilterState({ ...state, prompts: [newPrompt, ...state.prompts] }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add prompt';
      set({ error });
    }
  },

  updatePrompt: async (prompt) => {
    try {
      const updatedPrompt = await promptStorage.update(prompt);
      set((state) => {
        const updatedPrompts = state.prompts.map((p) =>
          p.id === updatedPrompt.id ? updatedPrompt : p
        );
        return updateAndFilterState({ ...state, prompts: updatedPrompts });
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update prompt';
      set({ error });
    }
  },

  deletePrompt: async (id) => {
    try {
      await promptStorage.remove(id);
      set((state) => {
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
      const prompt = state.prompts.find((p) => p.id === id);
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
      const prompt = state.prompts.find((p) => p.id === id);
      if (!prompt) throw new Error('Prompt not found');
      const updatedPrompt = {
        ...prompt,
        usageCount: (prompt.usageCount || 0) + 1,
        lastUsed: new Date().toISOString(),
      };
      await get().updatePrompt(updatedPrompt);
    } catch (err) {
      logger.error('Failed to increment usage:', err);
    }
  },

  // Chat actions with pagination
  loadChats: async ({ reset } = { reset: false }) => {
    try {
      if (reset) set({ chats: [], chatsCursor: null, hasMoreChats: true });
      const { pageSize, chatsCursor } = get();
      if (typeof (chatStorage as any).getPage === 'function') {
        const res = await (chatStorage as any).getPage({
          limit: pageSize,
          cursor: reset ? null : chatsCursor,
        });
        set((state) =>
          updateAndFilterState({
            ...state,
            chats: reset ? res.items : [...state.chats, ...res.items],
            chatsCursor: res.nextCursor ?? null,
            hasMoreChats: !!res.nextCursor,
          })
        );
      } else {
        const all = await chatStorage.getAll();
        set((state) =>
          updateAndFilterState({
            ...state,
            chats: all.slice(0, pageSize),
            chatsCursor: all.length > pageSize ? (all[pageSize - 1]?.id ?? null) : null,
            hasMoreChats: all.length > pageSize,
          })
        );
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load chats';
      set({ error });
    }
  },

  fetchMoreChats: async () => {
    // Append another chat page if the backend exposes pagination.
    const { hasMoreChats, isLoadingMoreChats, pageSize, chatsCursor } = get();
    if (!hasMoreChats || isLoadingMoreChats) return;
    try {
      set({ isLoadingMoreChats: true });
      if (typeof (chatStorage as any).getPage === 'function') {
        const res = await (chatStorage as any).getPage({ limit: pageSize, cursor: chatsCursor });
        set((state) =>
          updateAndFilterState({
            ...state,
            chats: [...state.chats, ...res.items],
            chatsCursor: res.nextCursor ?? null,
            hasMoreChats: !!res.nextCursor,
            isLoadingMoreChats: false,
          })
        );
      } else {
        set({ isLoadingMoreChats: false });
      }
    } catch (err) {
      logger.error('Failed to fetch more chats', err);
      set({ isLoadingMoreChats: false });
    }
  },

  addChat: async (chat) => {
    try {
      const newChat = await chatStorage.add(chat);
      set((state) =>
        updateAndFilterState({ ...state, chats: [newChat, ...state.chats], error: null })
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add chat';
      set({ error });
      throw err instanceof Error ? err : new Error(error);
    }
  },

  updateChat: async (chat) => {
    try {
      const updatedChat = await chatStorage.update(chat);
      set((state) => {
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
      set((state) => {
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
      const chat = state.chats.find((c) => c.id === id);
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
      set((state) => {
        const updatedChats = state.chats.map((chat) =>
          chat.id === id
            ? {
                ...chat,
                accessCount: (chat.accessCount || 0) + 1,
                lastAccessed: new Date().toISOString(),
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
  setSearchTerm: (term) => set((state) => updateAndFilterState({ ...state, searchTerm: term })),
  setSortBy: (sortBy) => set((state) => updateAndFilterState({ ...state, sortBy })),
  setFilterTag: (tag) => set((state) => updateAndFilterState({ ...state, filterTag: tag })),
  setSelectedTags: (tags) => set((state) => updateAndFilterState({ ...state, selectedTags: tags })),
  setShowPinned: (show) => set((state) => updateAndFilterState({ ...state, showPinned: show })),
  setContentFilter: (filter) =>
    set((state) => updateAndFilterState({ ...state, contentFilter: filter })),
  setSelectedWorkspace: (workspace) =>
    set((state) => updateAndFilterState({ ...state, selectedWorkspace: workspace })),

  resetFilters: () =>
    set((state) =>
      updateAndFilterState({
        ...state,
        searchTerm: '',
        filterTag: 'all',
        selectedTags: [],
        showPinned: false,
        contentFilter: 'all',
        selectedWorkspace: 'all',
      })
    ),

  // View actions
  setCurrentView: (view) => set({ currentView: view }),
  setEditingPrompt: (prompt) => set({ editingPrompt: prompt }),
  setEditingChat: (chat) => set({ editingChat: chat }),

  // Unified actions
  openItem: (item) => {
    // Opens the prompt editor or launches the chat tab based on item kind.
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
  addWorkspace: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) =>
      state.workspaces.includes(trimmed)
        ? state
        : {
            ...state,
            workspaces: [...state.workspaces, trimmed].sort((a, b) => a.localeCompare(b)),
          }
    );
  },
  deleteWorkspace: async (name: string) => {
    // Moves everything back to General before dropping the workspace label.
    if (!name || name === 'General') return; // prevent deleting General
    try {
      const state = get();
      // Update prompts
      const updatedPrompts = state.prompts.map((p) =>
        p.workspace === name ? { ...p, workspace: 'General' } : p
      );
      // Persist prompts (bulk if available)
      try {
        if (typeof (promptStorage as any).bulkUpdate === 'function') {
          await (promptStorage as any).bulkUpdate(updatedPrompts);
        } else {
          for (const p of updatedPrompts) {
            await promptStorage.update(p);
          }
        }
      } catch (e) {
        logger.warn('Failed bulk prompt update during workspace delete, attempting per-item', e);
        for (const p of updatedPrompts) {
          await promptStorage.update(p);
        }
      }
      // Update chats
      const updatedChats: any[] = [];
      for (const c of state.chats) {
        if (c.workspace === name) {
          const updated = { ...c, workspace: 'General' };
          try {
            await chatStorage.update(updated);
          } catch {}
          updatedChats.push(updated);
        } else {
          updatedChats.push(c);
        }
      }
      // Also drop the workspace label from the selectable list immediately
      set((s) =>
        updateAndFilterState({
          ...s,
          prompts: updatedPrompts,
          chats: updatedChats,
          workspaces: s.workspaces.filter((w) => w !== name),
        })
      );
    } catch (err) {
      logger.error('Failed to delete workspace', err);
    }
  },
  deleteTag: async (tag: string) => {
    // Strips the tag from prompts and chats everywhere it appears.
    if (!tag) return;
    try {
      const state = get();
      const updatedPrompts = state.prompts.map((p) =>
        p.tags?.includes(tag) ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p
      );
      // Persist prompts
      try {
        if (typeof (promptStorage as any).bulkUpdate === 'function') {
          await (promptStorage as any).bulkUpdate(updatedPrompts);
        } else {
          for (const p of updatedPrompts) {
            await promptStorage.update(p);
          }
        }
      } catch (e) {
        logger.warn('Failed bulk prompt update during tag delete, attempting per-item', e);
        for (const p of updatedPrompts) {
          await promptStorage.update(p);
        }
      }
      const updatedChats: any[] = [];
      for (const c of state.chats) {
        if (c.tags?.includes(tag)) {
          const updated = { ...c, tags: c.tags.filter((t) => t !== tag) };
          try {
            await chatStorage.update(updated);
          } catch {}
          updatedChats.push(updated);
        } else {
          updatedChats.push(c);
        }
      }
      set((s) => updateAndFilterState({ ...s, prompts: updatedPrompts, chats: updatedChats }));
    } catch (err) {
      logger.error('Failed to delete tag', err);
    }
  },
  clearAllData: async () => {
    // Nukes every saved record and records the wipe timestamp.
    try {
      const timestamp = new Date().toISOString();
      await secureStorage.clearAll();
      await secureStorage.setLastClearedAt(timestamp);
      set((state) =>
        updateAndFilterState({
          ...state,
          prompts: [],
          chats: [],
          // Reset selectable lists after a full wipe
          workspaces: ['General'],
          stats: {
            totalPrompts: 0,
            totalChats: 0,
            pinnedPrompts: 0,
            totalUsage: 0,
            activeWorkspaces: 1,
          },
          isLoading: false,
          error: null,
          promptsCursor: null,
          chatsCursor: null,
          hasMorePrompts: false,
          hasMoreChats: false,
          isLoadingMorePrompts: false,
          isLoadingMoreChats: false,
          searchTerm: '',
          sortBy: 'recent',
          filterTag: 'all',
          selectedTags: [],
          showPinned: false,
          contentFilter: 'all',
          selectedWorkspace: 'all',
          currentView: 'list',
          editingPrompt: null,
          editingChat: null,
          lastClearedAt: timestamp,
        })
      );
      toast.success('DialogDrive data deleted from this browser.');
    } catch (err) {
      logger.error('Failed to clear DialogDrive data', err);
      toast.error('Could not clear DialogDrive data. Please try again.');
    }
  },
}));

// Create alias for backwards compatibility
export const usePromptStore = useUnifiedStore;
