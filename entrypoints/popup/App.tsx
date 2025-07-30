import React, { useEffect } from 'react';
import { usePromptStore } from '~/lib/promptStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { SearchControls } from './components/SearchControls';
import { PromptList } from './components/PromptList';
import { PromptForm } from './components/PromptForm';
import { ToastProvider } from './components/ToastProvider';
import { logger } from '~/lib/logger';
import './App.css';

// Inline Settings component temporarily
const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title="Close Settings"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <p className="text-gray-600">Settings panel - API key management coming soon!</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    loadPrompts, 
    editingPrompt, 
    setEditingPrompt,
    isLoading,
    error,
    prompts
  } = usePromptStore();

  // Load prompts on mount
  useEffect(() => {
    logger.log('App mounted, loading prompts...');
    loadPrompts();
  }, [loadPrompts]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setCurrentView('form');
        setEditingPrompt(null);
      } else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      } else if (e.key === 'Escape') {
        if (currentView !== 'list') {
          setCurrentView('list');
          setEditingPrompt(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentView, setCurrentView, setEditingPrompt]);

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
          {/* Header - only show on main list view */}
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

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {currentView === 'list' && <PromptList />}
            {currentView === 'form' && <PromptForm />}
            {currentView === 'settings' && <Settings onClose={() => setCurrentView('list')} />}
          </div>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;