import type { Prompt } from '~/types/prompt';
import { v4 as uuidv4 } from 'uuid';
import { logger, logStorageAction } from '~/lib/logger';

const PROMPTS_STORAGE_KEY = 'dialogdrive-prompts';

// Initialize with some dummy data if the store is empty
const getInitialPrompts = async (): Promise<Prompt[]> => {
  try {
    // Try browser storage first
    let prompts: Prompt[] | undefined;
    
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      try {
        const result = await browser.storage.local.get(PROMPTS_STORAGE_KEY);
        prompts = result[PROMPTS_STORAGE_KEY] as Prompt[] | undefined;
      } catch (browserError) {
        logger.warn('Browser storage failed, trying localStorage:', browserError);
      }
    }
    
    // Fallback to localStorage
    if (!prompts) {
      try {
        const stored = localStorage.getItem(PROMPTS_STORAGE_KEY);
        if (stored) {
          prompts = JSON.parse(stored) as Prompt[];
        }
      } catch (localError) {
        logger.warn('localStorage failed:', localError);
      }
    }
    
    if (prompts && prompts.length > 0) {
      logStorageAction('Loaded existing prompts', true);
      return prompts;
    }

    // Create initial prompts with all required fields
    const initialPrompts: Prompt[] = [
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
        title: 'Explain like I\'m 5',
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
    
    // Try to save initial prompts
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: initialPrompts });
      } else {
        localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(initialPrompts));
      }
    } catch (saveError) {
      logger.warn('Failed to save initial prompts to storage:', saveError);
      // Try localStorage fallback
      try {
        localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(initialPrompts));
      } catch (localSaveError) {
        logger.error('Failed to save to localStorage too:', localSaveError);
      }
    }
    
    logStorageAction('Created initial prompts', true);
    return initialPrompts;
  } catch (error) {
    logger.error('Failed to get initial prompts:', error);
    logStorageAction('Get initial prompts', false, error as Error);
    return [];
  }
};

export const promptStorage = {
  getAll: async (): Promise<Prompt[]> => {
    return getInitialPrompts();
  },

  add: async (prompt: Omit<Prompt, 'id' | 'created'>): Promise<Prompt> => {
    try {
      const prompts = await promptStorage.getAll();
      const newPrompt: Prompt = {
        ...prompt,
        id: uuidv4(),
        created: new Date().toISOString(),
        // Ensure all required fields have defaults
        workspace: prompt.workspace || 'General',
        tags: prompt.tags || [],
        usageCount: prompt.usageCount || 0,
        isPinned: prompt.isPinned || false,
        includeTimestamp: prompt.includeTimestamp ?? false,
        includeVoiceTag: prompt.includeVoiceTag ?? false,
      };
      
      const updatedPrompts = [...prompts, newPrompt];
      await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
      
      logStorageAction('Added prompt', true, undefined);
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
      if (promptIndex === -1) {
        throw new Error('Prompt not found');
      }
      
      const updatedPrompts = [...prompts];
      updatedPrompts[promptIndex] = updatedPrompt;
      await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
      
      logStorageAction('Updated prompt', true, undefined);
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
      
      logStorageAction('Deleted prompt', true, undefined);
    } catch (error) {
      logger.error('Failed to delete prompt:', error);
      logStorageAction('Delete prompt', false, error as Error);
      throw error;
    }
  },
};
