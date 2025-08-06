import { useVirtualizer } from '@tanstack/react-virtual';
import { FileText, Info, Loader2, MessageSquare, Search } from 'lucide-react';
import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import { UnifiedItem } from './UnifiedItem';

export const UnifiedList: React.FC = () => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const { 
    filteredItems,
    isLoading, 
    error,
    setCurrentView,
    contentFilter,
  } = useUnifiedStore();

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Fixed height from UI spec
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (isLoading) {
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
              <button
                onClick={() => setCurrentView('form')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium shadow-sm"
              >
                <FileText className="h-4 w-4" />
                Create Prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
