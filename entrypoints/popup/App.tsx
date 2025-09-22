// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Main popup shell that ties together prompts, chats, and settings.

import React, { Suspense, useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { logger } from '../../lib/logger';
import { secureStorage } from '../../lib/secureStorageV2';
import { useUnifiedStore } from '../../lib/unifiedStore';
import './App.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import OnboardingBanner from './components/OnboardingBanner';
import { UnifiedList } from './components/UnifiedList';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
// removed pulsing overlay icons
// Lazy-loaded heavy views keep the initial popup snappy.
const PromptForm = React.lazy(async () => {
  const { PromptForm } = await import('./components/PromptForm');
  return { default: PromptForm };
});
const ChatForm = React.lazy(async () => {
  const { ChatForm } = await import('./components/ChatForm');
  return { default: ChatForm };
});
const Settings = React.lazy(async () => {
  const { Settings } = await import('./components/Settings');
  return { default: Settings };
});
const TextCleanerPanel = React.lazy(async () => {
  const mod = await import('./components/TextCleanerPanel');
  return { default: mod.TextCleanerPanel };
});

const App: React.FC = () => {
  // Pull reactive state/actions from the unified store.
  const { 
    currentView, 
    setCurrentView, 
    loadAll, 
    setEditingPrompt,
    setEditingChat,
  } = useUnifiedStore();

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Load prompts and chats when the popup first opens.
    logger.info('App mounted, loading all data...');
    loadAll();
    // Fetch preference to see if we should show the first-run banner
    (async () => {
      try {
        const prefs: any = (await secureStorage.getPreferences()) || {};
        setShowOnboarding(!prefs?.onboardingDismissed);
      } catch {
        setShowOnboarding(true);
      }
    })();
  }, [loadAll]);

  // Registers keyboard shortcuts so users can drive the popup quickly.
  useGlobalShortcuts();

  // Quick view handlers pivot the UI into the right form/panel.
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
  const handleOpenCleaner = () => {
    setCurrentView('cleaner');
  };

  return (
    <ErrorBoundary>
      {/* Enforce hard popup constraints and compact defaults */}
      <main className="w-[400px] max-w-[400px] h-[580px] max-h-[580px] bg-background text-foreground flex flex-col text-[12px] leading-5">
        <Header 
          onNewPrompt={handleNewPrompt} 
          onNewChat={handleNewChat}
          onSettings={handleShowSettings} 
          onOpenCleaner={handleOpenCleaner}
        />
        {/* Onboarding inline arrow overlay removed per request */}
        {/* Single scroll container; prevent nested scrolling */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent px-2.5 py-2">
          {showOnboarding && currentView === 'list' && (
            <OnboardingBanner
              onDismiss={async () => {
                try {
                  const prefs: any = (await secureStorage.getPreferences()) || {};
                  await secureStorage.setPreferences({ ...prefs, onboardingDismissed: true });
                } catch {}
                setShowOnboarding(false);
              }}
            />
          )}
          {currentView === 'list' && <UnifiedList />}
          <Suspense fallback={<div className="py-6 text-center text-muted-foreground">Loading...</div>}>
            {currentView === 'form' && <PromptForm onboardingActive={showOnboarding} />}
            {currentView === 'chat-form' && <ChatForm onboardingActive={showOnboarding} />}
            {currentView === 'settings' && <Settings />}
            {currentView === 'cleaner' && <TextCleanerPanel />}
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
