// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Zod schemas that keep messages, bookmarks, and scraped content predictable.

import { z } from 'zod';

// Common enums
export const PlatformEnum = z.enum(['chatgpt', 'gemini', 'claude', 'deepseek']);

// Scraped content from content scripts
export const ScrapedContentSchema = z.object({
  summary: z.string().catch(''),
  messageCount: z.number().int().nonnegative().catch(0),
  lastMessage: z.string().catch(''),
  scrapedAt: z.string().catch(() => new Date().toISOString()),
});

// Chat bookmark shapes
export const ChatBookmarkSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  url: z.string().url(),
  shareUrl: z.string().url().optional(),
  platform: PlatformEnum,
  workspace: z.string().min(1),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  created: z.string(),
  lastAccessed: z.string().optional(),
  accessCount: z.number().int().nonnegative(),
  isPinned: z.boolean(),
  conversationId: z.string().optional(),
  shareId: z.string().optional(),
  participantCount: z.number().int().nonnegative().optional(),
  estimatedTokens: z.number().int().nonnegative().optional(),
  isOwner: z.boolean().optional(),
  scrapedContent: ScrapedContentSchema.optional(),
});

// AddChatBookmark is ChatBookmark without id/created/accessCount
export const AddChatBookmarkSchema = ChatBookmarkSchema.omit({ id: true, created: true, accessCount: true })
  .extend({
    // isPinned may be omitted by callers; default to false
    isPinned: z.boolean().optional().default(false),
  });

// Background message schemas
export const SaveBookmarkMsgSchema = z.object({
  type: z.literal('SAVE_BOOKMARK'),
  data: z.object({
    title: z.string().min(1),
    url: z.string().url(),
    platform: PlatformEnum.or(z.string()).optional(),
    workspace: z.string().optional(),
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    isPinned: z.boolean().optional(),
    scrapedContent: ScrapedContentSchema.optional(),
  }),
});

export const SaveChatBookmarkMsgSchema = z.object({
  type: z.literal('SAVE_CHAT_BOOKMARK'),
  data: AddChatBookmarkSchema,
});

export const GetWorkspacesAndTagsMsgSchema = z.object({
  type: z.literal('GET_WORKSPACES_AND_TAGS'),
});

export const DeleteWorkspaceMsgSchema = z.object({
  type: z.literal('DELETE_WORKSPACE'),
  name: z.string(),
});

export const DeleteTagMsgSchema = z.object({
  type: z.literal('DELETE_TAG'),
  tag: z.string(),
});

// Bundle every background message into a single runtime-validated union.
export const BgMessageSchema = z.union([
  SaveBookmarkMsgSchema,
  SaveChatBookmarkMsgSchema,
  GetWorkspacesAndTagsMsgSchema,
  DeleteWorkspaceMsgSchema,
  DeleteTagMsgSchema,
]);

export type BgMessage = z.infer<typeof BgMessageSchema>;
