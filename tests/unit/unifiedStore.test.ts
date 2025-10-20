import { beforeEach, describe, expect, test } from 'vitest';

import type { ChatBookmark } from '@/types/chat';
import type { Prompt } from '@/types/prompt';
import { useUnifiedStore } from '@/lib/unifiedStore';

const makePrompt = (overrides: Partial<Prompt>): Prompt => ({
  id: `prompt-${Math.random()}`,
  title: 'Prompt',
  text: 'Body',
  workspace: 'General',
  created: new Date().toISOString(),
  tags: [],
  usageCount: 0,
  isPinned: false,
  includeTimestamp: false,
  ...overrides,
});

const makeChat = (overrides: Partial<ChatBookmark>): ChatBookmark => ({
  id: `chat-${Math.random()}`,
  title: 'Chat',
  url: 'https://chatgpt.com/c/1',
  platform: 'chatgpt',
  workspace: 'General',
  tags: [],
  created: new Date().toISOString(),
  accessCount: 0,
  isPinned: false,
  ...overrides,
});

const primeStore = (prompts: Prompt[], chats: ChatBookmark[]) => {
  useUnifiedStore.setState({ prompts, chats, isLoading: false });
  // Trigger derived recompute
  useUnifiedStore.getState().setSearchTerm('');
};

describe('useUnifiedStore derived behaviour', () => {
  beforeEach(() => {
    useUnifiedStore.setState({
      prompts: [],
      chats: [],
      isLoading: true,
      searchTerm: '',
      filterTag: 'all',
      selectedTags: [],
      showPinned: false,
      contentFilter: 'all',
      selectedWorkspace: 'all',
      workspaces: ['General'],
      allTags: [],
      filteredItems: [],
      filteredPrompts: [],
    });
  });

  test('filters items by search term across prompts, chats, and tags', () => {
    const prompts = [
      makePrompt({ id: 'p1', title: 'Research plan', tags: ['project'] }),
      makePrompt({ id: 'p2', title: 'Blog outline', tags: ['blog'] }),
    ];
    const chats = [
      makeChat({
        id: 'c1',
        title: 'Support case',
        description: 'Customer issue',
        tags: ['support'],
      }),
    ];
    primeStore(prompts, chats);

    useUnifiedStore.getState().setSearchTerm('blog');
    let items = useUnifiedStore.getState().filteredItems;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('p2');

    useUnifiedStore.getState().setSearchTerm('support');
    items = useUnifiedStore.getState().filteredItems;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('c1');
  });

  test('applies tag, workspace, and pinned filters together', () => {
    const prompts = [
      makePrompt({
        id: 'p1',
        title: 'General prompt',
        workspace: 'General',
        tags: ['ai'],
        isPinned: true,
      }),
      makePrompt({ id: 'p2', title: 'Draft', workspace: 'Writing', tags: ['draft'] }),
    ];
    const chats = [
      makeChat({
        id: 'c1',
        title: 'Pinned chat',
        workspace: 'Writing',
        tags: ['ai'],
        isPinned: true,
      }),
    ];
    primeStore(prompts, chats);

    const store = useUnifiedStore.getState();
    store.setShowPinned(true);
    store.setContentFilter('all');
    store.setSelectedTags(['ai']);
    store.setSelectedWorkspace('Writing');

    const items = useUnifiedStore.getState().filteredItems;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('c1');
  });

  test('contentFilter limits results to prompts or chats', () => {
    const prompts = [makePrompt({ id: 'p1', title: 'Only prompt' })];
    const chats = [makeChat({ id: 'c1', title: 'Only chat' })];
    primeStore(prompts, chats);

    useUnifiedStore.getState().setContentFilter('prompts');
    let items = useUnifiedStore.getState().filteredItems;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('p1');

    useUnifiedStore.getState().setContentFilter('chats');
    items = useUnifiedStore.getState().filteredItems;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('c1');
  });
});
