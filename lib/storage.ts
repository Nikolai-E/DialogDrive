// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Prompt storage module responsible for persistence, migration, and exports.

import { v4 as uuidv4 } from 'uuid';
import type { StorageResult } from '../types/app';
import type { Prompt } from '../types/prompt';
import { logger, logStorageAction } from './logger';
import { secureStorage } from './secureStorageV2';

// Storage version for migrations.
const STORAGE_VERSION = '1.0.0';

// Data validation and sanitization.
const validatePrompt = (prompt: any): prompt is Prompt => {
  return (
    typeof prompt.id === 'string' &&
    typeof prompt.title === 'string' &&
    typeof prompt.text === 'string' &&
    typeof prompt.workspace === 'string' &&
    typeof prompt.created === 'string' &&
    Array.isArray(prompt.tags) &&
    typeof prompt.usageCount === 'number' &&
    typeof prompt.isPinned === 'boolean'
  );
};

// Initial data creation.
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
  },
  {
    id: uuidv4(),
    title: "Explain like I'm 5",
    text: 'Explain the following concept to me as if I were a 5-year-old: [paste concept here]',
    workspace: 'Education',
    created: new Date().toISOString(),
    tags: ['simple', 'explanation'],
    usageCount: 0,
    isPinned: false,
  includeTimestamp: false,
  },
  {
    id: uuidv4(),
    title: 'Code review request',
    text: 'Please review this code for best practices, potential bugs, and suggestions for improvement:\n\n[paste code here]',
    workspace: 'Development',
    created: new Date().toISOString(),
    tags: ['code', 'review'],
    usageCount: 0,
    isPinned: false,
  includeTimestamp: false,
  }
];

// Initialize storage with default data.
export const initializeStorage = async (): Promise<void> => {
  try {
    const existingPrompts = await secureStorage.getPrompts<Prompt[]>();
    
    if (!existingPrompts || existingPrompts.length === 0) {
      const initialPrompts = createInitialPrompts();
      await secureStorage.setPrompts(initialPrompts);
      logger.info('Initialized storage with default prompts');
      logStorageAction('Initialize storage', true);
    }

    // Set storage version.
    const preferences = await secureStorage.getPreferences() || {};
    await secureStorage.setPreferences({ ...preferences, version: STORAGE_VERSION });
  } catch (error) {
    logger.error('Failed to initialize storage:', error);
    logStorageAction('Initialize storage', false, error as Error);
  }
};

// Storage operations for prompts.
export const promptStorage = {
  getAll: async (): Promise<Prompt[]> => {
    try {
      const prompts = await secureStorage.getPrompts<Prompt[]>();
      if (!prompts) {
        return [];
      }
      
      // Validate and filter prompts.
      const validPrompts = prompts.filter(validatePrompt);
      if (validPrompts.length !== prompts.length) {
        logger.warn('Some prompts failed validation and were filtered out');
        await secureStorage.setPrompts(validPrompts);
      }
      
      logStorageAction('Get all prompts', true);
      return validPrompts;
    } catch (error) {
      logger.error('Failed to get prompts:', error);
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
      };
      
      const updatedPrompts = [...prompts, newPrompt];
      await secureStorage.setPrompts(updatedPrompts);
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
      if (!validatePrompt(prompt)) {
        throw new Error('Invalid prompt data');
      }
      
      const prompts = await promptStorage.getAll();
      const index = prompts.findIndex(p => p.id === prompt.id);
      if (index === -1) {
        throw new Error('Prompt not found');
      }
      
      prompts[index] = prompt;
      await secureStorage.setPrompts(prompts);
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
      await secureStorage.setPrompts(filteredPrompts);
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
  },

  // Bulk operations for performance
  bulkUpdate: async (prompts: Prompt[]): Promise<void> => {
    try {
      const validPrompts = prompts.filter(validatePrompt);
      if (validPrompts.length !== prompts.length) {
        throw new Error('Some prompts failed validation');
      }
      
      await secureStorage.setPrompts(validPrompts);
      logStorageAction('Bulk update prompts', true);
    } catch (error) {
      logger.error('Failed to bulk update prompts:', error);
      logStorageAction('Bulk update prompts', false, error as Error);
      throw error;
    }
  },

  // Export/import functionality
  exportData: async (): Promise<string> => {
    try {
      const prompts = await promptStorage.getAll();
      const exportData = {
        version: STORAGE_VERSION,
        exportDate: new Date().toISOString(),
        prompts
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('Failed to export data:', error);
      throw error;
    }
  },

  importData: async (jsonData: string): Promise<{ imported: number; skipped: number }> => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.prompts || !Array.isArray(data.prompts)) {
        throw new Error('Invalid import data format');
      }

      const existingPrompts = await promptStorage.getAll();
      const existingIds = new Set(existingPrompts.map(p => p.id));
      
      let imported = 0;
      let skipped = 0;
      
      for (const prompt of data.prompts) {
        if (validatePrompt(prompt) && !existingIds.has(prompt.id)) {
          existingPrompts.push(prompt);
          imported++;
        } else {
          skipped++;
        }
      }
      
      await secureStorage.setPrompts(existingPrompts);
      logStorageAction('Import data', true);
      return { imported, skipped };
    } catch (error) {
      logger.error('Failed to import data:', error);
      throw error;
    }
  },

  // Pagination shim: returns items sorted by lastUsed desc then created desc
  getPage: async ({ limit, cursor }: { limit: number; cursor: string | null }): Promise<{ items: Prompt[]; nextCursor: string | null }> => {
    const all = await (promptStorage as any).getAll();
    const sorted = [...all].sort((a, b) => {
      const ad = a.lastUsed ? new Date(a.lastUsed).getTime() : new Date(a.created).getTime();
      const bd = b.lastUsed ? new Date(b.lastUsed).getTime() : new Date(b.created).getTime();
      return bd - ad;
    });
    let startIndex = 0;
    if (cursor) {
      const idx = sorted.findIndex(it => it.id === cursor);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }
    const items = sorted.slice(startIndex, startIndex + limit);
    const last = items[items.length - 1] || null;
    const nextCursor = last ? last.id : null;
    return { items, nextCursor };
  }
};

// Storage result helper for UI
export const createStorageResult = <T>(
  data: T, 
  success: boolean = true, 
  error?: string
): StorageResult<T> => ({
  data,
  success,
  error
});
