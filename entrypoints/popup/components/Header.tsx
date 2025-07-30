import React from 'react';

interface HeaderProps {
  onNewPrompt: () => void;
  onSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPrompt, onSettings }) => {
  return (
    <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="text-2xl">💬</div>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">DialogDrive</h1>
          <p className="text-xs text-gray-500">AI Prompt Manager</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={onNewPrompt}
          className="px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          title="Create New Prompt (Ctrl+N)"
        >
          + New
        </button>
        
        <button
          onClick={onSettings}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};
