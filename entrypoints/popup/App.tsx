import React, { useEffect, Suspense } from 'react';
import { useUnifiedStore } from '../../lib/unifiedStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { UnifiedList } from './components/UnifiedList';
// Lazy-loaded heavy views
const PromptForm = React.lazy(() => import('./components/PromptForm').then(m => ({ default: m.PromptForm })));
const ChatForm = React.lazy(() => import('./components/ChatForm').then(m => ({ default: m.ChatForm })));
const Settings = React.lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
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
      {/* Enforce hard popup constraints and compact defaults */}
      <main className="w-[400px] max-w-[400px] h-[580px] max-h-[580px] bg-background text-foreground flex flex-col text-[12px] leading-5">
        <Header 
          onNewPrompt={handleNewPrompt} 
          onNewChat={handleNewChat}
          onSettings={handleShowSettings} 
        />
        {/* Single scroll container; prevent nested scrolling */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent px-2.5 py-2">
          {currentView === 'list' && <UnifiedList />}
          <Suspense fallback={<div className="py-6 text-center text-muted-foreground">Loading…</div>}>
            {currentView === 'form' && <PromptForm />}
            {currentView === 'chat-form' && <ChatForm />}
            {currentView === 'settings' && <Settings />}
          </Suspense>
        </div>
        {/* Toasts */}
        <Toaster 
          richColors
          theme="system"
          position="bottom-center"
          toastOptions={{
            duration: 2200,
            closeButton: true,
            classNames: {
              toast: 'bg-popover text-foreground shadow border border-border text-[11px] leading-[1.25rem] font-medium rounded-md px-2 py-1.5',
              actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-md h-7 px-2',
              cancelButton: 'bg-muted text-foreground hover:bg-muted/80 rounded-md h-7 px-2',
              title: 'text-foreground/90',
              description: 'text-muted-foreground',
            },
          }}
        />
      </main>
    </ErrorBoundary>
  );
};

export default App;