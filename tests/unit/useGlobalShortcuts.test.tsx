import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { useGlobalShortcuts } from '@/entrypoints/popup/hooks/useGlobalShortcuts';
import type { ChatBookmark } from '@/types/chat';
import type { Prompt } from '@/types/prompt';
import { useUnifiedStore } from '@/lib/unifiedStore';

const Harness = () => {
  useGlobalShortcuts();
  return null;
};

const basePrompt = (): Prompt => ({
  id: 'prompt-1',
  title: 'Title',
  text: 'Body',
  workspace: 'General',
  created: new Date().toISOString(),
  tags: [],
  usageCount: 0,
  isPinned: false,
  includeTimestamp: false,
});

const baseChat = (): ChatBookmark => ({
  id: 'chat-1',
  title: 'Chat',
  url: 'https://chatgpt.com/c/1',
  platform: 'chatgpt',
  workspace: 'General',
  tags: [],
  created: new Date().toISOString(),
  accessCount: 0,
  isPinned: false,
});

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    act(() => {
      useUnifiedStore.setState({
        currentView: 'list',
        editingPrompt: basePrompt(),
        editingChat: baseChat(),
      });
    });
  });

  afterEach(() => {
    act(() => {
      useUnifiedStore.setState({
        currentView: 'list',
        editingPrompt: null,
        editingChat: null,
      });
    });
  });

  test('Ctrl+P opens prompt form and clears editing prompt', () => {
    render(
      <>
        <input placeholder="Search prompts" />
        <Harness />
      </>
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'p', ctrlKey: true });
    });

    const state = useUnifiedStore.getState();
    expect(state.currentView).toBe('form');
    expect(state.editingPrompt).toBeNull();
  });

  test('Ctrl+B opens chat form and clears editing chat', () => {
    render(
      <>
        <input placeholder="Search prompts" />
        <Harness />
      </>
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'b', ctrlKey: true });
    });

    const state = useUnifiedStore.getState();
    expect(state.currentView).toBe('chat-form');
    expect(state.editingChat).toBeNull();
  });

  test('Ctrl+S focuses the search field when present', () => {
    const { getByPlaceholderText } = render(
      <>
        <input placeholder="Search prompts" />
        <Harness />
      </>
    );

    const search = getByPlaceholderText('Search prompts') as HTMLInputElement;
    act(() => {
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    });

    expect(document.activeElement).toBe(search);
  });

  test('Escape returns to list view', () => {
    act(() => {
      useUnifiedStore.setState({ currentView: 'form', editingPrompt: basePrompt() });
    });
    render(
      <>
        <input placeholder="Search prompts" />
        <Harness />
      </>
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    const state = useUnifiedStore.getState();
    expect(state.currentView).toBe('list');
    expect(state.editingPrompt).toBeNull();
  });
});
