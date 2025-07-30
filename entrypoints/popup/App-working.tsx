import React, { useState, useEffect } from 'react';
import './App.css';

// Simple storage without browser dependencies for now
const simpleStorage = {
  getPrompts: () => {
    try {
      const stored = localStorage.getItem('dialogdrive-prompts');
      return stored ? JSON.parse(stored) : [
        {
          id: '1',
          title: 'Summarize Article',
          text: 'Please provide a concise summary of the following article: [paste article here]',
          workspace: 'Research',
          tags: ['summary', 'article'],
          isPinned: false,
          created: new Date().toISOString(),
          usageCount: 0
        },
        {
          id: '2', 
          title: 'Explain Like I\'m 5',
          text: 'Explain the following concept to me as if I were a 5-year-old: [paste concept here]',
          workspace: 'Education',
          tags: ['simple', 'explanation'],
          isPinned: true,
          created: new Date().toISOString(),
          usageCount: 0
        },
        {
          id: '3',
          title: 'Code Review Request',
          text: 'Please review the following code and provide feedback on:\n- Code quality and best practices\n- Potential bugs or issues\n- Performance improvements\n- Security considerations\n\n[paste code here]',
          workspace: 'Development',
          tags: ['code', 'review', 'feedback'],
          isPinned: false,
          created: new Date().toISOString(),
          usageCount: 0
        }
      ];
    } catch (error) {
      console.error('Failed to load prompts:', error);
      return [];
    }
  },
  
  savePrompts: (prompts: any[]) => {
    try {
      localStorage.setItem('dialogdrive-prompts', JSON.stringify(prompts));
    } catch (error) {
      console.error('Failed to save prompts:', error);
    }
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'settings'>('list');
  const [prompts, setPrompts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formWorkspace, setFormWorkspace] = useState('General');
  const [formTags, setFormTags] = useState('');

  useEffect(() => {
    // Load prompts on mount
    setTimeout(() => {
      const loadedPrompts = simpleStorage.getPrompts();
      setPrompts(loadedPrompts);
      setIsLoading(false);
    }, 100);
  }, []);

  // Handle editing
  useEffect(() => {
    if (editingPrompt) {
      setFormTitle(editingPrompt.title);
      setFormText(editingPrompt.text);
      setFormWorkspace(editingPrompt.workspace);
      setFormTags(editingPrompt.tags.join(', '));
    } else {
      setFormTitle('');
      setFormText('');
      setFormWorkspace('General');
      setFormTags('');
    }
  }, [editingPrompt]);

  // Filter prompts
  const filteredPrompts = prompts.filter(prompt => 
    prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    prompt.workspace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSavePrompt = () => {
    if (!formTitle.trim() || !formText.trim()) {
      alert('Title and prompt text are required');
      return;
    }

    const now = new Date().toISOString();
    const tagsArray = formTags.split(',').map(tag => tag.trim()).filter(Boolean);

    if (editingPrompt) {
      // Update existing prompt
      const updatedPrompts = prompts.map(p =>
        p.id === editingPrompt.id
          ? {
              ...p,
              title: formTitle.trim(),
              text: formText.trim(),
              workspace: formWorkspace.trim(),
              tags: tagsArray
            }
          : p
      );
      setPrompts(updatedPrompts);
      simpleStorage.savePrompts(updatedPrompts);
    } else {
      // Create new prompt
      const newPrompt = {
        id: Date.now().toString(),
        title: formTitle.trim(),
        text: formText.trim(),
        workspace: formWorkspace.trim(),
        tags: tagsArray,
        isPinned: false,
        created: now,
        usageCount: 0
      };
      const updatedPrompts = [...prompts, newPrompt];
      setPrompts(updatedPrompts);
      simpleStorage.savePrompts(updatedPrompts);
    }

    setCurrentView('list');
    setEditingPrompt(null);
  };

  const handleDeletePrompt = (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      const updatedPrompts = prompts.filter(p => p.id !== id);
      setPrompts(updatedPrompts);
      simpleStorage.savePrompts(updatedPrompts);
    }
  };

  const handlePinPrompt = (id: string) => {
    const updatedPrompts = prompts.map(p =>
      p.id === id ? { ...p, isPinned: !p.isPinned } : p
    );
    setPrompts(updatedPrompts);
    simpleStorage.savePrompts(updatedPrompts);
  };

  const handlePastePrompt = async (prompt: any) => {
    try {
      // Update usage count
      const updatedPrompts = prompts.map(p =>
        p.id === prompt.id ? { ...p, usageCount: p.usageCount + 1 } : p
      );
      setPrompts(updatedPrompts);
      simpleStorage.savePrompts(updatedPrompts);

      // Copy to clipboard
      await navigator.clipboard.writeText(prompt.text);
      alert('Prompt copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      alert('Failed to copy prompt');
    }
  };

  const PromptItem = ({ prompt }: { prompt: any }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow relative">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {prompt.isPinned && <span className="text-yellow-500">📌</span>}
              <h3 className="font-medium text-gray-900 text-sm">{prompt.title}</h3>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">{prompt.text}</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded text-xs"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                <button
                  onClick={() => {
                    handlePastePrompt(prompt);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Paste
                </button>
                <button
                  onClick={() => {
                    setEditingPrompt(prompt);
                    setCurrentView('form');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    handlePinPrompt(prompt.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {prompt.isPinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={() => {
                    handleDeletePrompt(prompt.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>{prompt.workspace}</span>
            <span>•</span>
            <span>Used {prompt.usageCount} times</span>
          </div>
        </div>
        
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {prompt.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-96 h-[580px] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'list') {
    return (
      <div className="w-96 h-[580px] bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💬</div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800">DialogDrive</h1>
                <p className="text-xs text-gray-500">AI Prompt Manager</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingPrompt(null);
                  setCurrentView('form');
                }}
                className="px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
                title="New Prompt (Ctrl+N)"
              >
                + New
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search prompts... (Ctrl+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
              🔍
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="text-sm text-gray-500 mb-3">
            {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}
          </div>
          
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No prompts match your search' : 'No prompts yet!'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrompts.map((prompt) => (
                <PromptItem key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'form') {
    return (
      <div className="w-96 h-[580px] bg-white flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingPrompt ? 'Edit Prompt' : 'New Prompt'}
          </h2>
          <button
            onClick={() => {
              setCurrentView('list');
              setEditingPrompt(null);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter prompt title..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Text</label>
              <textarea
                rows={6}
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your prompt..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
              <input
                type="text"
                value={formWorkspace}
                onChange={(e) => setFormWorkspace(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="General"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSavePrompt}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                {editingPrompt ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('list');
                  setEditingPrompt(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="w-96 h-[580px] bg-white flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <button
            onClick={() => setCurrentView('list')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for prompt improvement feature
              </p>
            </div>
            
            <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
              Save API Key
            </button>

            <div className="mt-8 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-800 mb-2">About</h3>
              <p className="text-sm text-gray-600">
                DialogDrive v1.0.0 - Your AI prompt library and assistant for ChatGPT, Claude, and Gemini.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
