import React, { useState, useEffect, useRef } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { ChevronDown, SortAsc, Building2, Tag, Pin } from 'lucide-react';

export const CompactControls: React.FC = () => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  
  const sortRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

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
  } = useUnifiedStore();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
      if (tagsRef.current && !tagsRef.current.contains(event.target as Node)) {
        setShowTagsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sortOptions = [
    { value: 'recent', label: 'Recent' },
    { value: 'usage', label: 'Usage' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'created', label: 'Created' }
  ];

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-secondary border-b border-border">
      {/* Left side: Sort */}
      <div className="flex items-center gap-2">
        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1 bg-card border border-border rounded text-xs px-2 py-1 hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
          >
            <SortAsc className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground">
              {sortOptions.find(opt => opt.value === sortBy)?.label}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          
          {showSortDropdown && (
            <div className="absolute top-full left-0 mt-1 w-24 bg-card border border-border rounded shadow-lg z-50">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value as any);
                    setShowSortDropdown(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent/10 ${
                    sortBy === option.value ? 'bg-accent/10 text-accent' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pinned Toggle */}
        <button
          onClick={() => setShowPinned(!showPinned)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            showPinned 
              ? 'bg-accent/10 text-accent border border-accent/20' 
              : 'bg-card text-muted-foreground border border-border hover:bg-muted'
          }`}
        >
          <Pin className="h-3 w-3" />
          {showPinned ? 'Pinned' : 'All'}
        </button>
      </div>

      {/* Right side: Workspace and Tags */}
      <div className="flex items-center gap-2">
        {/* Workspace Dropdown */}
        <div className="relative" ref={workspaceRef}>
          <button
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="flex items-center gap-1 bg-card border border-border rounded text-xs px-2 py-1 hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring max-w-[80px]"
          >
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate">
              {selectedWorkspace === 'all' ? 'All' : selectedWorkspace}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </button>
          
          {showWorkspaceDropdown && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-card border border-border rounded shadow-lg z-50">
              <button
                onClick={() => {
                  setSelectedWorkspace('all');
                  setShowWorkspaceDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent/10 ${
                  selectedWorkspace === 'all' ? 'bg-accent/10 text-accent' : 'text-foreground'
                }`}
              >
                All Workspaces
              </button>
              {workspaces.map((workspace) => (
                <button
                  key={workspace}
                  onClick={() => {
                    setSelectedWorkspace(workspace);
                    setShowWorkspaceDropdown(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent/10 truncate ${
                    selectedWorkspace === workspace ? 'bg-accent/10 text-accent' : 'text-foreground'
                  }`}
                >
                  {workspace}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags Dropdown */}
        <div className="relative" ref={tagsRef}>
          <button
            onClick={() => setShowTagsDropdown(!showTagsDropdown)}
            className="flex items-center gap-1 bg-card border border-border rounded text-xs px-2 py-1 hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring max-w-[80px]"
          >
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate">
              {filterTag === 'all' ? 'All' : filterTag}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </button>
          
          {showTagsDropdown && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-card border border-border rounded shadow-lg z-50 max-h-32 overflow-y-auto">
              <button
                onClick={() => {
                  setFilterTag('all');
                  setShowTagsDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent/10 ${
                  filterTag === 'all' ? 'bg-accent/10 text-accent' : 'text-foreground'
                }`}
              >
                All Tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setFilterTag(tag);
                    setShowTagsDropdown(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent/10 truncate ${
                    filterTag === tag ? 'bg-accent/10 text-accent' : 'text-foreground'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
