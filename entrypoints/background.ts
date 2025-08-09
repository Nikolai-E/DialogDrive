/// <reference path="../.wxt/wxt.d.ts" />

import { chatStorage } from '../lib/chatStorage';
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
    if (message.type === 'SAVE_BOOKMARK') {
      (async () => {
        try {
          const data = message.data || {};
          const newBookmark = await chatStorage.add({
            title: data.title,
            url: data.url,
            platform: data.platform || 'chatgpt',
            workspace: data.workspace || 'General',
            tags: data.tags || [],
            description: data.description || undefined,
            isPinned: !!data.isPinned,
            scrapedContent: data.scrapedContent
          });
          sendResponse({ success: true, bookmark: newBookmark });
        } catch (error) {
          console.error('Error saving bookmark:', error);
          sendResponse({ success: false, error: 'Failed to save bookmark' });
        }
      })();
      return true;
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

    if (message.type === 'DELETE_WORKSPACE') {
      (async () => {
        try {
          const name = (message.name || '').trim();
          if (!name || name === 'General') {
            sendResponse({ success: false, error: 'Invalid workspace name' });
            return;
          }
          const [prompts, chats] = await Promise.all([
            promptStorage.getAll(),
            chatStorage.getAll()
          ]);
          const updatedPrompts = prompts.map(p => p.workspace === name ? { ...p, workspace: 'General' } : p);
          for (const p of updatedPrompts) {
            await promptStorage.update(p);
          }
          const updatedChats = [] as any[];
          for (const c of chats) {
            if (c.workspace === name) {
              const updated = { ...c, workspace: 'General' };
              await chatStorage.update(updated);
              updatedChats.push(updated);
            } else updatedChats.push(c);
          }
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error deleting workspace:', error);
          sendResponse({ success: false, error: 'Failed to delete workspace' });
        }
      })();
      return true;
    }

    if (message.type === 'DELETE_TAG') {
      (async () => {
        try {
          const tag = (message.tag || '').trim();
          if (!tag) { sendResponse({ success: false, error: 'Invalid tag' }); return; }
          const [prompts, chats] = await Promise.all([
            promptStorage.getAll(),
            chatStorage.getAll()
          ]);
          const updatedPrompts = prompts.map(p => p.tags?.includes(tag) ? { ...p, tags: p.tags.filter(t => t !== tag) } : p);
          for (const p of updatedPrompts) {
            await promptStorage.update(p);
          }
          for (const c of chats) {
            if (c.tags?.includes(tag)) {
              const updated = { ...c, tags: c.tags.filter(t => t !== tag) };
              await chatStorage.update(updated);
            }
          }
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error deleting tag:', error);
          sendResponse({ success: false, error: 'Failed to delete tag' });
        }
      })();
      return true;
    }
    
    // Return false for unknown message types
    return false;
  });
});
