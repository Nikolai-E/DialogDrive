import React, { useRef } from 'react';
import { usePromptStore } from '~/lib/promptStore';

export const SearchControls: React.FC = () => {
  const {
    searchQuery,
    selectedWorkspace,
    showPinnedOnly,
    workspaces,
    setSearchQuery,
    setSelectedWorkspace,
    setShowPinnedOnly,
    resetFilters,
  } = usePromptStore();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const hasActiveFilters = searchQuery || selectedWorkspace !== 'All' || showPinnedOnly;

  // Expose search input ref for keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search prompts... (Ctrl+F)"
          className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 text-sm">
        {/* Workspace Filter */}
        <select
          value={selectedWorkspace}
          onChange={(e) => setSelectedWorkspace(e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Workspaces</option>
          {workspaces.map(workspace => (
            <option key={workspace} value={workspace}>
              {workspace}
            </option>
          ))}
        </select>

        {/* Pinned Filter */}
        <button
          onClick={() => setShowPinnedOnly(!showPinnedOnly)}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            showPinnedOnly
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          📌 Pinned
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-transparent hover:border-gray-300 rounded transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
