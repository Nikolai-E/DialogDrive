import { create } from 'zustand';
import type { Prompt } from '~/types/prompt';
import { promptStorage } from '~/lib/storage';
import { logger, logPromptAction } from '~/lib/logger';

type AddPrompt = Omit<Prompt, 'id' | 'created'>;

interface PromptState {
  prompts: Prompt[];
  activePromptId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Search and filter state
  searchQuery: string;
  selectedWorkspace: string;
  showPinnedOnly: boolean;
  
  // View state
  currentView: 'list' | 'form' | 'settings';
  editingPrompt: Prompt | null;
  
  // Derived data
  workspaces: string[];
  allTags: string[];

  // Actions
  loadPrompts: () => Promise<void>;
  addPrompt: (prompt: AddPrompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setActivePromptId: (id: string | null) => void;
  
  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setSelectedWorkspace: (workspace: string) => void;
  setShowPinnedOnly: (show: boolean) => void;
  resetFilters: () => void;
  
  // View actions
  setCurrentView: (view: 'list' | 'form' | 'settings') => void;
  setEditingPrompt: (prompt: Prompt | null) => void;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: [],
  activePromptId: null,
  isLoading: true,
  error: null,
  
  // Search and filter state
  searchQuery: '',
  selectedWorkspace: 'All',
  showPinnedOnly: false,
  
  // View state
  currentView: 'list',
  editingPrompt: null,
  
  // Derived data
  workspaces: ['General'],
  allTags: [],

  loadPrompts: async () => {
    try {
      set({ isLoading: true, error: null });
      logPromptAction('Loading prompts from storage');
      
      const prompts = await promptStorage.getAll();
      
      // Extract workspaces and tags
      const workspaces = Array.from(new Set(['General', ...prompts.map(p => p.workspace).filter(Boolean)]));
      const allTags = Array.from(new Set(prompts.flatMap(p => p.tags || [])));
      
      set({ prompts, workspaces, allTags, isLoading: false });
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
      
      set((state) => {
        const updatedPrompts = [...state.prompts, newPrompt];
        const workspaces = Array.from(new Set(['General', ...updatedPrompts.map(p => p.workspace).filter(Boolean)]));
        const allTags = Array.from(new Set(updatedPrompts.flatMap(p => p.tags || [])));
        
        return { 
          prompts: updatedPrompts,
          workspaces,
          allTags
        };
      });
      
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
      
      set((state) => {
        const updatedPrompts = state.prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
        const workspaces = Array.from(new Set(['General', ...updatedPrompts.map(p => p.workspace).filter(Boolean)]));
        const allTags = Array.from(new Set(updatedPrompts.flatMap(p => p.tags || [])));
        
        return { 
          prompts: updatedPrompts,
          workspaces,
          allTags
        };
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
      
      set((state) => {
        const updatedPrompts = state.prompts.filter((p) => p.id !== id);
        const workspaces = Array.from(new Set(['General', ...updatedPrompts.map(p => p.workspace).filter(Boolean)]));
        const allTags = Array.from(new Set(updatedPrompts.flatMap(p => p.tags || [])));
        
        return { 
          prompts: updatedPrompts,
          workspaces,
          allTags
        };
      });
      
      logPromptAction('Prompt deleted successfully', id);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete prompt';
      logger.error('Failed to delete prompt:', err);
      set({ error });
    }
  },

  togglePin: async (id) => {
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

  setActivePromptId: (id) => {
    set({ activePromptId: id });
    logPromptAction('Set active prompt', id || undefined);
  },
  
  // Search and filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedWorkspace: (workspace) => set({ selectedWorkspace: workspace }),
  setShowPinnedOnly: (show) => set({ showPinnedOnly: show }),
  resetFilters: () => set({ 
    searchQuery: '', 
    selectedWorkspace: 'All', 
    showPinnedOnly: false 
  }),
  
  // View actions
  setCurrentView: (view) => set({ currentView: view }),
  setEditingPrompt: (prompt) => set({ editingPrompt: prompt }),
}));
