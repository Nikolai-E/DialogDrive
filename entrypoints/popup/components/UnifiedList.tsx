import React, { useState } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { UnifiedItem } from './UnifiedItem';
import { CompactControls } from './CompactControls';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { Loader2, Info, Search, Plus, MessageSquare, FileText } from 'lucide-react';
import { cn } from '../../../lib/utils';

type TabType = 'prompts' | 'chats';

export const UnifiedList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('prompts');
  const { 
    filteredItems,
    isLoading, 
    error,
    setCurrentView,
    contentFilter,
    setContentFilter
  } = useUnifiedStore();

  // Update content filter when tab changes
  React.useEffect(() => {
    setContentFilter(activeTab);
  }, [activeTab, setContentFilter]);

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
      {/* Compact Controls Row */}
      <CompactControls />
      
      {/* Tab Navigation - Smaller */}
      <div className="bg-card border-b border-border shrink-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('prompts')}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
              activeTab === 'prompts'
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-center gap-1.5">
              <FileText className="h-3 w-3" />
              Prompts
            </div>
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
              activeTab === 'chats'
                ? "border-accent text-accent bg-accent/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <div className="flex items-center justify-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Chats
            </div>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-card">
        {filteredItems.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <UnifiedItem key={`${item.type}-${item.id}`} item={item} />
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
              {activeTab === 'prompts' && (
                <button
                  onClick={() => setCurrentView('form')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium shadow-sm"
                >
                  <FileText className="h-4 w-4" />
                  Create Prompt
                </button>
              )}
              {activeTab === 'chats' && (
                <button
                  onClick={() => setCurrentView('chat-form')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                  Add Chat Bookmark
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
