import React, { useState } from 'react';
import { Sparkles, Plus, Settings as SettingsIcon, MessageSquare, ChevronDown, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';

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
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs border border-border rounded bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Add Dropdown */}
          <div className="relative">
            <Button 
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-6 px-2 rounded text-xs font-medium"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
              <ChevronDown className="h-2 w-2 ml-1" />
            </Button>
            
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded shadow-lg z-50">
                <button
                  className="w-full px-2 py-1.5 text-xs text-left hover:bg-muted flex items-center text-foreground"
                  onClick={() => {
                    onNewPrompt();
                    setShowDropdown(false);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  New Prompt
                </button>
                <button
                  className="w-full px-2 py-1.5 text-xs text-left hover:bg-muted flex items-center text-foreground"
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
            className="h-6 w-6 p-0 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <SettingsIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </header>
  );
};
