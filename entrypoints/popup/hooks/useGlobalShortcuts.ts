// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Hook wiring up keyboard shortcuts for quick popup navigation.

import { useEffect } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';

export function useGlobalShortcuts() {
  const { currentView, setCurrentView, setEditingPrompt } = useUnifiedStore();

  useEffect(() => {
    // Listen for a few power-user shortcuts while the popup is open.
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N for New Prompt
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setCurrentView('form');
        setEditingPrompt(null);
      }
      
      // Ctrl+F to focus search
      else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Escape to go back to list view
      else if (e.key === 'Escape') {
        if (currentView !== 'list') {
          e.preventDefault();
          setCurrentView('list');
          setEditingPrompt(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView, setCurrentView, setEditingPrompt]);
}
