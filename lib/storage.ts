import type { Prompt } from '~/types/prompt';
import { v4 as uuidv4 } from 'uuid';
import { logger, logStorageAction } from '~/lib/logger';

const PROMPTS_STORAGE_KEY = 'dialogdrive-prompts';

// --- Initial Data and Initialization ---

const createInitialPrompts = (): Prompt[] => [
  {
    id: uuidv4(),
    title: 'Summarize this article',
    text: 'Please provide a concise summary of the following article: [paste article here]',
    workspace: 'Research',
    created: new Date().toISOString(),
    tags: ['summary', 'article'],
    usageCount: 0,
    isPinned: false,
    includeTimestamp: false,
    includeVoiceTag: false,
  },
  {
    id: uuidv4(),
    title: "Explain like I'm 5",
    text: 'Explain the following concept to me as if I were a 5-year-old: [paste concept here]',
    workspace: 'Education',
    created: new Date().toISOString(),
    tags: ['simple', 'explanation'],
    usageCount: 0,
    isPinned: true,
    includeTimestamp: true,
    includeVoiceTag: false,
  },
  {
    id: uuidv4(),
    title: 'Code review request',
    text: 'Please review the following code and provide feedback on:\n- Code quality and best practices\n- Potential bugs or issues\n- Performance improvements\n- Security considerations\n\n[paste code here]',
    workspace: 'Development',
    created: new Date().toISOString(),
    tags: ['code', 'review', 'feedback'],
    usageCount: 0,
    isPinned: false,
    includeTimestamp: false,
    includeVoiceTag: true,
  },
];

/**
 * Initializes storage with default prompts if it's empty.
 * Should be called once when the extension starts.
 */
export const initializeStorage = async () => {
  try {
    const existingPrompts = await browser.storage.local.get(PROMPTS_STORAGE_KEY);
    const prompts = existingPrompts[PROMPTS_STORAGE_KEY] as Prompt[] | undefined;
    
    if (!prompts || prompts.length === 0) {
      const initialPrompts = createInitialPrompts();
      await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: initialPrompts });
      logStorageAction('Storage initialized with default prompts', true);
    } else {
      logStorageAction('Storage already initialized', true);
    }
  } catch (error) {
    logger.error('Failed to initialize storage:', error);
    logStorageAction('Initialize storage', false, error as Error);
  }
};

// --- Storage API ---

export const promptStorage = {
  getAll: async (): Promise<Prompt[]> => {
    try {
      const result = await browser.storage.local.get(PROMPTS_STORAGE_KEY);
      const prompts = result[PROMPTS_STORAGE_KEY] as Prompt[] | undefined;
      return prompts || [];
    } catch (error) {
      logger.error('Failed to get all prompts:', error);
      logStorageAction('Get all prompts', false, error as Error);
      return [];
    }
  },

  add: async (prompt: Omit<Prompt, 'id' | 'created'>): Promise<Prompt> => {
    try {
      const prompts = await promptStorage.getAll();
      const newPrompt: Prompt = {
        ...prompt,
        id: uuidv4(),
        created: new Date().toISOString(),
        workspace: prompt.workspace || 'General',
        tags: prompt.tags || [],
        usageCount: 0,
        isPinned: false,
        includeTimestamp: prompt.includeTimestamp ?? false,
        includeVoiceTag: prompt.includeVoiceTag ?? false,
      };
      
      const updatedPrompts = [...prompts, newPrompt];
      await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
      
      logStorageAction('Added prompt', true);
      return newPrompt;
    } catch (error) {
      logger.error('Failed to add prompt:', error);
      logStorageAction('Add prompt', false, error as Error);
      throw error;
    }
  },

  update: async (updatedPrompt: Prompt): Promise<Prompt> => {
    try {
      const prompts = await promptStorage.getAll();
      const promptIndex = prompts.findIndex((p) => p.id === updatedPrompt.id);
      if (promptIndex === -1) throw new Error('Prompt not found');
      
      const updatedPrompts = [...prompts];
      updatedPrompts[promptIndex] = updatedPrompt;
      await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
      
      logStorageAction('Updated prompt', true);
      return updatedPrompt;
    } catch (error) {
      logger.error('Failed to update prompt:', error);
      logStorageAction('Update prompt', false, error as Error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const prompts = await promptStorage.getAll();
      const updatedPrompts = prompts.filter((p) => p.id !== id);
      await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
      
      logStorageAction('Deleted prompt', true);
    } catch (error) {
      logger.error('Failed to delete prompt:', error);
      logStorageAction('Delete prompt', false, error as Error);
      throw error;
    }
  },
};
