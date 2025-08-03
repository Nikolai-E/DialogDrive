import React, { useState, useEffect, useRef } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { ChevronDown, SortAsc, Building2, Tag, Pin } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="h-7 text-xs px-2 gap-1"
          >
            <SortAsc className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground">
              {sortOptions.find(opt => opt.value === sortBy)?.label}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
          
          {showSortDropdown && (
            <div className="absolute top-full left-0 mt-1 w-24 bg-card border border-border rounded shadow-lg z-50">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSortBy(option.value as any);
                    setShowSortDropdown(false);
                  }}
                  className={cn(
                    "w-full h-7 justify-start text-xs px-2 rounded-none",
                    sortBy === option.value ? 'bg-accent/10 text-accent' : 'text-foreground'
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Pinned Toggle */}
        <Button
          variant={showPinned ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowPinned(!showPinned)}
          className={cn(
            "h-7 text-xs px-2 gap-1",
            showPinned && "bg-accent/10 text-accent border-accent/20"
          )}
        >
          <Pin className="h-3 w-3" />
          {showPinned ? 'Pinned' : 'All'}
        </Button>
      </div>

      {/* Right side: Workspace and Tags */}
      <div className="flex items-center gap-2">
        {/* Workspace Dropdown */}
        <div className="relative" ref={workspaceRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className="h-7 text-xs px-2 gap-1 max-w-[80px]"
          >
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate">
              {selectedWorkspace === 'all' ? 'All' : selectedWorkspace}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
          
          {showWorkspaceDropdown && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-card border border-border rounded shadow-lg z-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedWorkspace('all');
                  setShowWorkspaceDropdown(false);
                }}
                className={cn(
                  "w-full h-7 justify-start text-xs px-2 rounded-none",
                  selectedWorkspace === 'all' ? 'bg-accent/10 text-accent' : 'text-foreground'
                )}
              >
                All Workspaces
              </Button>
              {workspaces.map((workspace) => (
                <Button
                  key={workspace}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedWorkspace(workspace);
                    setShowWorkspaceDropdown(false);
                  }}
                  className={cn(
                    "w-full h-7 justify-start text-xs px-2 rounded-none truncate",
                    selectedWorkspace === workspace ? 'bg-accent/10 text-accent' : 'text-foreground'
                  )}
                >
                  {workspace}
                </Button>
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
            className="h-7 text-xs px-2 gap-1 max-w-[80px]"
          >
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground truncate">
              {filterTag === 'all' ? 'All' : filterTag}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
          
          {showTagsDropdown && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-card border border-border rounded shadow-lg z-50 max-h-32 overflow-y-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTag('all');
                  setShowTagsDropdown(false);
                }}
                className={cn(
                  "w-full h-7 justify-start text-xs px-2 rounded-none",
                  filterTag === 'all' ? 'bg-accent/10 text-accent' : 'text-foreground'
                )}
              >
                All Tags
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterTag(tag);
                    setShowTagsDropdown(false);
                  }}
                  className={cn(
                    "w-full h-7 justify-start text-xs px-2 rounded-none truncate",
                    filterTag === tag ? 'bg-accent/10 text-accent' : 'text-foreground'
                  )}
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
