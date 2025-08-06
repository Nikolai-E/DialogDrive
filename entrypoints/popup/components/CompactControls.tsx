import React, { useState, useEffect, useRef } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { ChevronDown, SortAsc, Building2, Tag, Pin } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { SortOption } from '../../../types/app';

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
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) setShowSortDropdown(false);
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) setShowWorkspaceDropdown(false);
      if (tagsRef.current && !tagsRef.current.contains(event.target as Node)) setShowTagsDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { value: 'recent', label: 'Recent' },
    { value: 'usage', label: 'Usage' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'created', label: 'Created' }
  ];

  return (
    <div className="w-full flex items-center gap-0.5 justify-between">
      {/* Left: Sort + Pinned */}
      <div className="flex items-center gap-0.5 min-w-0">
        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="h-7 px-1.5 gap-1 w-[84px] border-border bg-card text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-haspopup="menu"
            aria-expanded={showSortDropdown}
            aria-controls="sort-menu"
          >
            <SortAsc className="h-3 w-3 text-muted-foreground" />
            <span className="truncate text-[11px]">{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
          {showSortDropdown && (
            <div id="sort-menu" role="menu" className="absolute top-full left-0 mt-1 min-w-[120px] w-max bg-popover border border-border rounded-md shadow-lg z-[9999] overflow-auto max-h-56 p-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  role="menuitemradio"
                  aria-checked={sortBy === option.value}
                  onClick={() => { setSortBy(option.value as SortOption); setShowSortDropdown(false); }}
                  className={cn('w-full h-8 text-left text-xs px-2 rounded hover:bg-muted/60', sortBy === option.value ? 'bg-primary/10 text-primary' : 'text-foreground')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Pinned toggle */}
        <Button
          variant={showPinned ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPinned(!showPinned)}
          className={cn('h-7 px-1.5 gap-1 w-[64px] justify-center', showPinned ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border-border hover:bg-muted/60')}
          aria-pressed={showPinned}
          aria-label="Toggle pinned"
        >
          <Pin className="h-3 w-3" />
          <span className="truncate text-[11px]">Pin</span>
        </Button>
      </div>

      {/* Right: Workspace + Tags */}
      <div className="flex items-center gap-0.5 min-w-0">
        {/* Workspace Dropdown */}
        <div className="relative" ref={workspaceRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="h-7 px-1.5 gap-1 w-[94px] border-border bg-card text-foreground hover:bg-muted/60"
            aria-haspopup="menu"
            aria-expanded={showWorkspaceDropdown}
            aria-controls="workspace-menu"
          >
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-[11px]">{selectedWorkspace === 'all' ? 'All' : selectedWorkspace}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
          {showWorkspaceDropdown && (
            <div id="workspace-menu" role="menu" className="absolute top-full right-0 mt-1 min-w-[160px] bg-popover border border-border rounded-md shadow-lg z-[9999] max-h-56 overflow-y-auto p-1">
              <button role="menuitemradio" aria-checked={selectedWorkspace === 'all'} onClick={() => { setSelectedWorkspace('all'); setShowWorkspaceDropdown(false); }} className={cn('w-full h-8 text-left text-xs px-2 rounded hover:bg-muted/60', selectedWorkspace === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground')}>All Workspaces</button>
              {workspaces.map((workspace) => (
                <button key={workspace} role="menuitemradio" aria-checked={selectedWorkspace === workspace} onClick={() => { setSelectedWorkspace(workspace); setShowWorkspaceDropdown(false); }} className={cn('w-full h-8 text-left text-xs px-2 rounded hover:bg-muted/60 truncate', selectedWorkspace === workspace ? 'bg-primary/10 text-primary' : 'text-foreground')}>
                  {workspace}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Tags Dropdown */}
        <div className="relative" ref={tagsRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagsDropdown(!showTagsDropdown)}
            className="h-7 px-1.5 gap-1 w-[94px] border-border bg-card text-foreground hover:bg-muted/60"
            aria-haspopup="menu"
            aria-expanded={showTagsDropdown}
            aria-controls="tags-menu"
          >
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-[11px]">{filterTag === 'all' ? 'All' : filterTag}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
          {showTagsDropdown && (
            <div id="tags-menu" role="menu" className="absolute top-full right-0 mt-1 min-w-[160px] bg-popover border border-border rounded-md shadow-lg z-[9999] max-h-56 overflow-y-auto p-1">
              <button role="menuitemradio" aria-checked={filterTag === 'all'} onClick={() => { setFilterTag('all'); setShowTagsDropdown(false); }} className={cn('w-full h-8 text-left text-xs px-2 rounded hover:bg-muted/60', filterTag === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground')}>All Tags</button>
              {allTags.map((tag) => (
                <button key={tag} role="menuitemradio" aria-checked={filterTag === tag} onClick={() => { setFilterTag(tag); setShowTagsDropdown(false); }} className={cn('w-full h-8 text-left text-xs px-2 rounded hover:bg-muted/60 truncate', filterTag === tag ? 'bg-primary/10 text-primary' : 'text-foreground')}>
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
