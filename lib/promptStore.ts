import { create } from 'zustand';
import type { Prompt } from '~/types/prompt';
import { promptStorage } from '~/lib/storage';

type AddPrompt = Omit<Prompt, 'id' | 'created'>;

interface PromptState {
  prompts: Prompt[];
  activePromptId: string | null;
  isLoading: boolean;
  error: string | null;

  loadPrompts: () => Promise<void>;
  addPrompt: (prompt: AddPrompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  setActivePromptId: (id: string | null) => void;
}

export const usePromptStore = create<PromptState>((set) => ({
  prompts: [],
  activePromptId: null,
  isLoading: true,
  error: null,

  loadPrompts: async () => {
    try {
      set({ isLoading: true, error: null });
      const prompts = await promptStorage.getAll();
      set({ prompts, isLoading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load prompts';
      set({ error, isLoading: false });
    }
  },

  addPrompt: async (prompt) => {
    try {
      const newPrompt = await promptStorage.add(prompt);
      set((state) => ({ prompts: [...state.prompts, newPrompt] }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add prompt';
      set({ error });
    }
  },

  updatePrompt: async (prompt) => {
    try {
      const updatedPrompt = await promptStorage.update(prompt);
      set((state) => ({
        prompts: state.prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p)),
      }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update prompt';
      set({ error });
    }
  },

  deletePrompt: async (id) => {
    try {
      await promptStorage.delete(id);
      set((state) => ({
        prompts: state.prompts.filter((p) => p.id !== id),
      }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete prompt';
      set({ error });
    }
  },

  setActivePromptId: (id) => set({ activePromptId: id }),
}));
