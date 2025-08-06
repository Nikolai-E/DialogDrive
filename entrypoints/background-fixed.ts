import { chatStorage } from '../lib/chatStorage';
import { secureStorage } from '../lib/secureStorageV2';
import { initializeStorage, promptStorage } from '../lib/storage';

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

type Message = SaveChatMessage | GetWorkspacesMessage;

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
