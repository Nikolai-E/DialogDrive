import React, { useState } from 'react';
import './App.css';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'settings'>('list');
  const [prompts] = useState([
    {
      id: '1',
      title: 'Summarize Article',
      text: 'Please provide a concise summary of the following article: [paste article here]',
      workspace: 'Research',
      tags: ['summary', 'article'],
      isPinned: false
    },
    {
      id: '2', 
      title: 'Explain Like I\'m 5',
      text: 'Explain the following concept to me as if I were a 5-year-old: [paste concept here]',
      workspace: 'Education',
      tags: ['simple', 'explanation'],
      isPinned: true
    }
  ]);

  const PromptItem = ({ prompt }: { prompt: any }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {prompt.isPinned && <span className="text-yellow-500">📌</span>}
            <h3 className="font-medium text-gray-900 text-sm">{prompt.title}</h3>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">{prompt.text}</p>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 rounded text-xs">
          ⋮
        </button>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{prompt.workspace}</span>
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
                onClick={() => setCurrentView('form')}
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
            {prompts.length} prompt{prompts.length !== 1 ? 's' : ''}
          </div>
          
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <PromptItem key={prompt.id} prompt={prompt} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'form') {
    return (
      <div className="w-96 h-[580px] bg-white flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">New Prompt</h2>
          <button
            onClick={() => setCurrentView('list')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter prompt title..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Text</label>
              <textarea
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your prompt..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="General"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('list')}
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
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
