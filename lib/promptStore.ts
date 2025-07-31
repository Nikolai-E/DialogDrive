import { create } from 'zustand';
import type { Prompt } from '../types/prompt';
import { promptStorage } from './storage';
import { logger, logPromptAction } from './logger';

type AddPrompt = Omit<Prompt, 'id' | 'created'>;
type SortByType = 'lastUsed' | 'title' | 'usageCount';

interface PromptState {
  prompts: Prompt[];
  isLoading: boolean;
  error: string | null;
  
  // Search and filter state
  searchTerm: string;
  sortBy: SortByType;
  filterTag: string;
  showPinned: boolean;
  
  // View state
  currentView: 'list' | 'form' | 'settings';
  editingPrompt: Prompt | null;
  
  // Derived data
  workspaces: string[];
  allTags: string[];
  filteredPrompts: Prompt[];

  // Actions
  loadPrompts: () => Promise<void>;
  addPrompt: (prompt: AddPrompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  togglePinPrompt: (id: string) => Promise<void>;
  
  // Search and filter actions
  setSearchTerm: (term: string) => void;
  setSortBy: (sortBy: SortByType) => void;
  setFilterTag: (tag: string) => void;
  setShowPinned: (show: boolean) => void;
  resetFilters: () => void;
  
  // View actions
  setCurrentView: (view: 'list' | 'form' | 'settings') => void;
  setEditingPrompt: (prompt: Prompt | null) => void;
}

// Helper to update derived state and apply filters/sorting
const getFilteredAndSortedPrompts = (
  prompts: Prompt[],
  searchTerm: string,
  sortBy: SortByType,
  filterTag: string,
  showPinned: boolean
): Prompt[] => {
  let result = prompts;

  // Filtering
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

  // Sorting
  result.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'usageCount':
        return b.usageCount - a.usageCount;
      case 'lastUsed':
      default:
        // Ensure lastUsed is treated as a number for sorting
        const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return dateB - dateA;
    }
  });

  return result;
};

const updateAndFilterState = (state: PromptState) => {
  const workspaces = Array.from(new Set(['General', ...state.prompts.map(p => p.workspace).filter(Boolean)]));
  const allTags = Array.from(new Set(state.prompts.flatMap(p => p.tags || [])));
  const filteredPrompts = getFilteredAndSortedPrompts(
    state.prompts,
    state.searchTerm,
    state.sortBy,
    state.filterTag,
    state.showPinned
  );
  return { ...state, workspaces, allTags, filteredPrompts };
};

export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: [],
  isLoading: true,
  error: null,
  
  searchTerm: '',
  sortBy: 'lastUsed',
  filterTag: 'all',
  showPinned: false,
  
  currentView: 'list',
  editingPrompt: null,
  
  workspaces: ['General'],
  allTags: [],
  filteredPrompts: [],

  loadPrompts: async () => {
    try {
      set({ isLoading: true, error: null });
      logPromptAction('Loading prompts from storage');
      
      const prompts = await promptStorage.getAll();
      
      set(state => updateAndFilterState({ ...state, prompts, isLoading: false }));
      logPromptAction('Prompts loaded successfully', undefined, { count: prompts.length });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load prompts';
      logger.error('Failed to load prompts:', err);
      set({ error, isLoading: false });
    }
  },

  addPrompt: async (prompt) => {
    try {
      logPromptAction('Adding new prompt', undefined, { title: prompt.title });
      const newPrompt = await promptStorage.add(prompt);
      
      set(state => updateAndFilterState({ ...state, prompts: [...state.prompts, newPrompt] }));
      
      logPromptAction('Prompt added successfully', newPrompt.id);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add prompt';
      logger.error('Failed to add prompt:', err);
      set({ error });
    }
  },

  updatePrompt: async (prompt) => {
    try {
      logPromptAction('Updating prompt', prompt.id, { title: prompt.title });
      const updatedPrompt = await promptStorage.update(prompt);
      
      set(state => {
        const updatedPrompts = state.prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
        return updateAndFilterState({ ...state, prompts: updatedPrompts });
      });
      
      logPromptAction('Prompt updated successfully', prompt.id);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update prompt';
      logger.error('Failed to update prompt:', err);
      set({ error });
    }
  },

  deletePrompt: async (id) => {
    try {
      logPromptAction('Deleting prompt', id);
      await promptStorage.delete(id);
      
      set(state => {
        const updatedPrompts = state.prompts.filter((p) => p.id !== id);
        return updateAndFilterState({ ...state, prompts: updatedPrompts });
      });
      
      logPromptAction('Prompt deleted successfully', id);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete prompt';
      logger.error('Failed to delete prompt:', err);
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
      
      logPromptAction('Toggled pin status', id, { isPinned: updatedPrompt.isPinned });
    } catch (err) {
      logger.error('Failed to toggle pin:', err);
    }
  },
  
  setSearchTerm: (term) => set(state => updateAndFilterState({ ...state, searchTerm: term })),
  setSortBy: (sortBy) => set(state => updateAndFilterState({ ...state, sortBy })),
  setFilterTag: (tag) => set(state => updateAndFilterState({ ...state, filterTag: tag })),
  setShowPinned: (show) => set(state => updateAndFilterState({ ...state, showPinned: show })),
  
  setCurrentView: (view) => set({ currentView: view }),
  setEditingPrompt: (prompt) => set({ editingPrompt: prompt }),
  
  resetFilters: () => set(state => updateAndFilterState({ 
    ...state, 
    searchTerm: '', 
    filterTag: 'all', 
    showPinned: false 
  })),
}));

