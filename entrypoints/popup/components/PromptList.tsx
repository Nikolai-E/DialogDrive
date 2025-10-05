import { Info, Loader2, Plus, Search } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
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
    incrementUsage,
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
      ta.value = prompt.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
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
      <div className="flex items-center justify-center h-full bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-border/60 bg-card/95 px-5 py-4 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-[12.5px] text-muted-foreground font-medium">Loading prompts…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-background">
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border/55 bg-[hsl(var(--surface-contrast))]/80 backdrop-blur">
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
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[hsl(var(--background))]">
            <div className="rounded-full border border-border/60 bg-card px-4 py-4 shadow-sm mb-3">
              <Search className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-[13.5px] font-semibold text-foreground mb-1.5">No Prompts Found</h3>
            <p className="text-muted-foreground mb-5 max-w-sm text-[11.5px] leading-relaxed">
              Try adjusting your search or create your first prompt to get started.
            </p>
            <Button
              onClick={() => setCurrentView('form')}
              withIcon
              className="h-8 rounded-full px-3.5 text-[12px] font-semibold hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Prompt
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
