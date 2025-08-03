import React, { useState } from 'react';
import { Sparkles, Plus, Settings as SettingsIcon, MessageSquare, ChevronDown, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';

interface HeaderProps {
  onNewPrompt: () => void;
  onNewChat: () => void;
  onSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPrompt, onNewChat, onSettings }) => {
  const { currentView, searchTerm, setSearchTerm } = useUnifiedStore();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="bg-card border-b border-border shadow-sm">
      {/* Main header row with logo, search, and actions */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <h1 className="text-sm font-bold text-foreground">DialogDrive</h1>
        </div>
        
        {/* Compact Search */}
        <div className="flex-1 mx-3 max-w-[180px]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "pl-7 pr-2 py-1 h-6 text-xs",
                "transition-colors"
              )}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Add Dropdown */}
          <div className="relative">
            <Button 
              size="sm"
              className={cn(
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "h-6 px-2 rounded text-xs font-medium transition-colors"
              )}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
              <ChevronDown className="h-2 w-2 ml-1" />
            </Button>
            
            {showDropdown && (
              <div className={cn(
                "absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded shadow-lg z-50",
                "animate-in fade-in-0 zoom-in-95"
              )}>
                <button
                  className={cn(
                    "w-full px-2 py-1.5 text-xs text-left hover:bg-muted flex items-center text-foreground",
                    "transition-colors rounded-sm first:rounded-t-md last:rounded-b-md"
                  )}
                  onClick={() => {
                    onNewPrompt();
                    setShowDropdown(false);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  New Prompt
                </button>
                <button
                  className={cn(
                    "w-full px-2 py-1.5 text-xs text-left hover:bg-muted flex items-center text-foreground",
                    "transition-colors rounded-sm first:rounded-t-md last:rounded-b-md"
                  )}
                  onClick={() => {
                    onNewChat();
                    setShowDropdown(false);
                  }}
                >
                  <MessageSquare className="h-3 w-3 mr-1.5" />
                  Bookmark Chat
                </button>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onSettings} 
            className={cn(
              "h-6 w-6 p-0 hover:bg-muted rounded text-muted-foreground hover:text-foreground",
              "transition-colors"
            )}
          >
            <SettingsIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </header>
  );
};
