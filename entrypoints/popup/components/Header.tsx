// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Popup header that manages search, filtering, and quick-create menus.

import { Check, ChevronDown, Hammer, LayoutGrid, List, MessageSquare, Pin, Plus, Search, Settings as SettingsIcon, SortAsc, X } from 'lucide-react';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import type { SortOption } from '../../../types/app';

interface HeaderProps {
  onNewPrompt: () => void;
  onNewChat: () => void;
  onSettings: () => void;
  onOpenCleaner?: () => void;
  onOpenLibrary?: () => void;
}

type FilterMenuKey = 'sort' | 'workspace' | 'tag' | 'tools';

const FILTER_MENU_CONFIG: Record<FilterMenuKey, { minWidth?: number; align?: 'start' | 'end'; maxHeight?: number }> = {
  sort: { minWidth: 180 },
  workspace: { minWidth: 220, maxHeight: 260 },
  tag: { minWidth: 200, maxHeight: 260 },
  tools: { minWidth: 164, align: 'end' },
};

export const Header: React.FC<HeaderProps> = ({ onNewPrompt, onNewChat, onSettings, onOpenCleaner, onOpenLibrary }) => {
  // Pull relevant search/filter state so the header stays in sync with the list.
  const { 
    searchTerm, 
    setSearchTerm, 
    contentFilter, 
    setContentFilter, 
    currentView, 
    setCurrentView,
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMenu, setActiveMenu] = useState<FilterMenuKey | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const portalElRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const menuContentRef = useRef<HTMLDivElement | null>(null);
  const [filterMenuStyle, setFilterMenuStyle] = useState<React.CSSProperties | null>(null);

  const filterButtonRefs = useMemo(
    () => ({
      sort: sortButtonRef,
      workspace: workspaceButtonRef,
      tag: tagButtonRef,
      tools: toolsButtonRef,
    }),
    [sortButtonRef, workspaceButtonRef, tagButtonRef, toolsButtonRef]
  );
  
  // Sort options
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'recent', label: 'Recent' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'usage', label: 'Most Used' },
    { value: 'pinned', label: 'Pinned First' },
  ];

  // Setup portal root element once
  // Creates a fixed container so menus can escape the bounded popup height.
  useLayoutEffect(() => {
    if (!portalElRef.current) {
      const el = document.createElement('div');
      el.setAttribute('data-dd-portal', 'create-menu');
      el.style.position = 'fixed';
      el.style.zIndex = '9999';
      el.style.inset = '0';
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
      portalElRef.current = el;
    }
    return () => {
      if (portalElRef.current) {
        document.body.removeChild(portalElRef.current);
        portalElRef.current = null;
      }
    };
  }, []);

  // Positioning for the dropdown relative to the button
  // Calculate menu and filter popover positions whenever they show.
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ display: 'none' });

  useLayoutEffect(() => {
    if (!showDropdown || !buttonRef.current || !portalElRef.current) {
      setMenuStyle((s) => ({ ...s, display: 'none' }));
      return;
    }
    
    const updatePosition = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      
      const rect = btn.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = 176; // w-44
      const top = Math.round(rect.bottom + 4); // 4px gap
      let left = Math.round(rect.right - menuWidth);
      
      // Ensure menu doesn't go off-screen
      if (left < 4) left = 4;
      if (left + menuWidth > viewportWidth - 4) left = viewportWidth - menuWidth - 4;
      
      setMenuStyle({
        position: 'fixed',
        top,
        left,
        width: menuWidth,
        pointerEvents: 'auto',
        display: 'block',
      });
    };
    
    updatePosition();
    
    // Add resize listener to reposition on window resize
  window.addEventListener('resize', updatePosition, { passive: true });
  return () => window.removeEventListener('resize', updatePosition);
  }, [showDropdown]);

  useLayoutEffect(() => {
    if (!activeMenu) {
      setFilterMenuStyle(null);
      return;
    }

    const anchor = filterButtonRefs[activeMenu]?.current;
    if (!anchor) return;

    const config = FILTER_MENU_CONFIG[activeMenu] ?? {};

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const menuWidth = Math.max(config.minWidth ?? rect.width, rect.width);
      const offsetY = 6;

      let left = config.align === 'end' ? rect.right - menuWidth : rect.left;
      const maxLeft = viewportWidth - menuWidth - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8) left = 8;

      const top = Math.min(rect.bottom + offsetY, window.innerHeight - 8);

      setFilterMenuStyle({
        position: 'fixed',
        top,
        left,
        minWidth: menuWidth,
        pointerEvents: 'auto',
        zIndex: 10000,
      });
    };

    updatePosition();

    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeMenu, filterButtonRefs]);

  useEffect(() => {
    if (!activeMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const activeButton = filterButtonRefs[activeMenu]?.current;

      if (activeButton?.contains(target)) return;
      if (menuContentRef.current?.contains(target)) return;

      setActiveMenu(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [activeMenu, filterButtonRefs]);

  useEffect(() => {
    if (activeMenu === 'tag' && allTags.length === 0) {
      setActiveMenu(null);
    }
  }, [activeMenu, allTags.length]);

  useEffect(() => {
    // Close open overlays when the user presses escape or clicks away.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setActiveMenu(null);
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;

      const portal = portalElRef.current;
      if (portal && portal.contains(target)) return;

      setShowDropdown(false);
      setActiveMenu(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  const setSearchTermDebounced = (val: string) => {
    // Debounce search typing to avoid thrashing the zustand store.
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setSearchTerm(val), 120);
  };

  const toggleMenu = (menu: FilterMenuKey) => {
    setShowDropdown(false);
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const closeMenus = () => {
    setActiveMenu(null);
    menuContentRef.current = null;
  };

  // Reusable tab chip component for toggling between prompt/chat views.
  const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    ariaHaspopup?: boolean;
    ariaExpanded?: boolean;
    ariaControls?: string;
    buttonRef?: React.Ref<HTMLButtonElement>;
    className?: string;
  }> = ({ active, onClick, icon, label, ariaHaspopup, ariaExpanded, ariaControls, buttonRef, className }) => (
    <button
      role="tab"
      type="button"
      onClick={onClick}
      ref={buttonRef}
      className={cn(
        'inline-flex items-center gap-1.75 h-8 px-3 rounded-full border border-transparent text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'bg-primary/12 text-foreground border-primary/25 shadow-[0_2px_4px_rgba(15,23,42,0.12)]'
          : 'text-foreground/75 hover:text-foreground hover:bg-secondary/55',
        className
      )}
      aria-selected={active}
      aria-current={active ? 'page' : undefined}
      aria-haspopup={ariaHaspopup ? 'menu' : undefined}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );

  const filterButtonClass = 'inline-flex items-center gap-1.5 h-[31px] px-3.25 rounded-full border border-border/70 bg-background/70 text-[12px] font-medium text-foreground/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-secondary/55 hover:text-foreground justify-center';
  const filterButtonActiveClass = 'bg-accent text-accent-foreground border-accent shadow-[0_2px_6px_rgba(15,23,42,0.14)]';

  const isCustomSort = sortBy !== 'recent';
  const isPinnedActive = showPinned;
  const isWorkspaceScoped = selectedWorkspace !== 'all';
  const isTagScoped = filterTag !== 'all';

  const menu = showDropdown && portalElRef.current ? createPortal(
    <div data-dd-menu style={menuStyle}>
      <div
        id="create-menu"
        role="menu"
        className="pointer-events-auto rounded-[var(--radius)] border border-border bg-card/95 shadow-lg backdrop-blur-sm p-1.5 min-w-[184px]"
      >
        <button
          role="menuitem"
          onClick={() => { setShowDropdown(false); onNewPrompt(); }}
          className="w-full h-8 text-left text-[12px] px-2.5 rounded-[calc(var(--radius)-2px)] hover:bg-secondary/60 hover:text-foreground inline-flex items-center gap-2 text-foreground/90 transition-colors"
        >
          <List className="h-3.5 w-3.5" />
          New prompt
        </button>
        <button
          role="menuitem"
          onClick={() => { setShowDropdown(false); onNewChat(); }}
          className="w-full h-8 text-left text-[12px] px-2.5 rounded-[calc(var(--radius)-2px)] hover:bg-secondary/60 hover:text-foreground inline-flex items-center gap-2 text-foreground/90 transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Bookmark chat
        </button>
      </div>
    </div>, portalElRef.current) : null;


  const radioItemClass = 'w-full flex items-center justify-between gap-3 px-3 py-2.25 text-[13px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors rounded-[calc(var(--radius)-2px)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
  const simpleItemClass = 'w-full text-left px-3 py-2.25 text-[13px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors rounded-[calc(var(--radius)-2px)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background';
  const menuCheckClass = 'h-4 w-4 shrink-0 text-primary transition-opacity';

  let filterMenuContent: React.ReactNode = null;

  if (activeMenu === 'sort') {
    filterMenuContent = sortOptions.map((option) => {
      const selected = sortBy === option.value;
      return (
        <button
          key={option.value}
          type="button"
          role="menuitemradio"
          aria-checked={selected}
          onClick={() => {
            setSortBy(option.value);
            closeMenus();
          }}
          className={cn(radioItemClass, selected && 'bg-muted/80 text-foreground')}
        >
          <span className="truncate">{option.label}</span>
          <Check className={cn(menuCheckClass, selected ? 'opacity-100' : 'opacity-0')} />
        </button>
      );
    });
  }

  if (activeMenu === 'workspace') {
    const workspaceItems = workspaces.map((workspace) => {
      const selected = selectedWorkspace === workspace;
      return (
        <button
          key={workspace}
          type="button"
          role="menuitemradio"
          aria-checked={selected}
          onClick={() => {
            setSelectedWorkspace(workspace);
            closeMenus();
          }}
          className={cn(radioItemClass, selected && 'bg-muted/80 text-foreground')}
          title={workspace}
        >
          <span className="truncate">{workspace}</span>
          <Check className={cn(menuCheckClass, selected ? 'opacity-100' : 'opacity-0')} />
        </button>
      );
    });

    filterMenuContent = (
      <>
        <button
          type="button"
          role="menuitemradio"
          aria-checked={selectedWorkspace === 'all'}
          onClick={() => {
            setSelectedWorkspace('all');
            closeMenus();
          }}
          className={cn(radioItemClass, selectedWorkspace === 'all' && 'bg-muted/80 text-foreground')}
        >
          <span className="truncate">All Workspaces</span>
          <Check className={cn(menuCheckClass, selectedWorkspace === 'all' ? 'opacity-100' : 'opacity-0')} />
        </button>
        {workspaces.length > 0 && <div className="my-1 border-t border-border/50" />}
        {workspaceItems}
      </>
    );
  }

  if (activeMenu === 'tag') {
    const tagItems = allTags.map((tag) => {
      const selected = filterTag === tag;
      return (
        <button
          key={tag}
          type="button"
          role="menuitemradio"
          aria-checked={selected}
          onClick={() => {
            setFilterTag(tag);
            closeMenus();
          }}
          className={cn(radioItemClass, selected && 'bg-muted/80 text-foreground')}
          title={tag}
        >
          <span className="truncate">{tag}</span>
          <Check className={cn(menuCheckClass, selected ? 'opacity-100' : 'opacity-0')} />
        </button>
      );
    });

    filterMenuContent = (
      <>
        <button
          type="button"
          role="menuitemradio"
          aria-checked={filterTag === 'all'}
          onClick={() => {
            setFilterTag('all');
            closeMenus();
          }}
          className={cn(radioItemClass, filterTag === 'all' && 'bg-muted/80 text-foreground')}
        >
          <span className="truncate">All Tags</span>
          <Check className={cn(menuCheckClass, filterTag === 'all' ? 'opacity-100' : 'opacity-0')} />
        </button>
        {allTags.length > 0 && <div className="my-1 border-t border-border/50" />}
        {tagItems}
      </>
    );
  }

  if (activeMenu === 'tools') {
    filterMenuContent = (
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onOpenCleaner && onOpenCleaner();
          closeMenus();
        }}
        className={simpleItemClass}
      >
        Text Tools
      </button>
    );
  }

  const menuLabels: Record<FilterMenuKey, string> = {
    sort: 'Sort options',
    workspace: 'Workspace filter options',
    tag: 'Tag filter options',
    tools: 'Tools menu',
  };

  const currentMenuConfig = activeMenu ? FILTER_MENU_CONFIG[activeMenu] : undefined;
  const currentMenuStyle = currentMenuConfig?.maxHeight
    ? { maxHeight: currentMenuConfig.maxHeight, overflowY: 'auto' as const }
    : undefined;

  const filterMenu = activeMenu && portalElRef.current && filterMenuStyle
    ? createPortal(
        <div style={filterMenuStyle} data-dd-menu>
          <div
            ref={(node) => {
              menuContentRef.current = node;
            }}
            id={`${activeMenu}-menu`}
            role="menu"
            aria-label={menuLabels[activeMenu]}
            className="rounded-[var(--radius)] border border-border bg-card/95 shadow-lg py-1 px-1.5 pointer-events-auto backdrop-blur-sm"
            style={currentMenuStyle}
          >
            {filterMenuContent}
          </div>
        </div>,
        portalElRef.current
      )
    : null;


  return (
    <header className="shrink-0 border-b border-border/55 bg-[hsl(var(--surface-contrast))]/88 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--surface-contrast))]/75 shadow-[0_3px_10px_rgba(15,23,42,0.08)]">
  <div className="px-2 pt-2 pb-1.5 flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full px-2 py-1 text-foreground transition-colors hover:bg-secondary/40"
          onClick={() => {
            setCurrentView('list');
            setContentFilter('all');
          }}
          title="Go to All"
          aria-label="Go to All"
        >
          <img
            src="/icon/icon-32.png"
            alt="DialogDrive Icon"
            className="w-[20px] h-[20px] rounded-[7px] border border-border/60 object-contain bg-background/90"
            draggable={false}
          />
          <h1 className="text-[13px] font-semibold tracking-tight text-foreground select-none">DialogDrive</h1>
        </button>
  <div className="relative flex-1 max-w-[236px] min-w-[160px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
          <Input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTermDebounced(e.target.value)}
            className="h-8 rounded-full border-border/70 bg-[hsl(var(--card))] pl-7 pr-9 text-[12px] text-foreground placeholder:text-muted-foreground/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
            aria-label="Search prompts and chats"
            aria-live="polite"
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/65 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
  <div className="flex items-center gap-2" ref={dropdownRef}>
          <Button
            ref={buttonRef}
            variant="default"
            size="default"
            withIcon
            onClick={() => {
              setActiveMenu(null);
              setShowDropdown((v) => !v);
            }}
            className="h-8 rounded-full bg-[#1f1f21] px-[14px] text-[12.5px] text-white shadow-[0_4px_10px_rgba(17,17,17,0.24)] hover:bg-[#1f1f21]/94 hover:shadow-[0_6px_16px_rgba(17,17,17,0.32)]"
            aria-haspopup="menu"
            aria-expanded={showDropdown}
            aria-controls="create-menu"
            title="Create"
            aria-label="Create"
          >
            <Plus className="h-3 w-3" />
            New
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettings}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon className="h-[17px] w-[17px]" />
          </Button>
        </div>
      </div>
      <div className="pl-1.75 pr-1.75 pb-2.5 space-y-1.6">
        <div role="tablist" aria-label="Views" className="grid grid-cols-[0.9fr_1.05fr_1fr_1fr_1.05fr] gap-0">
          <TabButton
            active={contentFilter === 'all'}
            onClick={() => {
              setCurrentView('list');
              setContentFilter('all');
            }}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            label="All"
            className="w-full justify-center"
          />
          <TabButton
            active={contentFilter === 'prompts'}
            onClick={() => {
              setCurrentView('list');
              setContentFilter('prompts');
            }}
            icon={<List className="h-3.5 w-3.5" />}
            label="Prompts"
            className="w-full justify-center"
          />
          <TabButton
            active={contentFilter === 'chats'}
            onClick={() => {
              setCurrentView('list');
              setContentFilter('chats');
            }}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Chats"
            className="w-full justify-center"
          />
          <TabButton
            active={currentView === 'library'}
            onClick={() => onOpenLibrary && onOpenLibrary()}
            icon={<List className="h-3.5 w-3.5" />}
            label="Library"
            className="w-full justify-center"
          />
          <TabButton
            active={activeMenu === 'tools'}
            onClick={() => toggleMenu('tools')}
            icon={<Hammer className="h-3.5 w-3.5" />}
            label="Tools"
            ariaHaspopup
            ariaExpanded={activeMenu === 'tools'}
            ariaControls={activeMenu === 'tools' ? 'tools-menu' : undefined}
            buttonRef={toolsButtonRef}
            className="w-full justify-center"
          />
        </div>
        <div className="my-2 border-t border-border/40" />
        <div className="flex flex-wrap items-center gap-1.75 mx-2.5">
          <button
            type="button"
            ref={sortButtonRef}
            onClick={() => toggleMenu('sort')}
            className={cn(filterButtonClass, 'flex-1 basis-0 min-w-[0]', (activeMenu === 'sort' || isCustomSort) && filterButtonActiveClass)}
            aria-haspopup="menu"
            aria-expanded={activeMenu === 'sort'}
            aria-controls={activeMenu === 'sort' ? 'sort-menu' : undefined}
          >
            <SortAsc className="h-3.5 w-3.5" />
            <span className="truncate">{sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort'}</span>
            <ChevronDown className="h-3 w-3 opacity-70 transition-transform data-[state=open]:rotate-180" data-state={activeMenu === 'sort' ? 'open' : 'closed'} />
          </button>

          <button
            type="button"
            ref={workspaceButtonRef}
            onClick={() => toggleMenu('workspace')}
            className={cn(filterButtonClass, 'flex-1 basis-0 min-w-[0]', (activeMenu === 'workspace' || isWorkspaceScoped) && filterButtonActiveClass)}
            aria-haspopup="menu"
            aria-expanded={activeMenu === 'workspace'}
            aria-controls={activeMenu === 'workspace' ? 'workspace-menu' : undefined}
          >
            <span className="truncate max-w-[110px]">{selectedWorkspace === 'all' ? 'Workspace' : selectedWorkspace}</span>
            <ChevronDown className="h-3 w-3 opacity-70 transition-transform data-[state=open]:rotate-180" data-state={activeMenu === 'workspace' ? 'open' : 'closed'} />
          </button>

          {allTags.length > 0 && (
            <button
              type="button"
              ref={tagButtonRef}
              onClick={() => toggleMenu('tag')}
              className={cn(filterButtonClass, 'flex-1 basis-0 min-w-[0]', (activeMenu === 'tag' || isTagScoped) && filterButtonActiveClass)}
              aria-haspopup="menu"
              aria-expanded={activeMenu === 'tag'}
              aria-controls={activeMenu === 'tag' ? 'tag-menu' : undefined}
            >
              <span className="truncate max-w-[90px]">{filterTag === 'all' ? 'Tag' : filterTag}</span>
              <ChevronDown className="h-3 w-3 opacity-70 transition-transform data-[state=open]:rotate-180" data-state={activeMenu === 'tag' ? 'open' : 'closed'} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowPinned(!showPinned);
              setActiveMenu(null);
            }}
            className={cn(filterButtonClass, 'flex-1 basis-0 min-w-[0]', isPinnedActive && filterButtonActiveClass)}
            aria-pressed={isPinnedActive}
            title={isPinnedActive ? 'Showing only pinned items' : 'Showing all items'}
          >
            <Pin className={cn('h-3.5 w-3.5 transition-colors', isPinnedActive ? 'text-accent-foreground' : 'text-muted-foreground')} />
            <span className="truncate">Pinned</span>
          </button>
        </div>
      </div>
      {menu}
      {filterMenu}
    </header>
  );
};
