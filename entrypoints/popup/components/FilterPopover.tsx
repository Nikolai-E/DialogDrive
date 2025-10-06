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
      if (sortRef.current && !sortRef.current.contains(event.target as Node))
        setShowSortDropdown(false);
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node))
        setShowWorkspaceDropdown(false);
      if (tagsRef.current && !tagsRef.current.contains(event.target as Node))
        setShowTagsDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortOptions = [
    { value: 'recent', label: 'Recent' },
    { value: 'usage', label: 'Usage' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'created', label: 'Created' },
  ];

  const filterTriggerBase =
    'group inline-flex items-center h-8 px-2 gap-1 rounded-full border border-border/60 bg-[hsl(var(--card))] text-[12px] font-medium text-foreground/78 transition-all duration-200 shadow-[0_1px_1px_rgba(15,23,42,0.05)] hover:text-primary hover:bg-primary/20 hover:border-primary/55 hover:shadow-[0_0_30px_rgba(0,102,204,0.3),0_6px_18px_rgba(15,23,42,0.2)]';
  const filterTriggerActive =
    'bg-primary/24 text-primary border-primary/60 shadow-[0_0_34px_rgba(0,102,204,0.34),0_8px_22px_rgba(15,23,42,0.24)]';

  const isSortScoped = sortBy !== 'recent';
  const isWorkspaceScoped = selectedWorkspace !== 'all';
  const isTagScoped = filterTag !== 'all';

  return (
    <div className="bg-popover border border-border rounded-md shadow-lg p-2 w-72">
      <div className="grid grid-cols-2 gap-2">
        {/* Sort Dropdown */}
        <div className="relative" ref={sortRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className={cn(
              filterTriggerBase,
              'justify-between',
              (showSortDropdown || isSortScoped) && filterTriggerActive
            )}
            data-active={showSortDropdown || isSortScoped ? 'true' : undefined}
            aria-haspopup="menu"
            aria-expanded={showSortDropdown}
          >
            <div className="flex items-center gap-1.5 truncate">
              <SortAsc
                className={cn(
                  'h-3.5 w-3.5 transition-colors group-hover:text-primary',
                  showSortDropdown || isSortScoped ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'truncate text-xs transition-colors group-hover:text-primary',
                  showSortDropdown || isSortScoped ? 'text-primary' : 'text-foreground'
                )}
              >
                {sortOptions.find((opt) => opt.value === sortBy)?.label}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-colors group-hover:text-primary',
                showSortDropdown || isSortScoped ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </Button>
          {showSortDropdown && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-10 p-1"
            >
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  role="menuitemradio"
                  aria-checked={sortBy === option.value}
                  onClick={() => {
                    setSortBy(option.value as SortOption);
                    setShowSortDropdown(false);
                  }}
                  className={cn(
                    'w-full h-8 text-left text-xs px-2 rounded transition-colors duration-150',
                    sortBy === option.value
                      ? 'bg-primary/14 text-primary font-semibold shadow-[0_0_10px_rgba(0,102,204,0.12),0_0_16px_rgba(0,102,204,0.06)] hover:bg-primary/38 hover:shadow-[0_0_24px_rgba(0,102,204,0.22)]'
                      : 'text-foreground hover:bg-primary/30 hover:text-primary hover:shadow-[0_0_16px_rgba(0,102,204,0.14)]'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Pinned toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPinned(!showPinned)}
          className={cn(
            filterTriggerBase,
            'justify-center gap-1.5 px-3',
            showPinned && filterTriggerActive
          )}
          data-active={showPinned ? 'true' : undefined}
          aria-pressed={showPinned}
        >
          <Pin
            className={cn(
              'h-3.5 w-3.5 transition-colors group-hover:text-primary',
              showPinned ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <span
            className={cn(
              'text-xs transition-colors group-hover:text-primary',
              showPinned ? 'text-primary' : 'text-foreground'
            )}
          >
            Pinned
          </span>
        </Button>
        {/* Workspace Dropdown */}
        <div className="relative" ref={workspaceRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
            className={cn(
              filterTriggerBase,
              'justify-between',
              (showWorkspaceDropdown || isWorkspaceScoped) && filterTriggerActive
            )}
            data-active={showWorkspaceDropdown || isWorkspaceScoped ? 'true' : undefined}
            aria-haspopup="menu"
            aria-expanded={showWorkspaceDropdown}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Building2
                className={cn(
                  'h-3.5 w-3.5 transition-colors group-hover:text-primary',
                  showWorkspaceDropdown || isWorkspaceScoped ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'truncate text-xs transition-colors group-hover:text-primary',
                  showWorkspaceDropdown || isWorkspaceScoped ? 'text-primary' : 'text-foreground'
                )}
              >
                {selectedWorkspace === 'all' ? 'Workspace' : selectedWorkspace}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-colors group-hover:text-primary',
                showWorkspaceDropdown || isWorkspaceScoped ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </Button>
          {showWorkspaceDropdown && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto p-1"
            >
              <button
                role="menuitemradio"
                aria-checked={selectedWorkspace === 'all'}
                onClick={() => {
                  setSelectedWorkspace('all');
                  setShowWorkspaceDropdown(false);
                }}
                className={cn(
                  'w-full h-8 text-left text-xs px-2 rounded transition-colors duration-150',
                  selectedWorkspace === 'all'
                    ? 'bg-primary/14 text-primary font-semibold shadow-[0_0_10px_rgba(0,102,204,0.12),0_0_16px_rgba(0,102,204,0.06)] hover:bg-primary/38 hover:shadow-[0_0_24px_rgba(0,102,204,0.22)]'
                    : 'text-foreground hover:bg-primary/30 hover:text-primary hover:shadow-[0_0_16px_rgba(0,102,204,0.14)]'
                )}
              >
                All Workspaces
              </button>
              {workspaces.map((workspace) => (
                <button
                  key={workspace}
                  role="menuitemradio"
                  aria-checked={selectedWorkspace === workspace}
                  onClick={() => {
                    setSelectedWorkspace(workspace);
                    setShowWorkspaceDropdown(false);
                  }}
                  className={cn(
                    'w-full h-8 text-left text-xs px-2 rounded transition-colors duration-150 truncate',
                    selectedWorkspace === workspace
                      ? 'bg-primary/14 text-primary font-semibold shadow-[0_0_10px_rgba(0,102,204,0.12),0_0_16px_rgba(0,102,204,0.06)] hover:bg-primary/38 hover:shadow-[0_0_24px_rgba(0,102,204,0.22)]'
                      : 'text-foreground hover:bg-primary/30 hover:text-primary hover:shadow-[0_0_16px_rgba(0,102,204,0.14)]'
                  )}
                >
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
            className={cn(
              filterTriggerBase,
              'justify-between',
              (showTagsDropdown || isTagScoped) && filterTriggerActive
            )}
            data-active={showTagsDropdown || isTagScoped ? 'true' : undefined}
            aria-haspopup="menu"
            aria-expanded={showTagsDropdown}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Tag
                className={cn(
                  'h-3.5 w-3.5 transition-colors group-hover:text-primary',
                  showTagsDropdown || isTagScoped ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span
                className={cn(
                  'truncate text-xs transition-colors group-hover:text-primary',
                  showTagsDropdown || isTagScoped ? 'text-primary' : 'text-foreground'
                )}
              >
                {filterTag === 'all' ? 'Tag' : filterTag}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-colors group-hover:text-primary',
                showTagsDropdown || isTagScoped ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </Button>
          {showTagsDropdown && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto p-1"
            >
              <button
                role="menuitemradio"
                aria-checked={filterTag === 'all'}
                onClick={() => {
                  setFilterTag('all');
                  setShowTagsDropdown(false);
                }}
                className={cn(
                  'w-full h-8 text-left text-xs px-2 rounded transition-colors duration-150',
                  filterTag === 'all'
                    ? 'bg-primary/14 text-primary font-semibold shadow-[0_0_10px_rgba(0,102,204,0.12),0_0_16px_rgba(0,102,204,0.06)] hover:bg-primary/38 hover:shadow-[0_0_24px_rgba(0,102,204,0.22)]'
                    : 'text-foreground hover:bg-primary/30 hover:text-primary hover:shadow-[0_0_16px_rgba(0,102,204,0.14)]'
                )}
              >
                All Tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  role="menuitemradio"
                  aria-checked={filterTag === tag}
                  onClick={() => {
                    setFilterTag(tag);
                    setShowTagsDropdown(false);
                  }}
                  className={cn(
                    'w-full h-8 text-left text-xs px-2 rounded transition-colors duration-150 truncate',
                    filterTag === tag
                      ? 'bg-primary/14 text-primary font-semibold shadow-[0_0_10px_rgba(0,102,204,0.12),0_0_16px_rgba(0,102,204,0.06)] hover:bg-primary/38 hover:shadow-[0_0_24px_rgba(0,102,204,0.22)]'
                      : 'text-foreground hover:bg-primary/30 hover:text-primary hover:shadow-[0_0_16px_rgba(0,102,204,0.14)]'
                  )}
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
