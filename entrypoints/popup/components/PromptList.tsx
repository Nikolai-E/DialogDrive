import React from 'react';
import { usePromptStore } from '../../../lib/promptStore';
import { PromptItem } from './PromptItem';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Loader2, Info, Search } from 'lucide-react';
import { SearchControls } from './SearchControls';
import { AnimatePresence, motion } from 'framer-motion';

export const PromptList: React.FC = () => {
  const { 
    filteredPrompts,
    isLoading, 
    error,
  } = usePromptStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SearchControls />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {filteredPrompts.length > 0 ? (
            filteredPrompts.map((prompt: any, index: number) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <PromptItem prompt={prompt} />
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8"
            >
              <Search className="h-12 w-12 mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-foreground">No Prompts Found</h3>
              <p className="text-sm">
                Try adjusting your search or filter, or create a new prompt.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
