import type { chatStorage as ChatStorageInstance } from '@/lib/chatStorage';
import type { promptStorage as PromptStorageInstance } from '@/lib/storage';
import type { logger as LoggerInstance } from '@/lib/logger';
import {
  BgMessage,
  BgMessageSchema,
  SaveBookmarkMsgSchema,
  SaveChatBookmarkMsgSchema,
} from '@/lib/schemas';

type NormalizeResult =
  | {
      summary: string;
      messageCount: number;
      lastMessage: string;
      scrapedAt: string;
    }
  | undefined;

type ChatStorage = typeof ChatStorageInstance;
type PromptStorage = typeof PromptStorageInstance;
type Logger = typeof LoggerInstance;

export interface BackgroundDependencies {
  chatStorage: ChatStorage;
  promptStorage: PromptStorage;
  logger: Logger;
}

export interface BackgroundResponse {
  success: boolean;
  [key: string]: unknown;
}

export interface HandlerResult {
  handled: boolean;
  response?: BackgroundResponse;
}

export function normalizeScrapedContent(input: unknown): NormalizeResult {
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

async function handleSaveBookmark(
  message: BgMessage & { type: 'SAVE_BOOKMARK' },
  deps: BackgroundDependencies
): Promise<BackgroundResponse> {
  const { data } = SaveBookmarkMsgSchema.parse(message);
  const newBookmark = await deps.chatStorage.add({
    title: data.title,
    url: data.url,
    platform: (data.platform as any) || 'chatgpt',
    workspace: data.workspace || 'General',
    tags: data.tags || [],
    description: data.description || undefined,
    isPinned: !!data.isPinned,
    scrapedContent: normalizeScrapedContent(data.scrapedContent),
  });
  return { success: true, bookmark: newBookmark };
}

async function handleSaveChatBookmark(
  message: BgMessage & { type: 'SAVE_CHAT_BOOKMARK' },
  deps: BackgroundDependencies
): Promise<BackgroundResponse> {
  const { data } = SaveChatBookmarkMsgSchema.parse(message);
  const newBookmark = await deps.chatStorage.add({
    title: data.title,
    url: data.url,
    platform: data.platform,
    workspace: data.workspace || 'General',
    tags: data.tags || [],
    isPinned: false,
    scrapedContent: normalizeScrapedContent(data.scrapedContent),
  });
  return { success: true, bookmark: newBookmark };
}

async function handleGetWorkspacesAndTags(
  deps: BackgroundDependencies
): Promise<BackgroundResponse> {
  const [prompts, chats] = await Promise.all([
    deps.promptStorage.getAll(),
    deps.chatStorage.getAll(),
  ]);

  const promptWorkspaces = prompts.map((p) => p.workspace).filter(Boolean);
  const chatWorkspaces = chats.map((c) => c.workspace).filter(Boolean);
  const workspaces = Array.from(new Set(['General', ...promptWorkspaces, ...chatWorkspaces]));

  const promptTags = prompts.flatMap((p) => p.tags || []);
  const chatTags = chats.flatMap((c) => c.tags || []);
  const tags = Array.from(new Set([...promptTags, ...chatTags]));

  return { success: true, workspaces, tags };
}

async function handleDeleteWorkspace(
  message: BgMessage & { type: 'DELETE_WORKSPACE' },
  deps: BackgroundDependencies
): Promise<BackgroundResponse> {
  const name = (message.name || '').trim();
  if (!name || name === 'General') {
    return { success: false, error: 'Invalid workspace name' };
  }

  const [prompts, chats] = await Promise.all([
    deps.promptStorage.getAll(),
    deps.chatStorage.getAll(),
  ]);

  const updatedPrompts = prompts.map((p) =>
    p.workspace === name ? { ...p, workspace: 'General' } : p
  );
  for (const prompt of updatedPrompts) {
    await deps.promptStorage.update(prompt);
  }

  for (const chat of chats) {
    if (chat.workspace === name) {
      await deps.chatStorage.update({ ...chat, workspace: 'General' });
    }
  }

  return { success: true };
}

async function handleDeleteTag(
  message: BgMessage & { type: 'DELETE_TAG' },
  deps: BackgroundDependencies
): Promise<BackgroundResponse> {
  const tag = (message.tag || '').trim();
  if (!tag) {
    return { success: false, error: 'Invalid tag' };
  }

  const [prompts, chats] = await Promise.all([
    deps.promptStorage.getAll(),
    deps.chatStorage.getAll(),
  ]);

  const updatedPrompts = prompts.map((p) =>
    p.tags?.includes(tag) ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p
  );
  for (const prompt of updatedPrompts) {
    await deps.promptStorage.update(prompt);
  }

  for (const chat of chats) {
    if (chat.tags?.includes(tag)) {
      await deps.chatStorage.update({ ...chat, tags: chat.tags.filter((t) => t !== tag) });
    }
  }

  return { success: true };
}

export async function handleBackgroundMessage(
  input: unknown,
  deps: BackgroundDependencies
): Promise<HandlerResult> {
  const parsed = BgMessageSchema.safeParse(input);
  if (!parsed.success) {
    deps.logger.warn('Rejected invalid background message', parsed.error.flatten());
    return { handled: false };
  }

  const message = parsed.data;

  try {
    switch (message.type) {
      case 'SAVE_BOOKMARK':
        return { handled: true, response: await handleSaveBookmark(message, deps) };
      case 'SAVE_CHAT_BOOKMARK':
        deps.logger.debug('Saving chat bookmark from floating button');
        return { handled: true, response: await handleSaveChatBookmark(message, deps) };
      case 'GET_WORKSPACES_AND_TAGS':
        deps.logger.debug('Fetching workspaces and tags for quick form');
        return { handled: true, response: await handleGetWorkspacesAndTags(deps) };
      case 'DELETE_WORKSPACE':
        return { handled: true, response: await handleDeleteWorkspace(message, deps) };
      case 'DELETE_TAG':
        return { handled: true, response: await handleDeleteTag(message, deps) };
      default:
        return { handled: false };
    }
  } catch (error) {
    deps.logger.error('Background handler error', error);
    const safeMessage = error instanceof Error ? error.message : 'Unknown error';
    return { handled: true, response: { success: false, error: safeMessage } };
  }
}
