import React from 'react';
import { PromptList } from './components/PromptList';
import { PromptForm } from './components/PromptForm';
import { SearchControls } from './components/SearchControls';
import { Header } from './components/Header';
import { Settings } from './components/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { usePromptStore } from '~/lib/promptStore';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { initializeStorage } from '~/lib/storage';
import { logger } from '~/lib/logger';
import './App.css';

const App: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    loadPrompts, 
    setEditingPrompt,
    isLoading,
    error 
  } = usePromptStore();

  // Initialize app on mount
  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.log('App mounted, initializing...');
        await initializeStorage();
        await loadPrompts();
        logger.log('App initialization complete');
      } catch (err) {
        logger.error('App initialization failed:', err);
      }
    };
    
    initializeApp();
  }, [loadPrompts]);

  // Register global keyboard shortcuts
  useGlobalShortcuts();

  const renderContent = () => {
    switch (currentView) {
      case 'form':
        return <PromptForm />;
      case 'settings':
        return <Settings onClose={() => setCurrentView('list')} />;
      case 'list':
      default:
        return <PromptList />;
    }
  };

  if (isLoading) {
    return (
      <div className="w-96 h-[580px] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-96 h-[580px] bg-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            Reload Extension
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="w-96 h-[580px] bg-gray-50 flex flex-col">
          {currentView === 'list' && (
            <>
              <Header 
                onNewPrompt={() => {
                  setCurrentView('form');
                  setEditingPrompt(null);
                }}
                onSettings={() => setCurrentView('settings')}
              />
              <SearchControls />
            </>
          )}
          
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
