import { ChevronDown, Hammer, Pin, Plus, Settings as SettingsIcon, SortAsc } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import type { SortOption } from '../../../types/app';

export const SearchControls: React.FC = () => {
  const {
    sortBy,
    filterTag,
    showPinned,
    selectedWorkspace,
    allTags,
    workspaces,
    setSortBy,
    setFilterTag,
    setShowPinned,
    setSelectedWorkspace,
    setCurrentView,
  } = useUnifiedStore();

  // Dropdown states
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);

  // Refs for dropdowns
  const sortRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Sort options
  const sortOptions: { value: string; label: string }[] = [
    { value: 'lastUsed', label: 'Recent' },
    { value: 'title', label: 'A-Z' },
    { value: 'usageCount', label: 'Most Used' },
    { value: 'createdAt', label: 'Created' },
  ];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
      if (pinnedRef.current && !pinnedRef.current.contains(event.target as Node)) {
        setShowPinnedDropdown(false);
      }
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
      if (tagRef.current && !tagRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setShowToolsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative bg-gray-50/80 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 border-b border-gray-200/80 px-2 py-1 text-[12px] z-10">
      {/* Single Row with Filters and Actions */}
      <div className="flex items-center gap-0.5 flex-nowrap overflow-hidden">
        {/* Left Side: Filter Dropdowns */}
        <div className="flex items-center gap-0.5 flex-1 flex-nowrap min-w-0 overflow-hidden">
          {/* Sort Dropdown */}
          <div ref={sortRef} className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="h-7 px-1 gap-0.5 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[11px] whitespace-nowrap"
              aria-haspopup="menu"
              aria-expanded={showSortDropdown}
            >
              <SortAsc className="h-3 w-3 text-gray-500" />
              <span className="text-[10px]">
                {sortOptions.find((opt) => opt.value === sortBy)?.label || 'Sort'}
              </span>
              <ChevronDown className="h-2.5 w-2.5 text-gray-500" />
            </Button>
            {showSortDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-lg shadow-xl min-w-[120px] py-0.5 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value as SortOption);
                      setShowSortDropdown(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 first:rounded-t-lg last:rounded-b-lg',
                      sortBy === option.value && 'bg-gray-100 font-medium text-black'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pinned Dropdown */}
          <div ref={pinnedRef} className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPinnedDropdown(!showPinnedDropdown)}
              className="h-7 w-7 p-0 border-gray-200 bg-white hover:bg-gray-50"
              aria-haspopup="menu"
              aria-expanded={showPinnedDropdown}
              title={showPinned ? 'Showing Pinned Only' : 'Showing All'}
            >
              <Pin
                className={cn(
                  'h-3.5 w-3.5',
                  showPinned ? 'text-black fill-black' : 'text-gray-500'
                )}
              />
            </Button>
            {showPinnedDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-lg shadow-xl min-w-[100px] py-0.5 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setShowPinned(false);
                    setShowPinnedDropdown(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 first:rounded-t-lg last:rounded-b-lg',
                    !showPinned && 'bg-gray-100 font-medium text-black'
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setShowPinned(true);
                    setShowPinnedDropdown(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 first:rounded-t-lg last:rounded-b-lg',
                    showPinned && 'bg-gray-100 font-medium text-black'
                  )}
                >
                  Pinned Only
                </button>
              </div>
            )}
          </div>

          {/* Workspace Dropdown */}
          <div ref={workspaceRef} className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
              className="h-7 px-1.5 gap-0.5 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[11px] whitespace-nowrap"
              aria-haspopup="menu"
              aria-expanded={showWorkspaceDropdown}
            >
              <span className="truncate max-w-[45px] text-[10px]">
                {selectedWorkspace === 'all' ? 'Workspace' : selectedWorkspace}
              </span>
              <ChevronDown className="h-2.5 w-2.5 text-gray-500" />
            </Button>
            {showWorkspaceDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-lg shadow-xl min-w-[140px] max-h-[240px] overflow-y-auto py-0.5 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-white/95 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400/80">
                <button
                  onClick={() => {
                    setSelectedWorkspace('all');
                    setShowWorkspaceDropdown(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 rounded-t-lg',
                    selectedWorkspace === 'all' && 'bg-gray-100 font-medium text-black'
                  )}
                >
                  All Workspaces
                </button>
                {workspaces.length > 0 && (
                  <>
                    <div className="border-t border-gray-200/60 my-0.5" />
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace}
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setShowWorkspaceDropdown(false);
                        }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 truncate last:rounded-b-lg',
                          selectedWorkspace === workspace && 'bg-gray-100 font-medium text-black'
                        )}
                        title={workspace}
                      >
                        {workspace}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tag Dropdown */}
          {allTags.length > 0 && (
            <div ref={tagRef} className="relative flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="h-7 px-1.5 gap-0.5 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[11px] whitespace-nowrap"
                aria-haspopup="menu"
                aria-expanded={showTagDropdown}
              >
                <span className="truncate max-w-[45px] text-[10px]">
                  {filterTag === 'all' ? 'Tag' : filterTag}
                </span>
                <ChevronDown className="h-2.5 w-2.5 text-gray-500" />
              </Button>
              {showTagDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-lg shadow-xl min-w-[120px] max-h-[240px] overflow-y-auto py-0.5 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-white/95 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400/80">
                  <button
                    onClick={() => {
                      setFilterTag('all');
                      setShowTagDropdown(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 rounded-t-lg',
                      filterTag === 'all' && 'bg-gray-100 font-medium text-black'
                    )}
                  >
                    All Tags
                  </button>
                  <div className="border-t border-gray-200/60 my-0.5" />
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setFilterTag(tag);
                        setShowTagDropdown(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 truncate last:rounded-b-lg',
                        filterTag === tag && 'bg-gray-100 font-medium text-black'
                      )}
                      title={tag}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tools Dropdown */}
          <div ref={toolsRef} className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="h-7 px-1.5 gap-0.5 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[11px]"
              aria-haspopup="menu"
              aria-expanded={showToolsDropdown}
            >
              <Hammer className="h-3 w-3 text-gray-500" />
              <span className="truncate text-[10px]">Tools</span>
              <ChevronDown className="h-2.5 w-2.5 text-gray-500" />
            </Button>
            {showToolsDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-lg shadow-xl min-w-[120px] py-0.5 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setCurrentView('cleaner');
                    setShowToolsDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-100/80 transition-all duration-150 rounded-lg"
                >
                  Text Tools
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Settings and Create */}
        <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
          {/* Settings Icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView('settings')}
            className="h-7 w-7 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>

          {/* Create Button - Prominent */}
          <Button
            onClick={() => setCurrentView('form')}
            className="h-7 px-2 text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 mr-0.5" />
            New
          </Button>
        </div>
      </div>
    </div>
  );
};
