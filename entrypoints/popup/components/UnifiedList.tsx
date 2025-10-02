// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Virtualized list that blends prompts and chats with quick filters.

import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, Info, Loader2, MessageSquare, Search } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { useUnifiedStore } from '../../../lib/unifiedStore';
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
  } = useUnifiedStore();

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
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-background">
            <div className="bg-card rounded-full p-3.5 shadow-sm border border-border mb-3.5">
              {getEmptyStateContent().icon}
            </div>
            <h3 className="text-[15px] font-semibold text-foreground mb-1.5">
              {getEmptyStateContent().title}
            </h3>
            <p className="text-muted-foreground mb-5 max-w-sm text-[13px]">
              {getEmptyStateContent().description}
            </p>
            <div className="flex gap-2.5">
              {(() => {
                const empty = getEmptyStateContent();
                return (
                  <button
                    type="button"
                    onClick={() => setCurrentView(empty.actionView)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors font-medium shadow-sm text-[13px]"
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
