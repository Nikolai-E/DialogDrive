// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Popup header that manages search, filtering, and quick-create menus.

import { Filter, LayoutGrid, List, MessageSquare, MessageSquareText, Plus, Search, Settings as SettingsIcon, X } from 'lucide-react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// Remove Button import usage in this file; we will use raw <button> for explicit styling
// import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import { FilterPopover } from './FilterPopover';

interface HeaderProps {
  onNewPrompt: () => void;
  onNewChat: () => void;
  onSettings: () => void;
  onOpenCleaner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPrompt, onNewChat, onSettings, onOpenCleaner }) => {
  // Pull relevant search/filter state so the header stays in sync with the list.
  const { searchTerm, setSearchTerm, contentFilter, setContentFilter, currentView } = useUnifiedStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const portalElRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

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
  const [filterPopoverStyle, setFilterPopoverStyle] = useState<React.CSSProperties>({ display: 'none' });
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

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
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [showDropdown]);

  useLayoutEffect(() => {
    if (!showFilterPopover || !filterButtonRef.current || !portalElRef.current) {
      setFilterPopoverStyle((s) => ({ ...s, display: 'none' }));
      return;
    }

    const updatePosition = () => {
      const btn = filterButtonRef.current;
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const popoverWidth = 288; // w-72
      const top = Math.round(rect.bottom + 4);
      let left = Math.round(rect.right - popoverWidth);

      if (left < 4) left = 4;

      setFilterPopoverStyle({
        position: 'fixed',
        top,
        left,
        width: popoverWidth,
        pointerEvents: 'auto',
        display: 'block',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [showFilterPopover]);

  useEffect(() => {
    // Close open overlays when the user presses escape or clicks away.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setShowFilterPopover(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;

      const portal = portalElRef.current;
      if (portal && portal.contains(target)) return;

      setShowDropdown(false);
      setShowFilterPopover(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
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

  // Reusable tab chip component for toggling between prompt/chat views.
  const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'motion-safe:transition-colors motion-safe:duration-150',
        active ? 'bg-accent text-accent-foreground shadow-inner' : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
      )}
      aria-pressed={active}
      aria-current={active ? 'page' : undefined}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );

  const menu = showDropdown && portalElRef.current ? createPortal(
    <div data-dd-menu style={menuStyle}>
      <div id="create-menu" role="menu" className="bg-background border border-border rounded-md shadow-lg p-1 z-[70] min-w-[176px]">
        <button
          role="menuitem"
          onClick={() => { setShowDropdown(false); onNewPrompt(); }}
          className="w-full h-8 text-left text-xs px-2 rounded hover:bg-accent/10 inline-flex items-center gap-2 text-foreground transition-colors"
        >
          <List className="h-3.5 w-3.5" />
          New Prompt
        </button>
        <button
          role="menuitem"
          onClick={() => { setShowDropdown(false); onNewChat(); }}
          className="w-full h-8 text-left text-xs px-2 rounded hover:bg-accent/10 inline-flex items-center gap-2 text-foreground transition-colors"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Bookmark Chat
        </button>
      </div>
    </div>, portalElRef.current) : null;

  return (
    <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="px-2 py-1.5 flex items-center">
        <div className="flex items-center gap-2">
          <img
            src="/icon/icon-32.png"
            alt="DialogDrive Icon"
            className="w-5 h-5 rounded-md shadow-sm ring-1 ring-border object-contain bg-background"
            draggable={false}
          />
          <h1 className="text-[12px] font-semibold tracking-tight text-foreground select-none">DialogDrive</h1>
        </div>
        {/* Compact Search */}
        <div className="flex-1 mx-2 max-w-[240px]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/80 z-10" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTermDebounced(e.target.value)}
              className={cn('pl-7 pr-12 h-7 text-[12px] rounded-md placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background')}
              aria-label="Search prompts and chats"
              aria-live="polite"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-6 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted/60 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Removed the visible shortcut hint to declutter the search box */}
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0" ref={dropdownRef}>
          {/* Create button with explicit light styling */}
          <button
            type="button"
            ref={buttonRef}
            onClick={() => setShowDropdown((v) => !v)}
            className="h-7 px-2 rounded-md border border-neutral-700 text-white inline-flex items-center justify-center gap-1 transition-all relative z-[1]
                       bg-gradient-to-b from-neutral-700 to-neutral-800
                       hover:from-neutral-600 hover:to-neutral-700
                       shadow-sm hover:shadow-md active:shadow-inner active:translate-y-[0.5px]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-haspopup="menu"
            aria-expanded={showDropdown}
            aria-controls="create-menu"
            title="Create"
            aria-label="Create"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            ref={filterButtonRef}
            onClick={() => setShowFilterPopover((v) => !v)}
            className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex items-center justify-center border border-transparent"
            aria-haspopup="true"
            aria-expanded={showFilterPopover}
            aria-label="Sort and filter"
            title="Sort and filter"
          >
            <Filter className="h-4 w-4" />
          </button>
          {/* Settings button with explicit light styling */}
          <button
            type="button"
            onClick={onSettings}
            className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex items-center justify-center border border-transparent"
            aria-label="Open settings"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Segmented Tabs */}
      <div className="px-2 pb-2 pt-0">
        <div className="relative w-full">
          <div role="tablist" aria-label="Views" className="grid grid-cols-4 gap-1 p-1 rounded-md bg-muted/40 border border-border">
            <TabButton active={contentFilter === 'all'} onClick={() => setContentFilter('all')} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="All" />
            <TabButton active={contentFilter === 'prompts'} onClick={() => setContentFilter('prompts')} icon={<List className="h-3.5 w-3.5" />} label="Prompts" />
            <TabButton active={contentFilter === 'chats'} onClick={() => setContentFilter('chats')} icon={<MessageSquare className="h-3.5 w-3.5" />} label="Chats" />
            <TabButton active={currentView === 'cleaner'} onClick={() => onOpenCleaner && onOpenCleaner()} icon={<MessageSquareText className="h-3.5 w-3.5" />} label="Cleaner" />
          </div>
        </div>
      </div>
      {menu}
      {showFilterPopover && portalElRef.current && createPortal(
        <div style={filterPopoverStyle}>
          <FilterPopover />
        </div>,
        portalElRef.current
      )}
    </header>
  );
};
