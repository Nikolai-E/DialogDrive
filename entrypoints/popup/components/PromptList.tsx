import { Info, Loader2, Plus, Search } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { VirtualizedPromptList } from '../../../components/VirtualizedList';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import type { Prompt } from '../../../types/prompt';
import { SearchControls } from './SearchControls';

export const PromptList: React.FC = () => {
  const { 
    filteredPrompts,
    isLoading, 
    error,
    setCurrentView,
    setEditingPrompt,
    deletePrompt,
    incrementUsage
  } = useUnifiedStore();

  const handlePromptSelect = async (prompt: Prompt) => {
    // Prefer pasting into the active tab; fallback to clipboard
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs?.[0]?.id;
      if (tabId) {
        try {
          await browser.tabs.sendMessage(tabId, { type: 'PASTE_PROMPT', text: prompt.text });
          await incrementUsage(prompt.id);
          return;
        } catch (_) {}
      }
    } catch (_) {}

    try {
      await navigator.clipboard.writeText(prompt.text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt.text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    await incrementUsage(prompt.id);
  };

  const handlePromptEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setCurrentView('form');
  };

  const handlePromptDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      await deletePrompt(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-gray-50">
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200/80 shrink-0">
        <SearchControls />
      </div>
      {/* List Area */}
      <div className="flex-1 overflow-hidden">
        {filteredPrompts.length > 0 ? (
          <VirtualizedPromptList
            prompts={filteredPrompts}
            onPromptSelect={handlePromptSelect}
            onPromptEdit={handlePromptEdit}
            onPromptDelete={handlePromptDelete}
            height={330}
            className="h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
            <div className="bg-white rounded-full p-4 shadow-sm border border-gray-200 mb-3">
              <Search className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">No Prompts Found</h3>
            <p className="text-gray-600 mb-5 max-w-sm text-sm">
              Try adjusting your search or create your first prompt to get started.
            </p>
            <button
              onClick={() => setCurrentView('form')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
            >
              <Plus className="h-4 w-4" />
              Create Prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
