/// <reference path="../.wxt/wxt.d.ts" />

// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Background worker that wires up install hooks, messaging, and storage.

import { chatStorage } from '../lib/chatStorage';
import { logger } from '../lib/logger';
import { BgMessageSchema, SaveBookmarkMsgSchema, SaveChatBookmarkMsgSchema } from '../lib/schemas';
import { initializeContextMenu, initializeKeyboardShortcuts } from '../lib/shortcuts';
import { initializeStorage, promptStorage } from '../lib/storage';

type SaveBookmarkMsg = {
  type: 'SAVE_BOOKMARK';
  data: {
    title: string;
    url: string;
    platform?: 'chatgpt' | 'gemini' | 'claude' | 'deepseek' | string;
    workspace?: string;
    tags?: string[];
    description?: string;
    isPinned?: boolean;
    scrapedContent?: unknown;
  };
};

type SaveChatBookmarkMsg = {
  type: 'SAVE_CHAT_BOOKMARK';
  data: {
    title: string;
    url: string;
    platform: 'chatgpt' | 'gemini' | 'claude' | 'deepseek';
    workspace?: string;
    tags?: string[];
    scrapedContent?: unknown;
  };
};

type GetWorkspacesAndTagsMsg = { type: 'GET_WORKSPACES_AND_TAGS' };
type DeleteWorkspaceMsg = { type: 'DELETE_WORKSPACE'; name: string };
type DeleteTagMsg = { type: 'DELETE_TAG'; tag: string };

// Message payload variants the background router understands.
type BgMessage =
  | SaveBookmarkMsg
  | SaveChatBookmarkMsg
  | GetWorkspacesAndTagsMsg
  | DeleteWorkspaceMsg
  | DeleteTagMsg;

// Clean and coerce scraped chat metadata before storage.
function normalizeScrapedContent(input: unknown):
  | {
      summary: string;
      messageCount: number;
      lastMessage: string;
      scrapedAt: string;
    }
  | undefined {
  if (
    input &&
    typeof input === 'object' &&
    'summary' in input &&
    'messageCount' in input &&
    'lastMessage' in input &&
    'scrapedAt' in input
  ) {
    const sc = input as any;
    return {
      summary: String(sc.summary ?? ''),
      messageCount: Number(sc.messageCount ?? 0),
      lastMessage: String(sc.lastMessage ?? ''),
      scrapedAt: String(sc.scrapedAt ?? new Date().toISOString()),
    };
  }
  return undefined;
}

export default defineBackground(() => {
  logger.info('DialogDrive background script loaded!', { id: browser.runtime.id });

  // Handle install/update so we can seed storage and affordances on day one.
  browser.runtime.onInstalled.addListener(
    async (details: { reason: 'install' | 'update' | string }) => {
      if (details.reason === 'install') {
        logger.info('Extension installed, initializing storage...');
        await initializeStorage();
      }

      initializeKeyboardShortcuts();
      initializeContextMenu();
    }
  );

  // Refresh keyboard shortcuts and menus on every restart.
  initializeKeyboardShortcuts();
  initializeContextMenu();

  // Central router that validates every message and dispatches to storage helpers.
  browser.runtime.onMessage.addListener((message: BgMessage, _sender, sendResponse) => {
    // Validate message shape at runtime; log and reject early on failure.
    const parsed = BgMessageSchema.safeParse(message as unknown);
    if (!parsed.success) {
      logger.warn('Rejected invalid background message', parsed.error.flatten());
      return false;
    }
    const msg = parsed.data;

    if (msg.type === 'SAVE_BOOKMARK') {
      // Save a rich bookmark coming from the popup or floating button.
      (async () => {
        try {
          // Narrow and coerce via schema before persisting.
          const { data } = SaveBookmarkMsgSchema.parse({
            type: 'SAVE_BOOKMARK',
            data: msg.data,
          } as any);
          const newBookmark = await chatStorage.add({
            title: data.title,
            url: data.url,
            platform: (data.platform as any) || 'chatgpt',
            workspace: data.workspace || 'General',
            tags: data.tags || [],
            description: data.description || undefined,
            isPinned: !!data.isPinned,
            scrapedContent: normalizeScrapedContent(data.scrapedContent),
          });
          sendResponse({ success: true, bookmark: newBookmark });
        } catch (error) {
          logger.error('Error saving bookmark:', error);
          sendResponse({ success: false, error: 'Failed to save bookmark' });
        }
      })();
      return true;
    }

    if (msg.type === 'SAVE_CHAT_BOOKMARK') {
      // Save a chat capture initiated while browsing the chat surface.
      (async () => {
        try {
          logger.debug('Saving chat bookmark from floating button');
          const { data: chatData } = SaveChatBookmarkMsgSchema.parse(msg as any);
          const newBookmark = await chatStorage.add({
            title: chatData.title,
            url: chatData.url,
            platform: chatData.platform,
            workspace: chatData.workspace || 'General',
            tags: chatData.tags || [],
            isPinned: false,
            scrapedContent: normalizeScrapedContent(chatData.scrapedContent),
          });

          logger.info('Chat bookmark saved successfully', newBookmark.id);
          sendResponse({ success: true, bookmark: newBookmark });
        } catch (error) {
          logger.error('Error saving chat bookmark:', error);
          sendResponse({ error: 'Failed to save chat bookmark' });
        }
      })();

      return true; // async response
    }

    if (message.type === 'GET_WORKSPACES_AND_TAGS') {
      // Return workspace/tag suggestions for the dropdown pickers.
      (async () => {
        try {
          logger.debug('Fetching workspaces and tags for quick form');

          const [prompts, chats] = await Promise.all([
            promptStorage.getAll(),
            chatStorage.getAll(),
          ]);

          const promptWorkspaces = prompts.map((p) => p.workspace).filter(Boolean);
          const chatWorkspaces = chats.map((c) => c.workspace).filter(Boolean);
          const workspaces = Array.from(
            new Set(['General', ...promptWorkspaces, ...chatWorkspaces])
          );

          const promptTags = prompts.flatMap((p) => p.tags || []);
          const chatTags = chats.flatMap((c) => c.tags || []);
          const allTags = Array.from(new Set([...promptTags, ...chatTags]));

          logger.debug('Workspace/tag counts', {
            workspaces: workspaces.length,
            tags: allTags.length,
          });
          sendResponse({ success: true, workspaces, tags: allTags });
        } catch (error) {
          logger.error('Error fetching workspaces/tags:', error);
          sendResponse({ success: false, workspaces: ['General'], tags: [] });
        }
      })();

      return true; // async response
    }

    if (message.type === 'DELETE_WORKSPACE') {
      // Migrate every item out of a workspace before removing the label.
      (async () => {
        try {
          const name = (message.name || '').trim();
          if (!name || name === 'General') {
            sendResponse({ success: false, error: 'Invalid workspace name' });
            return;
          }
          const [prompts, chats] = await Promise.all([
            promptStorage.getAll(),
            chatStorage.getAll(),
          ]);
          const updatedPrompts = prompts.map((p) =>
            p.workspace === name ? { ...p, workspace: 'General' } : p
          );
          // Walk each prompt and move it back under the General workspace.
          for (const p of updatedPrompts) {
            await promptStorage.update(p);
          }
          // Repeat for chats so no bookmark references the removed label.
          for (const c of chats) {
            if (c.workspace === name) {
              const updated = { ...c, workspace: 'General' };
              await chatStorage.update(updated);
            }
          }
          sendResponse({ success: true });
        } catch (error) {
          logger.error('Error deleting workspace:', error);
          sendResponse({ success: false, error: 'Failed to delete workspace' });
        }
      })();
      return true;
    }

    if (message.type === 'DELETE_TAG') {
      // Strip a tag from every stored prompt or chat.
      (async () => {
        try {
          const tag = (message.tag || '').trim();
          if (!tag) {
            sendResponse({ success: false, error: 'Invalid tag' });
            return;
          }
          const [prompts, chats] = await Promise.all([
            promptStorage.getAll(),
            chatStorage.getAll(),
          ]);
          const updatedPrompts = prompts.map((p) =>
            p.tags?.includes(tag) ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p
          );
          // Strip the tag from each prompt before persisting the cleaned list.
          for (const p of updatedPrompts) {
            await promptStorage.update(p);
          }
          // Finish by removing the tag from every chat bookmark too.
          for (const c of chats) {
            if (c.tags?.includes(tag)) {
              const updated = { ...c, tags: c.tags.filter((t) => t !== tag) };
              await chatStorage.update(updated);
            }
          }
          sendResponse({ success: true });
        } catch (error) {
          logger.error('Error deleting tag:', error);
          sendResponse({ success: false, error: 'Failed to delete tag' });
        }
      })();
      return true;
    }

    // Unknown message type
    return false;
  });
});
