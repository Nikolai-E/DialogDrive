import React, { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { Header } from './components/Header';
import { SearchControls } from './components/SearchControls';
import { PromptList } from './components/PromptList';
import { PromptForm } from './components/PromptForm';
import { Settings } from './components/Settings';
import { usePromptStore } from '~/lib/promptStore';
import { logger } from '~/lib/logger';

const AppContent: React.FC = () => {
  const { 
    activePromptId, 
    isLoading, 
    loadPrompts, 
    setActivePromptId 
  } = usePromptStore();
  
  const [showSettings, setShowSettings] = React.useState(false);
  const isFormVisible = activePromptId !== null;

  // Load prompts on mount
  useEffect(() => {
    logger.log('DialogDrive app initializing...');
    loadPrompts();
  }, [loadPrompts]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            if (!isFormVisible && !showSettings) {
              setActivePromptId(null); // This will trigger form to open for new prompt
            }
            break;
          case 'f':
            e.preventDefault();
            // Focus will be handled by SearchControls component
            break;
        }
      }
      
      if (e.key === 'Escape') {
        if (isFormVisible) {
          setActivePromptId(null);
        } else if (showSettings) {
          setShowSettings(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFormVisible, showSettings, setActivePromptId]);

  const handleNewPrompt = () => {
    setActivePromptId(null); // Opens form for new prompt
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  if (isLoading) {
    return (
      <div className="w-[400px] h-[580px] bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="text-sm">Initializing DialogDrive...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[580px] bg-gray-50 flex flex-col font-sans text-sm">
      <Header 
        onNewPrompt={handleNewPrompt}
        onSettings={handleSettings}
      />
      
      {showSettings ? (
        <Settings onClose={() => setShowSettings(false)} />
      ) : isFormVisible ? (
        <PromptForm />
      ) : (
        <>
          <SearchControls />
          <div className="flex-1 overflow-hidden">
            <PromptList />
          </div>
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
