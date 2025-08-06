import { chatStorage } from '../lib/chatStorage';
import { secureStorage } from '../lib/secureStorageV2';
import { initializeContextMenu, initializeKeyboardShortcuts } from '../lib/shortcuts';
import { initializeStorage, promptStorage } from '../lib/storage';

export default defineBackground(() => {
  console.log('DialogDrive background script loaded!', { id: browser.runtime.id });

  // Initialize storage on extension installation
  browser.runtime.onInstalled.addListener(async (details: any) => {
    if (details.reason === 'install') {
      console.log('Extension installed, initializing storage...');
      await initializeStorage();
    }
    
    // Initialize keyboard shortcuts and context menu
    initializeKeyboardShortcuts();
    initializeContextMenu();
  });

  // Initialize shortcuts and context menu on startup
  initializeKeyboardShortcuts();
  initializeContextMenu();

  // Listen for messages from popup and content scripts
  browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    if (message.type === 'IMPROVE_PROMPT') {
      (async () => {
        try {
          // Use secure storage for API key
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
      })();
      
      return true; // Keep message channel open for async response
    }
    
    if (message.type === 'SAVE_CHAT_BOOKMARK') {
      (async () => {
        try {
          console.log('Saving chat bookmark from floating button:', message.data);
          
          const chatData = message.data;
          const newBookmark = await chatStorage.add({
            title: chatData.title,
            url: chatData.url,
            platform: chatData.platform,
            workspace: chatData.workspace || 'General', // Use provided workspace
            tags: chatData.tags || [], // Use provided tags
            isPinned: false,
            scrapedContent: chatData.scrapedContent
          });
          
          console.log('Chat bookmark saved successfully:', newBookmark.id);
          sendResponse({ success: true, bookmark: newBookmark });
          
        } catch (error) {
          console.error('Error saving chat bookmark:', error);
          sendResponse({ error: 'Failed to save chat bookmark' });
        }
      })();
      
      return true; // Keep message channel open for async response
    }
    
    if (message.type === 'GET_WORKSPACES_AND_TAGS') {
      (async () => {
        try {
          console.log('Fetching workspaces and tags for quick form');
          
          // Get all existing prompts and chats to extract workspaces/tags
          const [prompts, chats] = await Promise.all([
            promptStorage.getAll(),
            chatStorage.getAll()
          ]);
          
          // Extract workspaces
          const promptWorkspaces = prompts.map(p => p.workspace).filter(Boolean);
          const chatWorkspaces = chats.map(c => c.workspace).filter(Boolean);
          const workspaces = Array.from(new Set(['General', ...promptWorkspaces, ...chatWorkspaces]));
          
          // Extract tags
          const promptTags = prompts.flatMap(p => p.tags || []);
          const chatTags = chats.flatMap(c => c.tags || []);
          const allTags = Array.from(new Set([...promptTags, ...chatTags]));
          
          console.log('Found workspaces:', workspaces, 'tags:', allTags);
          sendResponse({ success: true, workspaces, tags: allTags });
          
        } catch (error) {
          console.error('Error fetching workspaces/tags:', error);
          sendResponse({ success: false, workspaces: ['General'], tags: [] });
        }
      })();
      
      return true; // Keep message channel open for async response
    }
    
    // Return false for unknown message types
    return false;
  });
});
