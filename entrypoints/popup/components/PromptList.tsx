import React from 'react';
import { usePromptStore } from '../../../lib/promptStore';
import { PromptItem } from './PromptItem';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Loader2, Info, Search, Plus } from 'lucide-react';
import { SearchControls } from './SearchControls';

export const PromptList: React.FC = () => {
  const { 
    filteredPrompts,
    isLoading, 
    error,
    setCurrentView
  } = usePromptStore();

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
      <div className="p-4 bg-gray-50">
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 shadow-sm shrink-0">
        <SearchControls />
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white">
        {filteredPrompts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredPrompts.map((prompt: any) => (
              <PromptItem key={prompt.id} prompt={prompt} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
            <div className="bg-white rounded-full p-4 shadow-sm border border-gray-200 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prompts Found</h3>
            <p className="text-gray-600 mb-6 max-w-sm">
              Try adjusting your search or create your first prompt to get started.
            </p>
            <button
              onClick={() => setCurrentView('form')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
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
