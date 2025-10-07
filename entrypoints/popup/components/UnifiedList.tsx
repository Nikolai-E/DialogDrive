// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Virtualized list that blends prompts and chats with quick filters.

import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, Info, Loader2, MessageSquare, Search } from 'lucide-react';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { UnifiedItem } from './UnifiedItem';

export const UnifiedList: React.FC = () => {
  // Reference for the scroll container powering the virtualizer.
  const parentRef = React.useRef<HTMLDivElement>(null);

  const { filteredItems, isLoading, error, setCurrentView, contentFilter } = useUnifiedStore();

  // Virtual list setup driven by React Virtual.
  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 6,
    getItemKey: (index) => filteredItems[index]?.id ?? index,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (isLoading) {
    // Friendly loading state while prompts/chats stream in.
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-border/60 bg-card/90 px-6 py-5 text-center shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-[12.5px] text-muted-foreground">Loading your content…</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Bubble up any load errors so the user can retry later.
    return (
      <div className="p-3">
        <Alert variant="destructive" className="border-destructive/25 bg-destructive/10">
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
          actionView: 'form' as const,
        };
      case 'chats':
        return {
          icon: <MessageSquare className="h-8 w-8 text-muted-foreground" />,
          title: 'No Chat Bookmarks Found',
          description: 'Save your first chat conversation to organize your AI discussions.',
          actionLabel: 'Add Chat Bookmark',
          actionView: 'chat-form' as const,
        };
      default:
        return {
          icon: <Search className="h-8 w-8 text-muted-foreground" />,
          title: 'No Items Found',
          description: 'Try adjusting your search or create new content to get started.',
          actionLabel: 'Create Content',
          actionView: 'form' as const,
        };
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div ref={parentRef} className="flex-1 overflow-y-auto scrollbar-thin">
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
                {...{ 'data-index': virtualItem.index }}
                ref={virtualizer.measureElement}
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
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="rounded-full border border-border/70 bg-card px-3.5 py-3 shadow-sm mb-3">
              {getEmptyStateContent().icon}
            </div>
            <h3 className="text-[13.5px] font-semibold text-foreground mb-1">
              {getEmptyStateContent().title}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-[11.5px] leading-relaxed">
              {getEmptyStateContent().description}
            </p>
            <div className="flex gap-2.5">
              {(() => {
                const empty = getEmptyStateContent();
                return (
                  <Button
                    type="button"
                    variant="default"
                    size="default"
                    withIcon
                    className="h-8 rounded-full px-3.5 text-[12px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    onClick={() => setCurrentView(empty.actionView)}
                  >
                    {contentFilter === 'chats' ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {empty.actionLabel}
                  </Button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
