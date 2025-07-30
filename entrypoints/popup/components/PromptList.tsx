import React, { useMemo } from 'react';
import { usePromptStore } from '~/lib/promptStore';
import { PromptItem } from './PromptItem';
import type { Prompt } from '~/types/prompt';

export const PromptList: React.FC = () => {
  const { 
    prompts, 
    isLoading, 
    error,
    searchQuery,
    selectedWorkspace,
    showPinnedOnly
  } = usePromptStore();

  // Filter and sort prompts
  const filteredPrompts = useMemo(() => {
    let filtered = prompts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.title.toLowerCase().includes(query) ||
        prompt.text.toLowerCase().includes(query) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(query)) ||
        prompt.workspace.toLowerCase().includes(query)
      );
    }

    // Apply workspace filter
    if (selectedWorkspace !== 'All') {
      filtered = filtered.filter(prompt => prompt.workspace === selectedWorkspace);
    }

    // Apply pinned filter
    if (showPinnedOnly) {
      filtered = filtered.filter(prompt => prompt.isPinned);
    }

    // Sort: pinned first, then by creation date (newest first)
    return filtered.sort((a, b) => {
      // Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Then by creation date (newest first)
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }, [prompts, searchQuery, selectedWorkspace, showPinnedOnly]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span>Loading prompts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 text-lg mb-2">⚠️</div>
        <p className="text-red-600 font-medium mb-2">Error loading prompts</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Reload Extension
        </button>
      </div>
    );
  }

  if (filteredPrompts.length === 0) {
    const hasFilters = searchQuery || selectedWorkspace !== 'All' || showPinnedOnly;
    
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 text-4xl mb-4">
          {hasFilters ? '🔍' : '💬'}
        </div>
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          {hasFilters ? 'No prompts match your filters' : 'No prompts yet'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {hasFilters 
            ? 'Try adjusting your search or filters' 
            : 'Create your first prompt to get started'}
        </p>
        {!hasFilters && (
          <button
            onClick={() => usePromptStore.getState().setActivePromptId(null)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Create First Prompt
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Results count */}
      <div className="text-sm text-gray-500 mb-3">
        {filteredPrompts.length === prompts.length 
          ? `${prompts.length} prompt${prompts.length !== 1 ? 's' : ''}`
          : `${filteredPrompts.length} of ${prompts.length} prompt${prompts.length !== 1 ? 's' : ''}`
        }
      </div>
      
      {/* Prompt items */}
      {filteredPrompts.map((prompt) => (
        <PromptItem key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
};
