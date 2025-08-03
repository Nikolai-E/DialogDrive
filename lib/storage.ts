import type { Prompt } from '../types/prompt';
import type { StorageResult } from '../types/app';
import { v4 as uuidv4 } from 'uuid';
import { logger, logStorageAction } from './logger';

const PROMPTS_STORAGE_KEY = 'dialogdrive-prompts';

// Dual storage strategy: try browser.storage first, fallback to localStorage
const safeStorageSet = async (key: string, value: any): Promise<void> => {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch (error) {
    logger.warn('Browser storage failed, falling back to localStorage:', error);
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const safeStorageGet = async (key: string): Promise<any> => {
  try {
    const result = await browser.storage.local.get(key);
    return result[key];
  } catch (error) {
    logger.warn('Browser storage failed, falling back to localStorage:', error);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : undefined;
  }
};

// Initial data creation
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
    text: 'Please review the following code and provide feedback on:\\n- Code quality and best practices\\n- Potential bugs or issues\\n- Performance improvements\\n- Security considerations\\n\\n[paste code here]',
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
 */
export const initializeStorage = async (): Promise<StorageResult<Prompt[]>> => {
  try {
    const existingPrompts = await safeStorageGet(PROMPTS_STORAGE_KEY);
    
    if (!existingPrompts || existingPrompts.length === 0) {
      const initialPrompts = createInitialPrompts();
      await safeStorageSet(PROMPTS_STORAGE_KEY, initialPrompts);
      logStorageAction('Storage initialized with default prompts', true);
      return { success: true, data: initialPrompts };
    } else {
      logStorageAction('Storage already initialized', true);
      return { success: true, data: existingPrompts };
    }
  } catch (error) {
    logger.error('Failed to initialize storage:', error);
    logStorageAction('Initialize storage', false, error as Error);
    return { success: false, error: (error as Error).message };
  }
};

// Storage API
export const promptStorage = {
  getAll: async (): Promise<Prompt[]> => {
    try {
      const prompts = await safeStorageGet(PROMPTS_STORAGE_KEY);
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
        isPinned: prompt.isPinned ?? false,
        includeTimestamp: prompt.includeTimestamp ?? false,
        includeVoiceTag: prompt.includeVoiceTag ?? false,
      };
      
      const updatedPrompts = [...prompts, newPrompt];
      await safeStorageSet(PROMPTS_STORAGE_KEY, updatedPrompts);
      logStorageAction('Add prompt', true);
      return newPrompt;
    } catch (error) {
      logger.error('Failed to add prompt:', error);
      logStorageAction('Add prompt', false, error as Error);
      throw error;
    }
  },

  update: async (prompt: Prompt): Promise<Prompt> => {
    try {
      const prompts = await promptStorage.getAll();
      const index = prompts.findIndex(p => p.id === prompt.id);
      if (index === -1) {
        throw new Error('Prompt not found');
      }
      
      prompts[index] = prompt;
      await safeStorageSet(PROMPTS_STORAGE_KEY, prompts);
      logStorageAction('Update prompt', true);
      return prompt;
    } catch (error) {
      logger.error('Failed to update prompt:', error);
      logStorageAction('Update prompt', false, error as Error);
      throw error;
    }
  },

  remove: async (id: string): Promise<void> => {
    try {
      const prompts = await promptStorage.getAll();
      const filteredPrompts = prompts.filter(p => p.id !== id);
      await safeStorageSet(PROMPTS_STORAGE_KEY, filteredPrompts);
      logStorageAction('Delete prompt', true);
    } catch (error) {
      logger.error('Failed to delete prompt:', error);
      logStorageAction('Delete prompt', false, error as Error);
      throw error;
    }
  },

  incrementUsage: async (id: string): Promise<void> => {
    try {
      const prompts = await promptStorage.getAll();
      const prompt = prompts.find(p => p.id === id);
      if (prompt) {
        prompt.usageCount += 1;
        prompt.lastUsed = new Date().toISOString();
        await promptStorage.update(prompt);
      }
    } catch (error) {
      logger.error('Failed to increment usage:', error);
      logStorageAction('Increment usage', false, error as Error);
    }
  }
};
