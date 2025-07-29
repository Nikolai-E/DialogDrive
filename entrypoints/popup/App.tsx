import React, { useState, useEffect } from 'react';

// Enhanced prompt interface with user workspaces
interface Prompt {
  id: string;
  title: string;
  text: string;
  created: string;
  includeTimestamp: boolean;
  includeVoiceTag: boolean;
  workspace: string;
  tags: string[];
  isPinned: boolean;
  usageCount: number;
  lastUsed?: string;
}

// Workspace and tag management
interface AppState {
  workspaces: string[];
  allTags: string[];
}

// Suggested tags for autocomplete
const SUGGESTED_TAGS = [
  'summary', 'article', 'analysis', 'code', 'review', 'writing', 'creative',
  'business', 'email', 'presentation', 'research', 'documentation', 'bug-fix',
  'explanation', 'tutorial', 'brainstorm', 'meeting', 'strategy', 'marketing',
  'technical', 'design', 'planning', 'urgent', 'draft', 'final', 'template'
] as const;

// Settings component
const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) {
        const result = await browser.storage.sync.get('openai-api-key');
        setApiKey(result['openai-api-key'] || '');
      } else {
        // Fallback to localStorage
        const key = localStorage.getItem('openai-api-key') || '';
        setApiKey(key);
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
      // Try localStorage fallback
      try {
        const key = localStorage.getItem('openai-api-key') || '';
        setApiKey(key);
      } catch (localError) {
        console.error('localStorage fallback failed:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    try {
      let success = false;
      
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) {
        try {
          await browser.storage.sync.set({ 'openai-api-key': apiKey });
          success = true;
        } catch (browserError) {
          console.error('Browser sync storage failed:', browserError);
        }
      }
      
      if (!success) {
        localStorage.setItem('openai-api-key', apiKey);
        success = true;
      }
      
      if (success) {
        alert('API key saved successfully!');
      } else {
        throw new Error('All storage methods failed');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      alert('Failed to save API key. Please try again.');
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Settings</h2>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
          OpenAI API Key (for prompt improvement)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            color: 'white',
            fontSize: '14px',
            marginBottom: '8px'
          }}
        />
        <button
          onClick={saveApiKey}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Save API Key
        </button>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 0 0' }}>
          Your API key is stored securely and synced across your devices.
        </p>
      </div>
      
      <div style={{ borderTop: '1px solid #374151', paddingTop: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 8px 0' }}>About</h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
          DialogDrive v1.0.0 - Your AI prompt library and assistant
        </p>
      </div>
    </div>
  );
};
interface PromptFormProps {
  prompt?: Prompt | null;
  onSave: (prompt: Omit<Prompt, 'id' | 'created'>) => void;
  onCancel: () => void;
  workspaces: string[];
  allTags: string[];
  onAddWorkspace: (workspace: string) => void;
}

const PromptForm: React.FC<PromptFormProps> = ({ prompt, onSave, onCancel, workspaces, allTags, onAddWorkspace }) => {
  const [title, setTitle] = useState(prompt?.title || '');
  const [text, setText] = useState(prompt?.text || '');
  const [includeTimestamp, setIncludeTimestamp] = useState(prompt?.includeTimestamp || false);
  const [includeVoiceTag, setIncludeVoiceTag] = useState(prompt?.includeVoiceTag || false);
  const [workspace, setWorkspace] = useState(prompt?.workspace || 'General');
  const [tags, setTags] = useState<string[]>(prompt?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState('');
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);

  // Get suggested tags based on input
  const getSuggestedTags = () => {
    if (!tagInput.trim()) return [];
    
    const input = tagInput.toLowerCase();
    const existingTags = [...new Set([...allTags, ...SUGGESTED_TAGS])];
    
    return existingTags
      .filter(tag => 
        tag.toLowerCase().includes(input) && 
        !tags.includes(tag)
      )
      .slice(0, 5);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !text.trim()) {
      alert('Please fill in both title and text fields.');
      return;
    }
    
    onSave({
      title: title.trim(),
      text: text.trim(),
      includeTimestamp,
      includeVoiceTag,
      workspace,
      tags,
      isPinned: prompt?.isPinned || false,
      usageCount: prompt?.usageCount || 0,
      lastUsed: prompt?.lastUsed,
    });
  };

  const addTag = (tag?: string) => {
    const newTag = (tag || tagInput).trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
    }
  };

  const addNewWorkspace = () => {
    if (newWorkspace.trim() && !workspaces.includes(newWorkspace.trim())) {
      onAddWorkspace(newWorkspace.trim());
      setWorkspace(newWorkspace.trim());
      setNewWorkspace('');
      setShowNewWorkspace(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '3px' }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            color: 'white',
            fontSize: '13px'
          }}
          placeholder="Enter prompt title..."
        />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500' }}>
            Workspace
          </label>
          <button
            type="button"
            onClick={() => setShowNewWorkspace(!showNewWorkspace)}
            style={{
              padding: '2px 6px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            + New
          </button>
        </div>
        
        {showNewWorkspace ? (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            <input
              type="text"
              value={newWorkspace}
              onChange={(e) => setNewWorkspace(e.target.value)}
              placeholder="New workspace name..."
              style={{
                flex: 1,
                padding: '4px',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '3px',
                color: 'white',
                fontSize: '12px'
              }}
            />
            <button
              type="button"
              onClick={addNewWorkspace}
              style={{
                padding: '4px 8px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowNewWorkspace(false)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Cancel
            </button>
          </div>
        ) : null}
        
        <select
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            color: 'white',
            fontSize: '13px'
          }}
        >
          {workspaces.map(ws => (
            <option key={ws} value={ws}>{ws}</option>
          ))}
        </select>
      </div>

      <div style={{ position: 'relative' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '3px' }}>
          Tags
        </label>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              setShowTagSuggestions(e.target.value.length > 0);
            }}
            onKeyPress={handleTagKeyPress}
            onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
            onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
            style={{
              flex: 1,
              padding: '6px',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              color: 'white',
              fontSize: '13px'
            }}
            placeholder="Add a tag..."
          />
          <button
            type="button"
            onClick={() => addTag()}
            style={{
              padding: '6px 10px',
              backgroundColor: '#4b5563',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Add
          </button>
        </div>
        
        {/* Tag Suggestions */}
        {showTagSuggestions && getSuggestedTags().length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            zIndex: 10,
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {getSuggestedTags().map(suggestedTag => (
              <button
                key={suggestedTag}
                type="button"
                onClick={() => addTag(suggestedTag)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #4b5563',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textAlign: 'left'
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
              >
                {suggestedTag}
              </button>
            ))}
          </div>
        )}
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '20px' }}>
          {tags.map(tag => (
            <span
              key={tag}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: 0
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '3px' }}>
          Prompt Text
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            color: 'white',
            fontSize: '13px',
            resize: 'vertical'
          }}
          placeholder="Enter your prompt text..."
        />
      </div>
      
      <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={includeTimestamp}
            onChange={(e) => setIncludeTimestamp(e.target.checked)}
            style={{ accentColor: '#2563eb' }}
          />
          Timestamp
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={includeVoiceTag}
            onChange={(e) => setIncludeVoiceTag(e.target.checked)}
            style={{ accentColor: '#2563eb' }}
          />
          Voice-friendly
        </label>
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          {prompt ? 'Update' : 'Save'}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const App: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Phase 2A: Search and filter state with workspaces
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'created' | 'title' | 'usage' | 'lastUsed'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Workspace and tag management
  const [workspaces, setWorkspaces] = useState<string[]>(['General']);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Add new workspace
  const addWorkspace = (workspace: string) => {
    if (workspace.trim() && !workspaces.includes(workspace.trim())) {
      setWorkspaces(prev => [...prev, workspace.trim()]);
    }
  };

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  // Filter and sort prompts
  const filteredAndSortedPrompts = React.useMemo(() => {
    let filtered = prompts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.title.toLowerCase().includes(query) ||
        prompt.text.toLowerCase().includes(query) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply workspace filter
    if (selectedWorkspace !== 'All') {
      filtered = filtered.filter(prompt => prompt.workspace === selectedWorkspace);
    }

    // Apply pinned filter
    if (showPinnedOnly) {
      filtered = filtered.filter(prompt => prompt.isPinned);
    }

    // Sort prompts
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'usage':
          comparison = (a.usageCount || 0) - (b.usageCount || 0);
          break;
        case 'lastUsed':
          const aDate = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          const bDate = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'created':
        default:
          comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [prompts, searchQuery, selectedWorkspace, showPinnedOnly, sortBy, sortOrder]);

  const loadPrompts = async () => {
    try {
      console.log('Loading prompts from storage...');
      
      // Check if browser API is available
      if (typeof browser === 'undefined') {
        console.error('Browser API not available');
        throw new Error('Browser API not available');
      }
      
      if (!browser.storage || !browser.storage.local) {
        console.error('Browser storage API not available');
        throw new Error('Browser storage API not available');
      }
      
      const result = await browser.storage.local.get('dialogdrive-prompts');
      console.log('Storage result:', result);
      
      const storedPrompts = result['dialogdrive-prompts'] as Prompt[] || [];
      console.log('Stored prompts:', storedPrompts);
      
      if (storedPrompts.length === 0) {
        // Initialize with default prompts
        console.log('No prompts found, creating defaults...');
        const defaultPrompts: Prompt[] = [
          {
            id: 'default-1',
            title: 'Summarize this article',
            text: 'Please provide a concise summary of the following article: [paste article here]',
            created: new Date().toISOString(),
            includeTimestamp: false,
            includeVoiceTag: false,
            workspace: 'Research',
            tags: ['summary', 'article'],
            isPinned: false,
            usageCount: 0,
          },
          {
            id: 'default-2',
            title: 'Explain like I\'m 5',
            text: 'Explain the following concept to me as if I were a 5-year-old: [paste concept here]',
            created: new Date().toISOString(),
            includeTimestamp: true,
            includeVoiceTag: false,
            workspace: 'Education',
            tags: ['simple', 'explanation'],
            isPinned: true,
            usageCount: 0,
          },
          {
            id: 'default-3',
            title: 'Code review request',
            text: 'Please review the following code and provide feedback on:\n- Code quality and best practices\n- Potential bugs or issues\n- Performance improvements\n- Security considerations\n\n[paste code here]',
            created: new Date().toISOString(),
            includeTimestamp: false,
            includeVoiceTag: true,
            workspace: 'Development',
            tags: ['code', 'review', 'feedback'],
            isPinned: false,
            usageCount: 0,
          },
        ];
        console.log('Saving default prompts to storage...');
        await browser.storage.local.set({ 'dialogdrive-prompts': defaultPrompts });
        console.log('Default prompts saved, setting state...');
        setPrompts(defaultPrompts);
      } else {
        console.log('Setting stored prompts to state...');
        setPrompts(storedPrompts);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // Use localStorage as fallback
      console.log('Trying localStorage fallback...');
      try {
        const fallbackData = localStorage.getItem('dialogdrive-prompts');
        if (fallbackData) {
          const parsedData = JSON.parse(fallbackData);
          console.log('Loaded from localStorage:', parsedData);
          setPrompts(parsedData);
        }
      } catch (localError) {
        console.error('localStorage fallback also failed:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update workspaces and tags when prompts change
  useEffect(() => {
    const uniqueWorkspaces = new Set(['General']); // Always include General
    const uniqueTags = new Set<string>();
    
    prompts.forEach(prompt => {
      if (prompt.workspace) {
        uniqueWorkspaces.add(prompt.workspace);
      }
      prompt.tags.forEach(tag => uniqueTags.add(tag));
    });
    
    setWorkspaces(Array.from(uniqueWorkspaces));
    setAllTags(Array.from(uniqueTags));
  }, [prompts]);

  const savePrompt = async (promptData: Omit<Prompt, 'id' | 'created'>) => {
    console.log('Attempting to save prompt:', promptData);
    
    // Validate input data
    if (!promptData.title || !promptData.text) {
      alert('Title and text are required');
      return;
    }
    
    try {
      let updatedPrompts;
      
      if (editingPrompt) {
        // Edit existing prompt
        console.log('Editing existing prompt:', editingPrompt.id);
        updatedPrompts = prompts.map(p => 
          p.id === editingPrompt.id 
            ? { ...editingPrompt, ...promptData }
            : p
        );
      } else {
        // Add new prompt
        console.log('Adding new prompt');
        const newPrompt: Prompt = {
          ...promptData,
          id: `prompt-${Date.now()}`,
          created: new Date().toISOString(),
        };
        updatedPrompts = [...prompts, newPrompt];
      }
      
      console.log('Updating local state...');
      setPrompts(updatedPrompts);
      
      console.log('Saving to browser storage...');
      
      // Try browser storage first
      let storageSuccess = false;
      try {
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
          await browser.storage.local.set({ 'dialogdrive-prompts': updatedPrompts });
          console.log('Successfully saved to browser storage');
          storageSuccess = true;
        } else {
          console.log('Browser storage not available, using localStorage fallback');
        }
      } catch (browserError) {
        console.error('Browser storage failed:', browserError);
      }
      
      // Fallback to localStorage
      if (!storageSuccess) {
        try {
          localStorage.setItem('dialogdrive-prompts', JSON.stringify(updatedPrompts));
          console.log('Successfully saved to localStorage');
          storageSuccess = true;
        } catch (localError) {
          console.error('localStorage also failed:', localError);
          throw new Error('Both browser storage and localStorage failed');
        }
      }
      
      // Close form only after successful save
      setShowForm(false);
      setEditingPrompt(null);
      
      console.log('Save operation completed successfully');
      
    } catch (error) {
      console.error('Failed to save prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save prompt: ${errorMessage}. Please try again.`);
    }
  };

  const togglePin = async (id: string) => {
    const updatedPrompts = prompts.map(p => 
      p.id === id ? { ...p, isPinned: !p.isPinned } : p
    );
    setPrompts(updatedPrompts);
    
    // Save to storage
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        await browser.storage.local.set({ 'dialogdrive-prompts': updatedPrompts });
      } else {
        localStorage.setItem('dialogdrive-prompts', JSON.stringify(updatedPrompts));
      }
    } catch (error) {
      console.error('Failed to save pin status:', error);
      localStorage.setItem('dialogdrive-prompts', JSON.stringify(updatedPrompts));
    }
  };

  const deletePrompt = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      const updatedPrompts = prompts.filter(p => p.id !== id);
      setPrompts(updatedPrompts);
      await browser.storage.local.set({ 'dialogdrive-prompts': updatedPrompts });
    }
  };

  const editPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setShowForm(true);
  };

  const transformPromptText = (prompt: Prompt): string => {
    let text = prompt.text;
    
    if (prompt.includeTimestamp) {
      const timestamp = new Date().toLocaleString();
      text = `[${timestamp}] ${text}`;
    }
    
    if (prompt.includeVoiceTag) {
      text = `${text}\n\n[Please respond in a conversational, voice-friendly tone]`;
    }
    
    return text;
  };

  const handlePaste = async (prompt: Prompt) => {
    try {
      // Update usage tracking
      const updatedPrompts = prompts.map(p => 
        p.id === prompt.id 
          ? { 
              ...p, 
              usageCount: (p.usageCount || 0) + 1,
              lastUsed: new Date().toISOString()
            }
          : p
      );
      setPrompts(updatedPrompts);
      
      // Save updated usage to storage
      try {
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
          await browser.storage.local.set({ 'dialogdrive-prompts': updatedPrompts });
        } else {
          localStorage.setItem('dialogdrive-prompts', JSON.stringify(updatedPrompts));
        }
      } catch (error) {
        console.error('Failed to save usage tracking:', error);
        localStorage.setItem('dialogdrive-prompts', JSON.stringify(updatedPrompts));
      }
      
      const transformedText = transformPromptText(prompt);
      console.log('Attempting to paste transformed text:', transformedText);
      
      // Try to send to content script for direct pasting
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      console.log('Active tabs:', tabs);
      
      if (tabs[0]?.id && tabs[0]?.url) {
        const currentUrl = tabs[0].url;
        console.log('Current URL:', currentUrl);
        
        // Check if we're on a supported site
        const supportedSites = [
          'chatgpt.com',
          'chat.openai.com',
          'claude.ai',
          'gemini.google.com'
        ];
        
        const isSupported = supportedSites.some(site => currentUrl.includes(site));
        console.log('Is supported site:', isSupported);
        
        if (isSupported) {
          try {
            console.log('Sending message to content script...');
            const response = await browser.tabs.sendMessage(tabs[0].id, {
              type: 'PASTE_PROMPT',
              text: transformedText
            });
            
            console.log('Content script response:', response);
            
            if (response?.success) {
              console.log('Successfully pasted via content script');
              // Close popup after successful paste
              window.close();
              return;
            } else {
              console.log('Content script paste failed, falling back to clipboard');
            }
          } catch (contentError) {
            console.error('Content script error:', contentError);
            console.log('Content script not available, falling back to clipboard');
          }
        } else {
          console.log('Not a supported site, using clipboard fallback');
        }
      }
      
      // Fallback to clipboard
      console.log('Using clipboard fallback...');
      try {
        await navigator.clipboard.writeText(transformedText);
        console.log('Successfully copied to clipboard');
        alert('Prompt copied to clipboard! Paste it manually with Ctrl+V');
      } catch (clipboardError) {
        console.error('Clipboard API failed:', clipboardError);
        
        // Fallback to execCommand (older browsers)
        try {
          const textArea = document.createElement('textarea');
          textArea.value = transformedText;
          document.body.appendChild(textArea);
          textArea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (success) {
            console.log('Successfully copied using execCommand');
            alert('Prompt copied to clipboard! Paste it manually with Ctrl+V');
          } else {
            throw new Error('execCommand copy failed');
          }
        } catch (execError) {
          console.error('execCommand also failed:', execError);
          throw new Error('All clipboard methods failed');
        }
      }
      
    } catch (error) {
      console.error('Failed to paste/copy prompt:', error);
      alert('Failed to copy prompt. Please try copying the text manually.');
    }
  };

  const improvePrompt = async (prompt: Prompt) => {
    try {
      // Check if API key is available
      let apiKey = '';
      
      try {
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) {
          const result = await browser.storage.sync.get('openai-api-key');
          apiKey = result['openai-api-key'] || '';
        }
        
        if (!apiKey) {
          apiKey = localStorage.getItem('openai-api-key') || '';
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
        apiKey = localStorage.getItem('openai-api-key') || '';
      }
      
      if (!apiKey) {
        alert('Please set your OpenAI API key in settings first.');
        return;
      }
      
      // Send message to background script to improve the prompt
      const response = await browser.runtime.sendMessage({
        type: 'IMPROVE_PROMPT',
        promptText: prompt.text
      });
      
      if (response.success) {
        // Create a new prompt with the improved text
        const improvedPrompt: Prompt = {
          ...prompt,
          id: `improved-${Date.now()}`,
          title: `${prompt.title} (Improved)`,
          text: response.improvedText,
          created: new Date().toISOString(),
          workspace: prompt.workspace,
          tags: [...prompt.tags, 'improved'],
          isPinned: false,
          usageCount: 0,
        };
        
        const updatedPrompts = [...prompts, improvedPrompt];
        setPrompts(updatedPrompts);
        
        // Save using the same fallback mechanism
        try {
          if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
            await browser.storage.local.set({ 'dialogdrive-prompts': updatedPrompts });
          } else {
            localStorage.setItem('dialogdrive-prompts', JSON.stringify(updatedPrompts));
          }
        } catch (saveError) {
          console.error('Failed to save improved prompt:', saveError);
          localStorage.setItem('dialogdrive-prompts', JSON.stringify(updatedPrompts));
        }
        
        alert('Improved prompt added to your library!');
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to improve prompt:', error);
      alert('Failed to improve prompt. Please check your API key and try again.');
    }
  };

  return (
    <div 
      style={{
        width: '400px',
        height: '580px',
        backgroundColor: '#0f172a',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px'
      }}
    >
      <style>{`
        /* Custom scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1e293b;
        }
        ::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
      <header 
        style={{ 
          padding: '6px 10px', 
          borderBottom: '1px solid #374151', 
          backgroundColor: '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '32px'
        }}
      >
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            margin: 0 
          }}>
            DialogDrive
          </h1>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: '3px',
            backgroundColor: 'transparent',
            border: '1px solid #4b5563',
            borderRadius: '3px',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          title="Settings"
        >
          ⚙️
        </button>
      </header>

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        minHeight: '500px' // Ensure main content has minimum height
      }}>
        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : (
          <>
            {/* Compact Search and Filter Controls */}
            <div style={{ padding: '6px', borderBottom: '1px solid #374151', backgroundColor: '#1e293b' }}>
              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '3px',
                  color: 'white',
                  fontSize: '11px',
                  marginBottom: '4px'
                }}
              />
              
              {/* Compact Filter Row */}
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <select
                  value={selectedWorkspace}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  style={{
                    padding: '2px 4px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '2px',
                    color: 'white',
                    fontSize: '10px',
                    flex: '1'
                  }}
                >
                  <option value="All">All</option>
                  {workspaces.map(workspace => (
                    <option key={workspace} value={workspace}>{workspace}</option>
                  ))}
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: '2px 4px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '2px',
                    color: 'white',
                    fontSize: '10px',
                    flex: '1'
                  }}
                >
                  <option value="created">Date</option>
                  <option value="title">Name</option>
                  <option value="usage">Usage</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  style={{
                    padding: '2px 4px',
                    backgroundColor: '#4b5563',
                    border: 'none',
                    borderRadius: '2px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '10px',
                    minWidth: '20px'
                  }}
                  title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                
                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  style={{
                    padding: '2px 4px',
                    backgroundColor: showPinnedOnly ? '#2563eb' : '#4b5563',
                    border: 'none',
                    borderRadius: '2px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '10px',
                    minWidth: '20px'
                  }}
                  title="Show pinned only"
                >
                  📌
                </button>
              </div>
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '6px',
              paddingRight: '2px', // Account for scrollbar
              scrollbarWidth: 'thin',
              scrollbarColor: '#4b5563 #1e293b'
            }}>
              {isLoading ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }}>
                  Loading prompts...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {filteredAndSortedPrompts.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                      {searchQuery || selectedWorkspace !== 'All' || showPinnedOnly 
                        ? 'No prompts match your filters.' 
                        : 'No prompts yet. Add your first prompt below!'}
                    </div>
                  ) : (
                    filteredAndSortedPrompts.map((prompt) => (
                      <div 
                        key={prompt.id}
                        style={{
                          padding: '8px',
                          backgroundColor: '#1e293b',
                          borderRadius: '6px',
                          border: prompt.isPinned ? '1px solid #fbbf24' : '1px solid #374151'
                        }}
                      >
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <h3 style={{ fontWeight: '600', color: '#f1f5f9', margin: 0, fontSize: '13px', flex: 1 }}>
                              {prompt.title}
                            </h3>
                            {prompt.isPinned && <span style={{ fontSize: '12px' }}>📌</span>}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '10px',
                              backgroundColor: '#374151',
                              color: '#94a3b8',
                              padding: '1px 4px',
                              borderRadius: '6px'
                            }}>
                              {prompt.workspace}
                            </span>
                            {prompt.usageCount > 0 && (
                              <span style={{
                                fontSize: '10px',
                                backgroundColor: '#059669',
                                color: 'white',
                                padding: '1px 4px',
                                borderRadius: '6px'
                              }}>
                                {prompt.usageCount}x
                              </span>
                            )}
                            {prompt.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: '9px',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  padding: '1px 4px',
                                  borderRadius: '6px'
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {prompt.tags.length > 2 && (
                              <span style={{ fontSize: '9px', color: '#94a3b8' }}>+{prompt.tags.length - 2}</span>
                            )}
                          </div>
                          
                          <p style={{ 
                            fontSize: '11px', 
                            color: '#94a3b8', 
                            margin: '0 0 6px 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.3'
                          }}>
                            {prompt.text}
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => handlePaste(prompt)}
                            style={{
                              padding: '3px 6px',
                              backgroundColor: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            Paste
                          </button>
                          <button 
                            onClick={() => togglePin(prompt.id)}
                            style={{
                              padding: '3px 6px',
                              backgroundColor: prompt.isPinned ? '#fbbf24' : '#6b7280',
                              color: prompt.isPinned ? '#000' : 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            {prompt.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button 
                            onClick={() => editPrompt(prompt)}
                            style={{
                              padding: '3px 6px',
                              backgroundColor: '#7c3aed',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deletePrompt(prompt.id)}
                            style={{
                              padding: '3px 6px',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '10px'
                            }}
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ 
              padding: '6px', 
              borderTop: '1px solid #374151', 
              backgroundColor: '#1e293b',
              flexShrink: 0
            }}>
              {showForm ? (
                <PromptForm 
                  prompt={editingPrompt}
                  onSave={savePrompt}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingPrompt(null);
                  }}
                  workspaces={workspaces}
                  allTags={allTags}
                  onAddWorkspace={addWorkspace}
                />
              ) : (
                <button
                  onClick={() => {
                    console.log('Add New Prompt button clicked');
                    setShowForm(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    minHeight: '28px'
                  }}
                >
                  + Add New Prompt
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;