import React, { useState, useEffect, useMemo } from 'react';
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
          usageCount: 5
        },
        {
          id: '4',
          title: 'Creative Writing Prompt',
          text: 'Write a creative story based on this scenario: [describe scenario]',
          workspace: 'Creative',
          tags: ['writing', 'creative', 'story'],
          isPinned: false,
          created: new Date().toISOString(),
          usageCount: 2
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
  const [selectedWorkspace, setSelectedWorkspace] = useState('All');
  const [sortBy, setSortBy] = useState<'recent' | 'usage' | 'alphabetical' | 'pinned'>('pinned');
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

  // Get unique workspaces
  const workspaces = useMemo(() => {
    const uniqueWorkspaces = [...new Set(prompts.map(p => p.workspace))];
    return ['All', ...uniqueWorkspaces.sort()];
  }, [prompts]);

  // Filter and sort prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = prompts.filter(prompt => {
      const matchesSearch = 
        prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        prompt.workspace.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesWorkspace = selectedWorkspace === 'All' || prompt.workspace === selectedWorkspace;
      
      return matchesSearch && matchesWorkspace;
    });

    // Sort prompts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'pinned':
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.usageCount - a.usageCount; // Then by usage
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'recent':
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [prompts, searchTerm, selectedWorkspace, sortBy]);

  const handleSavePrompt = () => {
    if (!formTitle.trim() || !formText.trim()) {
      alert('Title and prompt text are required');
      return;
    }

    const now = new Date().toISOString();
    const tagsArray = formTags.split(',').map(tag => tag.trim()).filter(Boolean);

    if (editingPrompt) {
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
      const updatedPrompts = prompts.map(p =>
        p.id === prompt.id ? { ...p, usageCount: p.usageCount + 1 } : p
      );
      setPrompts(updatedPrompts);
      simpleStorage.savePrompts(updatedPrompts);

      await navigator.clipboard.writeText(prompt.text);
      alert('✨ Prompt copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      alert('Failed to copy prompt');
    }
  };

  const PromptItem = ({ prompt }: { prompt: any }) => {
    return (
      <div 
        onClick={() => handlePastePrompt(prompt)}
        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{prompt.title}</h3>
              {prompt.isPinned && <span className="text-yellow-500 flex-shrink-0">⭐</span>}
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{prompt.text}</p>
          </div>
          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingPrompt(prompt);
                setCurrentView('form');
              }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Edit prompt"
            >
              <span className="text-base">✏️</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handlePinPrompt(prompt.id);
              }}
              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title={prompt.isPinned ? "Unpin prompt" : "Pin prompt"}
            >
              <span className="text-base">{prompt.isPinned ? '📌' : '📍'}</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePrompt(prompt.id);
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="Delete prompt"
            >
              <span className="text-base">🗑️</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-3">
            <span className="bg-gray-100 px-2 py-1 rounded-full font-medium">{prompt.workspace}</span>
            <span className="flex items-center gap-1">
              <span>🔥</span>
              {prompt.usageCount} {prompt.usageCount === 1 ? 'use' : 'uses'}
            </span>
          </div>
          <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to paste
          </div>
        </div>
        
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prompt.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium hover:bg-blue-100 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-96 h-[580px] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading your prompts...</p>
          <p className="text-sm text-gray-500 mt-1">✨ Getting things ready</p>
        </div>
      </div>
    );
  }

  if (currentView === 'list') {
    return (
      <div className="w-96 h-[580px] bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <img 
                src="/icon/DialogDriveIcon.png" 
                alt="DialogDrive" 
                className="w-8 h-8 rounded-lg shadow-sm"
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  DialogDrive
                </h1>
                <p className="text-xs text-gray-600 font-medium">AI Prompt Library</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingPrompt(null);
                  setCurrentView('form');
                }}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                title="New Prompt (Ctrl+N)"
              >
                + New
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <svg className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {workspaces.map(workspace => (
                  <option key={workspace} value={workspace}>
                    {workspace === 'All' ? 'All Workspaces' : workspace}
                  </option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="pinned">Pinned First</option>
                <option value="usage">Most Used</option>
                <option value="recent">Recently Created</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span className="font-medium">
              {filteredAndSortedPrompts.length} prompt{filteredAndSortedPrompts.length !== 1 ? 's' : ''} 
              {searchTerm && ` matching "${searchTerm}"`}
              {selectedWorkspace !== 'All' && ` in ${selectedWorkspace}`}
            </span>
            {filteredAndSortedPrompts.length > 0 && (
              <span className="text-xs bg-white/70 px-2 py-1 rounded-full">
                Sorted by {sortBy === 'pinned' ? 'pinned' : sortBy === 'usage' ? 'usage' : sortBy === 'recent' ? 'recent' : 'alphabetical'}
              </span>
            )}
          </div>
          
          {filteredAndSortedPrompts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">
                {searchTerm || selectedWorkspace !== 'All' ? '🔍' : '💭'}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {searchTerm || selectedWorkspace !== 'All' ? 'No matches found' : 'No prompts yet!'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {searchTerm || selectedWorkspace !== 'All' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first prompt to get started'}
              </p>
              {!searchTerm && selectedWorkspace === 'All' && (
                <button
                  onClick={() => {
                    setEditingPrompt(null);
                    setCurrentView('form');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg transform hover:-translate-y-0.5"
                >
                  ✨ Create Your First Prompt
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedPrompts.map((prompt) => (
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
      <div className="w-96 h-[580px] bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-white/90 backdrop-blur-sm border-b border-gray-200/50">
          <h2 className="text-lg font-bold text-gray-800">
            {editingPrompt ? '✏️ Edit Prompt' : '✨ New Prompt'}
          </h2>
          <button
            onClick={() => {
              setCurrentView('list');
              setEditingPrompt(null);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-xl transition-all duration-200"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm"
                placeholder="Enter a catchy title..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">💬 Prompt Text</label>
              <textarea
                rows={6}
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm resize-none"
                placeholder="Write your prompt here..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📂 Workspace</label>
                <input
                  type="text"
                  value={formWorkspace}
                  onChange={(e) => setFormWorkspace(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 text-sm"
                  placeholder="General"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🏷️ Tags</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 text-sm"
                  placeholder="tag1, tag2"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSavePrompt}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-bold shadow-lg transform hover:-translate-y-0.5"
              >
                {editingPrompt ? '💾 Update' : '🚀 Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('list');
                  setEditingPrompt(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-400 transition-all duration-200 font-bold"
              >
                ❌ Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (currentView === 'settings') {
    return (
      <div className="w-96 h-[580px] bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <div className="flex justify-between items-center p-4 bg-white/90 backdrop-blur-sm border-b border-gray-200/50">
          <h2 className="text-lg font-bold text-gray-800">⚙️ Settings</h2>
          <button
            onClick={() => setCurrentView('list')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/70 rounded-xl transition-all duration-200"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔑 OpenAI API Key
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-600 mt-2">
                Used for AI-powered prompt improvement features
              </p>
              
              <button className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-bold shadow-lg">
                💾 Save API Key
              </button>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">📊 Stats</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">{prompts.length}</div>
                  <div className="text-xs text-blue-600">Total Prompts</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{workspaces.length - 1}</div>
                  <div className="text-xs text-green-600">Workspaces</div>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">ℹ️ About</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>DialogDrive v1.0.0</strong><br/>
                Your AI prompt library and assistant for ChatGPT, Claude, and Gemini.
              </p>
              <div className="mt-3 text-xs text-gray-500">
                Made with ❤️ for productivity
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
