import type { Prompt } from '~/types/prompt';
import { v4 as uuidv4 } from 'uuid';

const PROMPTS_STORAGE_KEY = 'dialogdrive-prompts';

// Initialize with some dummy data if the store is empty
const getInitialPrompts = async (): Promise<Prompt[]> => {
  const result = await browser.storage.local.get(PROMPTS_STORAGE_KEY);
  const prompts = result[PROMPTS_STORAGE_KEY] as Prompt[] | undefined;
  
  if (prompts && prompts.length > 0) {
    return prompts;
  }

  const initialPrompts: Prompt[] = [
    {
      id: uuidv4(),
      title: 'Summarize this article',
      text: 'Please provide a concise summary of the following article: [paste article here]',
      created: new Date().toISOString(),
      includeTimestamp: false,
      includeVoiceTag: false,
    },
    {
      id: uuidv4(),
      title: 'Explain this concept like I am 5',
      text: 'Explain the following concept to me as if I were a 5-year-old: [paste concept here]',
      created: new Date().toISOString(),
      includeTimestamp: true,
      includeVoiceTag: false,
    },
  ];
  
  await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: initialPrompts });
  return initialPrompts;
};

export const promptStorage = {
  getAll: async (): Promise<Prompt[]> => {
    return getInitialPrompts();
  },

  add: async (prompt: Omit<Prompt, 'id' | 'created' | 'includeTimestamp' | 'includeVoiceTag'> & Partial<Pick<Prompt, 'includeTimestamp' | 'includeVoiceTag'>>): Promise<Prompt> => {
    const prompts = await promptStorage.getAll();
    const newPrompt: Prompt = {
      ...prompt,
      id: uuidv4(),
      created: new Date().toISOString(),
      includeTimestamp: prompt.includeTimestamp ?? false,
      includeVoiceTag: prompt.includeVoiceTag ?? false,
    };
    const updatedPrompts = [...prompts, newPrompt];
    await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
    return newPrompt;
  },

  update: async (updatedPrompt: Prompt): Promise<Prompt> => {
    const prompts = await promptStorage.getAll();
    const promptIndex = prompts.findIndex((p) => p.id === updatedPrompt.id);
    if (promptIndex === -1) {
      throw new Error('Prompt not found');
    }
    const updatedPrompts = [...prompts];
    updatedPrompts[promptIndex] = updatedPrompt;
    await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
    return updatedPrompt;
  },

  delete: async (id: string): Promise<void> => {
    const prompts = await promptStorage.getAll();
    const updatedPrompts = prompts.filter((p) => p.id !== id);
    await browser.storage.local.set({ [PROMPTS_STORAGE_KEY]: updatedPrompts });
  },
};
