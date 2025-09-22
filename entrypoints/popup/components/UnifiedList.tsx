// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Virtualized list that blends prompts and chats with quick filters.

import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, Info, Loader2, MessageSquare, Search } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import { UnifiedItem } from './UnifiedItem';

export const UnifiedList: React.FC = () => {
  // Reference for the scroll container powering the virtualizer.
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const { 
    filteredItems,
    isLoading, 
    error,
    setCurrentView,
    contentFilter,
    prompts,
    chats,
    setFilterTag,
    filterTag,
    setSelectedWorkspace,
    selectedWorkspace,
    workspaces,
    selectedTags,
    setSelectedTags
  } = useUnifiedStore();

  // Use store-backed multi-select tags for OR filtering.
  const activeTags = selectedTags && selectedTags.length > 0 ? selectedTags : (filterTag !== 'all' ? [filterTag] : []);
  const toggleTag = (tag: string) => {
    const exists = activeTags.includes(tag);
    const next = exists ? activeTags.filter(t => t !== tag) : [...activeTags, tag];
    // Sync to the store so unified filtering keeps working across views.
    setSelectedTags(next);
    // Maintain the legacy single-tag field for other UIs.
    if (next.length === 0) setFilterTag('all');
    else setFilterTag(next[next.length - 1]);
  };

  // Derive frequency metrics (combined prompts and chats).
  const tagFrequency: Record<string, number> = {};
  // Count how often each tag shows up across prompts and chats.
  prompts.forEach((p) => (p.tags || []).forEach((t) => { tagFrequency[t] = (tagFrequency[t] || 0) + 1; }));
  chats.forEach((c) => (c.tags || []).forEach((t) => { tagFrequency[t] = (tagFrequency[t] || 0) + 1; }));
  const topTags = Object.entries(tagFrequency)
    .sort((a,b) => b[1]-a[1])
    .slice(0,10)
    .map(([tag]) => tag);

  const workspaceFrequency: Record<string, number> = {};
  // Track how many items live in each workspace to surface smart chips.
  prompts.forEach((p) => { workspaceFrequency[p.workspace] = (workspaceFrequency[p.workspace] || 0) + 1; });
  chats.forEach((c) => { workspaceFrequency[c.workspace] = (workspaceFrequency[c.workspace] || 0) + 1; });
  const topWorkspaces = Object.entries(workspaceFrequency)
    .sort((a,b) => b[1]-a[1])
    .slice(0,4)
    .map(([ws]) => ws);

  // Virtual list setup driven by React Virtual.
  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Fixed height from UI spec
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (isLoading) {
    // Friendly loading state while prompts/chats stream in.
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground font-medium">Loading your content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Bubble up any load errors so the user can retry later.
    return (
      <div className="p-4 bg-background">
        <Alert variant="destructive" className="border-destructive/20 bg-destructive/5">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getEmptyStateContent = () => {
    // Tailor the empty state messaging to the current filter.
    switch (contentFilter) {
      case 'prompts':
        return {
          icon: <FileText className="h-8 w-8 text-muted-foreground" />,
          title: 'No Prompts Found',
          description: 'Create your first prompt to get started with DialogDrive.',
          actionLabel: 'Create Prompt',
          actionView: 'form' as const
        };
      case 'chats':
        return {
          icon: <MessageSquare className="h-8 w-8 text-muted-foreground" />,
          title: 'No Chat Bookmarks Found',
          description: 'Save your first chat conversation to organize your AI discussions.',
          actionLabel: 'Add Chat Bookmark',
          actionView: 'chat-form' as const
        };
      default:
        return {
          icon: <Search className="h-8 w-8 text-muted-foreground" />,
          title: 'No Items Found',
          description: 'Try adjusting your search or create new content to get started.',
          actionLabel: 'Create Content',
          actionView: 'form' as const
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Quick filters showing top workspaces and tags. */}
      <div className="px-2 pt-1.5 pb-1 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex gap-1.5 items-center overflow-x-auto whitespace-nowrap scrollbar-thin pb-1">
          {topWorkspaces.map(ws => (
            <button
              type="button"
              key={ws}
              onClick={() => setSelectedWorkspace(selectedWorkspace === ws ? 'all' : ws)}
              className={cn('px-2.5 py-1 rounded-full text-[10px] border transition-colors shrink-0',
                selectedWorkspace === ws ? 'bg-black text-white border-black' : 'bg-muted/50 hover:bg-muted border-border')}
            >{ws}</button>
          ))}
          {topTags.map(tag => (
            <button
              type="button"
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn('px-2.5 py-1 rounded-full text-[10px] border transition-colors shrink-0',
                activeTags.includes(tag) ? 'bg-black text-white border-black' : 'bg-muted/50 hover:bg-muted border-border')}
            >#{tag}</button>
          ))}
          {(topTags.length === 0 && topWorkspaces.length === 0) && (
            <span className="text-[10px] text-muted-foreground">Add tags & workspaces to enable quick filters</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-card" ref={parentRef}>
        {filteredItems.length > 0 ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {/* Render each virtual row in place for smooth scrolling. */}
            {virtualItems.map((virtualItem) => (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <UnifiedItem item={filteredItems[virtualItem.index]} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-background">
            <div className="bg-card rounded-full p-4 shadow-sm border border-border mb-4">
              {getEmptyStateContent().icon}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {getEmptyStateContent().title}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {getEmptyStateContent().description}
            </p>
            <div className="flex gap-3">
              {(() => {
                const empty = getEmptyStateContent();
                return (
                  <button
                    type="button"
                    onClick={() => setCurrentView(empty.actionView)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium shadow-sm"
                  >
                    {contentFilter === 'chats' ? <MessageSquare className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    {empty.actionLabel}
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
