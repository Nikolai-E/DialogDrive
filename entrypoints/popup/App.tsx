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
    initial: { opacity: 0, x: -10 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: 10 },
  };

  const pageTransition: Transition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3,
  };

  return (
    <ErrorBoundary>
      return (
    <ErrorBoundary>
      <main className="w-full h-full max-w-sm mx-auto bg-gray-50 flex flex-col overflow-hidden">
        <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-xl">
          <Header onNewPrompt={handleNewPrompt} onSettings={() => setCurrentView('settings')} />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial="in"
              animate="center"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="flex-1 overflow-y-auto bg-gray-50"
            >
              {currentView === 'list' && <PromptList />}
              {currentView === 'form' && <PromptForm />}
              {currentView === 'settings' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
        <Toaster 
          richColors 
          theme="light" 
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: 'white',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '14px',
            }
          }}
        />
      </main>
    </ErrorBoundary>
  );
    </ErrorBoundary>
  );
};

export default App;