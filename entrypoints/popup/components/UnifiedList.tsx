import React from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { UnifiedItem } from './UnifiedItem';
import { EnhancedSearchControls } from './EnhancedSearchControls';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Loader2, Info, Search, Plus, MessageSquare, FileText } from 'lucide-react';

export const UnifiedList: React.FC = () => {
  const { 
    filteredItems,
    isLoading, 
    error,
    setCurrentView,
    contentFilter
  } = useUnifiedStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">Loading your content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-50">
        <Alert variant="destructive" className="border-red-200 bg-red-50">
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
          icon: <FileText className="h-8 w-8 text-gray-400" />,
          title: 'No Prompts Found',
          description: 'Create your first prompt to get started with DialogDrive.',
          actionLabel: 'Create Prompt',
          actionView: 'form' as const
        };
      case 'chats':
        return {
          icon: <MessageSquare className="h-8 w-8 text-gray-400" />,
          title: 'No Chat Bookmarks Found',
          description: 'Save your first chat conversation to organize your AI discussions.',
          actionLabel: 'Add Chat Bookmark',
          actionView: 'chat-form' as const
        };
      default:
        return {
          icon: <Search className="h-8 w-8 text-gray-400" />,
          title: 'No Items Found',
          description: 'Try adjusting your search or create new content to get started.',
          actionLabel: 'Create Content',
          actionView: 'form' as const
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 shadow-sm shrink-0">
        <EnhancedSearchControls />
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white">
        {filteredItems.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <UnifiedItem key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
            <div className="bg-white rounded-full p-4 shadow-sm border border-gray-200 mb-4">
              {getEmptyStateContent().icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {getEmptyStateContent().title}
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm">
              {getEmptyStateContent().description}
            </p>
            <div className="flex gap-3">
              {contentFilter !== 'chats' && (
                <button
                  onClick={() => setCurrentView('form')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <FileText className="h-4 w-4" />
                  Create Prompt
                </button>
              )}
              {contentFilter !== 'prompts' && (
                <button
                  onClick={() => setCurrentView('chat-form')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
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
