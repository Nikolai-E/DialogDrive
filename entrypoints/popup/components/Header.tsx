import React, { useState } from 'react';
import { Sparkles, Plus, Settings as SettingsIcon, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';

interface HeaderProps {
  onNewPrompt: () => void;
  onNewChat: () => void;
  onSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPrompt, onNewChat, onSettings }) => {
  const { currentView } = useUnifiedStore();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
      {/* Logo and Brand - LOCKED SPECIFICATION */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm transition-transform duration-200 ease-apple hover:scale-105">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">DialogDrive</h1>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Add Dropdown */}
        <div className="relative">
          <Button 
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 ease-apple hover:scale-105 active:scale-95"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
          
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 transition-all duration-200 ease-apple animate-gentle-lift">
              <button
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center transition-colors duration-150 ease-apple"
                onClick={() => {
                  onNewPrompt();
                  setShowDropdown(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Prompt
              </button>
              <button
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center transition-colors duration-150 ease-apple"
                onClick={() => {
                  onNewChat();
                  setShowDropdown(false);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Bookmark Chat
              </button>
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSettings} 
          className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-all duration-200 ease-apple hover:scale-105 active:scale-95"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
