import { Building2, ChevronDown, Pin, SortAsc, Tag } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import type { SortOption } from '../../../types/app';

export const FilterPopover: React.FC = () => {
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
    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { value: 'recent', label: 'Recent' },
    { value: 'usage', label: 'Usage' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'created', label: 'Created' }
  ];

  return (
    <div className="bg-popover border border-border rounded-md shadow-lg p-2 w-72">
      <div className="grid grid-cols-2 gap-2">
        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="h-8 w-full justify-between px-2 gap-1 border-border bg-card text-foreground hover:bg-muted/60"
            aria-haspopup="menu"
            aria-expanded={showSortDropdown}
          >
            <div className="flex items-center gap-1.5 truncate">
              <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-xs">{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          {showSortDropdown && (
            <div role="menu" className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-10 p-1">
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
          className={cn('h-8 w-full gap-1.5', showPinned ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border-border hover:bg-muted/60')}
          aria-pressed={showPinned}
        >
          <Pin className="h-3.5 w-3.5" />
          <span className="text-xs">Pinned</span>
        </Button>
        {/* Workspace Dropdown */}
        <div className="relative" ref={workspaceRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="h-8 w-full justify-between px-2 gap-1 border-border bg-card text-foreground hover:bg-muted/60"
            aria-haspopup="menu"
            aria-expanded={showWorkspaceDropdown}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-xs">{selectedWorkspace === 'all' ? 'Workspace' : selectedWorkspace}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          {showWorkspaceDropdown && (
            <div role="menu" className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto p-1">
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
            className="h-8 w-full justify-between px-2 gap-1 border-border bg-card text-foreground hover:bg-muted/60"
            aria-haspopup="menu"
            aria-expanded={showTagsDropdown}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-xs">{filterTag === 'all' ? 'Tag' : filterTag}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          {showTagsDropdown && (
            <div role="menu" className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto p-1">
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
