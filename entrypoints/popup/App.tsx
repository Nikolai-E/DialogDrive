import React, { useEffect } from 'react';
import { useUnifiedStore } from '../../lib/unifiedStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { UnifiedList } from './components/UnifiedList';
import { PromptForm } from './components/PromptForm';
import { ChatForm } from './components/ChatForm';
import { Settings } from './components/Settings';
import { Toaster } from 'sonner';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { logger } from '../../lib/logger';
import './App.css';

const App: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    loadAll, 
    setEditingPrompt,
    setEditingChat,
  } = useUnifiedStore();

  useEffect(() => {
    logger.info('App mounted, loading all data...');
    loadAll();
  }, [loadAll]);

  useGlobalShortcuts();

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    setCurrentView('form');
  };

  const handleNewChat = () => {
    setEditingChat(null);
    setCurrentView('chat-form');
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  return (
    <ErrorBoundary>
      <main className="w-full h-full max-w-[400px] mx-auto bg-background flex flex-col overflow-hidden">
        <Header 
          onNewPrompt={handleNewPrompt} 
          onNewChat={handleNewChat}
          onSettings={handleShowSettings} 
        />
        <div className="flex-1 overflow-hidden">
          {currentView === 'list' && <UnifiedList />}
          {currentView === 'form' && <PromptForm />}
          {currentView === 'chat-form' && <ChatForm />}
          {currentView === 'settings' && <Settings />}
        </div>
        <Toaster 
          richColors 
          theme="dark" 
          position="bottom-center"
          toastOptions={{
            duration: 2000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              border: 'none',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '500',
              boxShadow: 'var(--shadow)',
            }
          }}
        />
      </main>
    </ErrorBoundary>
  );
};

export default App;