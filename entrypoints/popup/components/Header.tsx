import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Plus, Settings as SettingsIcon, MessageSquare, Search, X, List, MessageSquareText, LayoutGrid } from 'lucide-react';
// Remove Button import usage in this file; we will use raw <button> for explicit styling
// import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';

interface HeaderProps {
  onNewPrompt: () => void;
  onNewChat: () => void;
  onSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPrompt, onNewChat, onSettings }) => {
  const { searchTerm, setSearchTerm, contentFilter, setContentFilter } = useUnifiedStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const portalElRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Setup portal root element once
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
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [showDropdown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDropdown(false); };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      // If clicking inside the portal menu, ignore
      const portal = portalElRef.current;
      if (portal && portal.querySelector('[data-dd-menu]')?.contains(target as Node)) return;
      setShowDropdown(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); };
  }, []);

  const setSearchTermDebounced = (val: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setSearchTerm(val), 120);
  };

  const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button
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
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary/90 to-accent/80 shadow-sm ring-1 ring-primary/20 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <h1 className="text-[12px] font-semibold tracking-tight text-foreground">DialogDrive</h1>
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
                aria-label="Clear search"
                className="absolute right-6 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted/60 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none select-none text-[10px] px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground/80 bg-muted/40">Ctrl K</kbd>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0" ref={dropdownRef}>
          {/* Create button with explicit light styling */}
          <button
            ref={buttonRef}
            onClick={() => setShowDropdown((v) => !v)}
            className="h-7 px-2 rounded-md border border-border bg-background text-foreground hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background inline-flex items-center justify-center gap-1 transition-colors relative z-[1]"
            aria-haspopup="menu"
            aria-expanded={showDropdown}
            aria-controls="create-menu"
            title="Create"
          >
            <Plus className="h-4 w-4" />
          </button>
          {/* Settings button with explicit light styling */}
          <button
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
          <div role="tablist" aria-label="Views" className="grid grid-cols-3 gap-1 p-1 rounded-md bg-muted/40 border border-border">
            <TabButton active={contentFilter === 'all'} onClick={() => setContentFilter('all')} icon={<LayoutGrid className="h-3.5 w-3.5" />} label="All" />
            <TabButton active={contentFilter === 'prompts'} onClick={() => setContentFilter('prompts')} icon={<List className="h-3.5 w-3.5" />} label="Prompts" />
            <TabButton active={contentFilter === 'chats'} onClick={() => setContentFilter('chats')} icon={<MessageSquare className="h-3.5 w-3.5" />} label="Chats" />
          </div>
        </div>
      </div>
      {menu}
    </header>
  );
};
