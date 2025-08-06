import { chatStorage } from '../lib/chatStorage';
import { secureStorage } from '../lib/secureStorageV2';
import { initializeStorage, promptStorage } from '../lib/storage';

interface ImprovePromptMessage {
  type: 'IMPROVE_PROMPT';
  promptText: string;
}

interface SaveChatMessage {
  type: 'SAVE_CHAT_BOOKMARK';
  data: {
    title: string;
    url: string;
    platform: string;
    workspace?: string;
    tags?: string[];
    scrapedContent?: any;
  };
}

interface GetWorkspacesMessage {
  type: 'GET_WORKSPACES_AND_TAGS';
}

type Message = ImprovePromptMessage | SaveChatMessage | GetWorkspacesMessage;

export default defineBackground(() => {
  console.log('DialogDrive background script loaded!', { id: browser.runtime.id });

  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      console.log('Extension installed, initializing storage...');
      await initializeStorage();
    }
  });

  browser.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    switch (message.type) {
      case 'IMPROVE_PROMPT':
        handleImprovePrompt(message, sendResponse);
        return true;
        
      case 'SAVE_CHAT_BOOKMARK':
        handleSaveChatBookmark(message, sendResponse);
        return true;
        
      case 'GET_WORKSPACES_AND_TAGS':
        handleGetWorkspacesAndTags(sendResponse);
        return true;
        
      default:
        sendResponse({ error: 'Unknown message type' });
        return false;
    }
  });
});

async function handleImprovePrompt(
  message: ImprovePromptMessage, 
  sendResponse: (response: any) => void
) {
  try {
    const apiKey = await secureStorage.getApiKey();
    
    if (!apiKey) {
      sendResponse({ error: 'No API key found. Please set your OpenAI API key in settings.' });
      return;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a prompt engineering expert. Improve the given prompt to be more effective, specific, and clear while maintaining its original intent. Return only the improved prompt text without any explanations or formatting.'
          },
          {
            role: 'user',
            content: `Improve this prompt: "${message.promptText}"`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      sendResponse({ 
        success: true, 
        improvedText: data.choices[0].message.content.trim() 
      });
    } else {
      sendResponse({ error: 'Invalid response from OpenAI API' });
    }
  } catch (error) {
    console.error('Error improving prompt:', error);
    sendResponse({ error: 'Failed to improve prompt' });
  }
}

async function handleSaveChatBookmark(
  message: SaveChatMessage, 
  sendResponse: (response: any) => void
) {
  try {
    const chatData = message.data;
    const newBookmark = await chatStorage.add({
      title: chatData.title,
      url: chatData.url,
      platform: chatData.platform as 'chatgpt' | 'gemini' | 'claude',
      workspace: chatData.workspace || 'General',
      tags: chatData.tags || [],
      isPinned: false,
      scrapedContent: chatData.scrapedContent
    });
    
    sendResponse({ success: true, bookmark: newBookmark });
  } catch (error) {
    console.error('Error saving chat bookmark:', error);
    sendResponse({ error: 'Failed to save chat bookmark' });
  }
}

async function handleGetWorkspacesAndTags(
  sendResponse: (response: any) => void
) {
  try {
    const [prompts, chats] = await Promise.all([
      promptStorage.getAll(),
      chatStorage.getAll()
    ]);
    
    const promptWorkspaces = prompts.map(p => p.workspace).filter(Boolean);
    const chatWorkspaces = chats.map(c => c.workspace).filter(Boolean);
    const workspaces = Array.from(new Set(['General', ...promptWorkspaces, ...chatWorkspaces]));
    
    const promptTags = prompts.flatMap(p => p.tags || []);
    const chatTags = chats.flatMap(c => c.tags || []);
    const allTags = Array.from(new Set([...promptTags, ...chatTags]));
    
    sendResponse({ success: true, workspaces, tags: allTags });
  } catch (error) {
    console.error('Error fetching workspaces/tags:', error);
    sendResponse({ success: false, workspaces: ['General'], tags: [] });
  }
}
