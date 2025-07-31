import React, { useEffect } from 'react';
import { usePromptStore } from '../../lib/promptStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { PromptList } from './components/PromptList';
import { PromptForm } from './components/PromptForm';
import { Settings } from './components/Settings';
import { Toaster } from 'sonner';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { logger } from '../../lib/logger';
import { AnimatePresence, motion, Transition } from 'framer-motion';
import './App.css';

const App: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    loadPrompts, 
    setEditingPrompt,
  } = usePromptStore();

  useEffect(() => {
    logger.log('App mounted, loading prompts...');
    loadPrompts();
  }, [loadPrompts]);

  useGlobalShortcuts();

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    setCurrentView('form');
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  };

  const pageTransition: Transition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.12,
  };

  return (
    <ErrorBoundary>
      <main className="w-full h-full max-w-sm mx-auto bg-background flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-border/50">
        <Header onNewPrompt={handleNewPrompt} onSettings={() => setCurrentView('settings')} />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="flex-1 overflow-y-auto"
          >
            {currentView === 'list' && <PromptList />}
            {currentView === 'form' && <PromptForm />}
            {currentView === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
        <Toaster 
          richColors 
          theme="light" 
          position="bottom-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'calc(var(--radius) + 4px)',
              fontSize: '14px',
              bottom: '10px',
            }
          }}
        />
      </main>
    </ErrorBoundary>
  );
};

export default App;