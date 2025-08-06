import React from 'react';
import { createRoot } from 'react-dom/client';
import { VirtualizedPromptList } from '../../components/VirtualizedList';
import { promptStorage } from '../../lib/storage';
import type { Prompt } from '../../types/prompt';
import { useCopyToClipboard } from '../popup/hooks/useCopyToClipboard';

interface SidePanelState {
  prompts: Prompt[];
  loading: boolean;
  searchQuery: string;
  selectedWorkspace: string;
  sortBy: 'recent' | 'usage' | 'alphabetical';
}

function SidePanel() {
  const [state, setState] = React.useState<SidePanelState>({
    prompts: [],
    loading: true,
    searchQuery: '',
    selectedWorkspace: 'all',
    sortBy: 'recent'
  });

  const { copyToClipboard } = useCopyToClipboard();

  // Load prompts on mount
  React.useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const prompts = await promptStorage.getAll();
      setState(prev => ({ ...prev, prompts, loading: false }));
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Filter and sort prompts
  const filteredPrompts = React.useMemo(() => {
    let filtered = state.prompts;

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(prompt =>
        prompt.title.toLowerCase().includes(query) ||
        prompt.text.toLowerCase().includes(query) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by workspace
    if (state.selectedWorkspace !== 'all') {
      filtered = filtered.filter(prompt => prompt.workspace === state.selectedWorkspace);
    }

    // Sort prompts
    switch (state.sortBy) {
      case 'recent':
        return filtered.sort((a, b) => 
          new Date(b.lastUsed || b.created).getTime() - new Date(a.lastUsed || a.created).getTime()
        );
      case 'usage':
        return filtered.sort((a, b) => b.usageCount - a.usageCount);
      case 'alphabetical':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return filtered;
    }
  }, [state.prompts, state.searchQuery, state.selectedWorkspace, state.sortBy]);

  // Get unique workspaces
  const workspaces = React.useMemo(() => {
    const unique = [...new Set(state.prompts.map(p => p.workspace))];
    return ['all', ...unique];
  }, [state.prompts]);

  const handlePromptSelect = async (prompt: Prompt) => {
    try {
      // Copy to clipboard
      await copyToClipboard(prompt.text);
      
      // Increment usage count
      await promptStorage.incrementUsage(prompt.id);
      
      // Reload prompts to reflect usage update
      await loadPrompts();
      
      // Try to paste into active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: 'PASTE_PROMPT',
          text: prompt.text
        });
      }
    } catch (error) {
      console.error('Failed to handle prompt selection:', error);
    }
  };

  const handlePromptEdit = (prompt: Prompt) => {
    // Open popup for editing
    if (browser.action) {
      browser.action.openPopup();
    }
    // Could also send message to popup to open edit form
    browser.runtime.sendMessage({
      type: 'EDIT_PROMPT',
      prompt
    });
  };

  const handlePromptDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        await promptStorage.remove(id);
        await loadPrompts();
      } catch (error) {
        console.error('Failed to delete prompt:', error);
      }
    }
  };

  const exportData = async () => {
    try {
      const data = await promptStorage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dialogdrive-prompts-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h1 className="text-lg font-semibold text-gray-900 mb-3">DialogDrive</h1>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search prompts..."
          value={state.searchQuery}
          onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Workspace
          </label>
          <select
            value={state.selectedWorkspace}
            onChange={(e) => setState(prev => ({ ...prev, selectedWorkspace: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            {workspaces.map(workspace => (
              <option key={workspace} value={workspace}>
                {workspace === 'all' ? 'All Workspaces' : workspace}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Sort by
          </label>
          <select
            value={state.sortBy}
            onChange={(e) => setState(prev => ({ ...prev, sortBy: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">Recently Used</option>
            <option value="usage">Most Used</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-xs text-gray-600">
          {filteredPrompts.length} of {state.prompts.length} prompts
        </p>
      </div>

      {/* Prompts List */}
      <div className="flex-1 overflow-hidden">
        {filteredPrompts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500 text-sm">No prompts found</p>
          </div>
        ) : (
          <VirtualizedPromptList
            prompts={filteredPrompts}
            onPromptSelect={handlePromptSelect}
            onPromptEdit={handlePromptEdit}
            onPromptDelete={handlePromptDelete}
            height={600}
            className="h-full"
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (browser.action) {
                browser.action.openPopup();
              }
            }}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Prompt
          </button>
          <button
            onClick={exportData}
            className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

// Initialize side panel
function initSidePanel() {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<SidePanel />);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidePanel);
} else {
  initSidePanel();
}

export default SidePanel;
