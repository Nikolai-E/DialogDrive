// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Hook wiring up keyboard shortcuts for quick popup navigation.

import { useEffect } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';

export function useGlobalShortcuts() {
  const { currentView, setCurrentView, setEditingPrompt, setEditingChat } = useUnifiedStore();

  useEffect(() => {
    // Listen for a few power-user shortcuts while the popup is open.
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+P for New Prompt (intercepts Print)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        e.stopPropagation();
        setCurrentView('form');
        setEditingPrompt(null);
      }
      // Ctrl/Cmd+B for Bookmark Chat
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        e.stopPropagation();
        setCurrentView('chat-form');
        setEditingChat(null);
      }
      
      // Ctrl/Cmd+S to focus search (intercepts Save Page)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
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
