import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';

// Theme types and context
interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    borderHover: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
    accent: string;
    shadow: string;
    shadowHover: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#10A37F', // ChatGPT-style green
    primaryHover: '#0D8A6B',
    secondary: '#6366F1', // Purple for secondary actions
    background: '#F8F9FA', // Very light grey, not pure white
    surface: '#FFFFFF', // White cards that stand out from background
    surfaceHover: '#F1F5F9',
    border: '#E2E8F0', // Subtle borders
    borderHover: '#CBD5E1',
    text: '#0F172A', // Darker text for better contrast
    textSecondary: '#334155', // Darker secondary text
    textMuted: '#64748B', // Better muted text visibility
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    accent: '#10A37F',
    shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    shadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px'
  },
  borderRadius: {
    sm: '6px', // Slightly more rounded for modern feel
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "Inter", Roboto, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  }
};

const darkTheme: Theme = {
  ...lightTheme,
  mode: 'dark',
  colors: {
    primary: '#3B82F6', // Modern blue - more vibrant
    primaryHover: '#2563EB',
    secondary: '#8B5CF6', // Updated purple
    background: '#0F1419', // Slightly warmer dark
    surface: '#1F2937', // Better contrast for cards
    surfaceHover: '#374151', // More pronounced hover
    border: '#374151', // Better visible borders
    borderHover: '#4B5563',
    text: '#F9FAFB', // Higher contrast text
    textSecondary: '#D1D5DB', // Better secondary text
    textMuted: '#9CA3AF', // Improved muted text
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    accent: '#3B82F6', // Consistent with primary
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    shadowHover: '0 10px 25px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
  }
};

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: darkTheme,
  toggleTheme: () => {}
});

const useTheme = () => useContext(ThemeContext);

// Define types for our prompt data
interface Prompt {
  id: string;
  title: string;
  text: string;
  created: string;
  lastUsed?: string;
  usageCount: number;
  includeTimestamp: boolean;
  includeVoiceTag: boolean;
  workspace: string;
  tags: string[];
  isPinned: boolean;
}

// Toast notification interface
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
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

// Toast Notification Component
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
  const { theme } = useTheme();
  
  return (
    <div style={{
      position: 'fixed',
      top: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            backgroundColor: toast.type === 'success' ? theme.colors.success : 
                           toast.type === 'error' ? theme.colors.error : theme.colors.primary,
            color: 'white',
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.borderRadius.md,
            boxShadow: theme.colors.shadowHover,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            maxWidth: '250px',
            pointerEvents: 'auto',
            animation: 'slideIn 0.3s ease-out',
            cursor: 'pointer'
          }}
          onClick={() => onRemove(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

// Settings component
const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { theme } = useTheme();
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
    <div style={{ 
      padding: theme.spacing.xl, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: theme.spacing.lg,
      backgroundColor: theme.colors.background
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ 
          fontSize: theme.typography.fontSize.xl, 
          fontWeight: theme.typography.fontWeight.bold, 
          margin: 0,
          color: theme.colors.text
        }}>
          Settings
        </h2>
        <button
          onClick={onClose}
          style={{
            padding: theme.spacing.sm,
            backgroundColor: 'transparent',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            color: theme.colors.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = theme.colors.borderHover;
            e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ✕
        </button>
      </div>
      
      <div>
        <label style={{ 
          display: 'block', 
          fontSize: theme.typography.fontSize.base, 
          fontWeight: theme.typography.fontWeight.medium, 
          marginBottom: theme.spacing.sm,
          color: theme.colors.text
        }}>
          OpenAI API Key (for prompt improvement)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          style={{
            width: '100%',
            padding: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.base,
            marginBottom: theme.spacing.md,
            transition: 'border-color 0.2s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
        />
        <button
          onClick={saveApiKey}
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            backgroundColor: theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            cursor: 'pointer',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.primary;
          }}
        >
          Save API Key
        </button>
        <p style={{ 
          fontSize: theme.typography.fontSize.sm, 
          color: theme.colors.textMuted, 
          margin: `${theme.spacing.sm} 0 0 0` 
        }}>
          Your API key is stored securely and synced across your devices.
        </p>
      </div>
      
      <div style={{ 
        borderTop: `1px solid ${theme.colors.border}`, 
        paddingTop: theme.spacing.lg 
      }}>
        <h3 style={{ 
          fontSize: theme.typography.fontSize.lg, 
          fontWeight: theme.typography.fontWeight.medium, 
          margin: `0 0 ${theme.spacing.sm} 0`,
          color: theme.colors.text
        }}>
          About
        </h3>
        <p style={{ 
          fontSize: theme.typography.fontSize.base, 
          color: theme.colors.textSecondary, 
          margin: 0 
        }}>
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
  const { theme } = useTheme();
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
        <label style={{ 
          display: 'block', 
          fontSize: theme.typography.fontSize.sm, 
          fontWeight: theme.typography.fontWeight.medium, 
          marginBottom: '3px',
          color: theme.colors.text
        }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.sm,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
          placeholder="Enter prompt title..."
        />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <label style={{ 
            fontSize: theme.typography.fontSize.sm, 
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text
          }}>
            Workspace
          </label>
          <button
            type="button"
            onClick={() => setShowNewWorkspace(!showNewWorkspace)}
            style={{
              padding: '2px 6px',
              backgroundColor: theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.medium
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
                padding: theme.spacing.xs,
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm,
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={addNewWorkspace}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: theme.colors.success,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                cursor: 'pointer',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowNewWorkspace(false)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                backgroundColor: theme.colors.textMuted,
                color: 'white',
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                cursor: 'pointer',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium
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
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.sm,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            outline: 'none'
          }}
        >
          {workspaces.map(ws => (
            <option key={ws} value={ws}>{ws}</option>
          ))}
        </select>
      </div>

      <div style={{ position: 'relative' }}>
        <label style={{ 
          display: 'block', 
          fontSize: theme.typography.fontSize.sm, 
          fontWeight: theme.typography.fontWeight.medium, 
          marginBottom: '3px',
          color: theme.colors.text
        }}>
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
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm,
              outline: 'none'
            }}
            placeholder="Add a tag..."
          />
          <button
            type="button"
            onClick={() => addTag()}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.surfaceHover,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.sm,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium
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
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.sm,
            zIndex: 10,
            maxHeight: '120px',
            overflowY: 'auto',
            boxShadow: theme.colors.shadowHover
          }}>
            {getSuggestedTags().map(suggestedTag => (
              <button
                key={suggestedTag}
                type="button"
                onClick={() => addTag(suggestedTag)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: theme.typography.fontSize.sm,
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
                backgroundColor: theme.colors.primary,
                color: 'white',
                padding: `2px ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
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
                  fontSize: theme.typography.fontSize.xs,
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      
      <div>
        <label style={{ 
          display: 'block', 
          fontSize: theme.typography.fontSize.sm, 
          fontWeight: theme.typography.fontWeight.medium, 
          marginBottom: '3px',
          color: theme.colors.text
        }}>
          Prompt Text
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.sm,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            resize: 'vertical',
            outline: 'none',
            fontFamily: theme.typography.fontFamily,
            lineHeight: '1.5'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
          placeholder="Enter your prompt text..."
        />
      </div>
      
      <div style={{ display: 'flex', gap: '12px', fontSize: theme.typography.fontSize.sm }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          color: theme.colors.text,
          fontWeight: theme.typography.fontWeight.medium
        }}>
          <input
            type="checkbox"
            checked={includeTimestamp}
            onChange={(e) => setIncludeTimestamp(e.target.checked)}
            style={{ accentColor: theme.colors.primary }}
          />
          Timestamp
        </label>
        
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          color: theme.colors.text,
          fontWeight: theme.typography.fontWeight.medium
        }}>
          <input
            type="checkbox"
            checked={includeVoiceTag}
            onChange={(e) => setIncludeVoiceTag(e.target.checked)}
            style={{ accentColor: theme.colors.primary }}
          />
          Voice-friendly
        </label>
      </div>
      
      <div style={{ display: 'flex', gap: theme.spacing.sm }}>
        <Button
          type="submit"
          variant="filled"
          style={{
            flex: 1,
            justifyContent: 'center'
          }}
        >
          {prompt ? 'Update' : 'Save'}
        </Button>
        
        <Button
          type="button"
          onClick={onCancel}
          variant="outlined"
          style={{
            flex: 1,
            justifyContent: 'center'
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

// Theme Provider Component
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  
  const theme = isDark ? darkTheme : lightTheme;
  
  const toggleTheme = () => {
    setIsDark(!isDark);
    // Save preference to storage
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
        browser.storage.local.set({ 'dialogdrive-theme': !isDark ? 'dark' : 'light' });
      } else {
        localStorage.setItem('dialogdrive-theme', !isDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Load theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        let savedTheme = 'dark';
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
          const result = await browser.storage.local.get('dialogdrive-theme');
          savedTheme = result['dialogdrive-theme'] || 'dark';
        } else {
          savedTheme = localStorage.getItem('dialogdrive-theme') || 'dark';
        }
        setIsDark(savedTheme === 'dark');
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div style={{
        fontFamily: theme.typography.fontFamily,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        width: '100%',
        height: '100%',
        minHeight: '580px'
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// SVG Icon Component
type IconName = 'settings' | 'edit' | 'delete' | 'pin' | 'unpin' | 'sun' | 'moon' | 'close';

const ICONS: Record<IconName, string> = {
  settings: 'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.72C8.63,5.96,8.1,6.29,7.6,6.67L5.21,5.71C4.99,5.62,4.74,5.69,4.62,5.92L2.7,9.24 c-0.11,0.2-0.06,0.47,0.12,0.61L4.85,11c-0.05,0.32-0.07,0.63-0.07,0.94s0.02,0.62,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.38,2.91 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48-0.41l0.38-2.91c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32C19.37,13.35,19.32,13.08,19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  pin: 'M9 2v6h4V2h2v6h4l-1 1v4h-4v9h-2v-9H8V9l-1-1h4V2h2z', // Filled pin for pinned items
  unpin: 'M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z', // Outline pin for unpinned items
  sun: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.64 5.64c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L5.64 2.81c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41L5.64 5.64zm12.72 12.72c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-1.41-1.41c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.41zM4.22 18.36c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-1.41 1.41zM18.36 4.22c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-1.41 1.41z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const Icon: React.FC<IconProps> = ({ name, size = 16, color, style }) => {
  const { theme } = useTheme();
  const iconColor = color || theme.colors.textSecondary;
  
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      fill={iconColor}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <path d={ICONS[name]} />
    </svg>
  );
};

// Theme Toggle Component
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: theme.spacing.sm,
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: theme.borderRadius.sm,
        color: theme.colors.textSecondary,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        transition: 'all 0.15s ease',
        fontSize: theme.typography.fontSize.base
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
        e.currentTarget.style.color = theme.colors.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = theme.colors.textSecondary;
      }}
      title={`Switch to ${theme.mode === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Icon name={theme.mode === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
};

// Button component following Apple/Material design principles
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'filled' | 'outlined' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'filled', 
  size = 'md', 
  disabled = false,
  type = 'button',
  style = {},
  ...props
}) => {
  const { theme } = useTheme();
  
  const sizes = {
    sm: { padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: theme.typography.fontSize.sm },
    md: { padding: `${theme.spacing.sm} ${theme.spacing.md}`, fontSize: theme.typography.fontSize.base },
    lg: { padding: `${theme.spacing.md} ${theme.spacing.lg}`, fontSize: theme.typography.fontSize.base }
  };
  
  const variants = {
    filled: {
      backgroundColor: theme.colors.primary,
      color: 'white',
      border: 'none',
      hover: { backgroundColor: theme.colors.primaryHover }
    },
    outlined: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: `1px solid ${theme.colors.primary}`,
      hover: { backgroundColor: theme.colors.surfaceHover }
    },
    text: {
      backgroundColor: 'transparent',
      color: theme.colors.primary,
      border: 'none',
      hover: { backgroundColor: theme.colors.surfaceHover }
    }
  };
  
  const baseStyle = {
    ...sizes[size],
    ...variants[variant],
    borderRadius: theme.borderRadius.sm,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    opacity: disabled ? 0.6 : 1,
    outline: 'none',
    fontFamily: theme.typography.fontFamily,
    ...style
  };
  
  const [isHovered, setIsHovered] = useState(false);

  const finalStyle = {
    ...baseStyle,
    ...(isHovered && !disabled ? variants[variant].hover : {})
  };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      style={finalStyle}
      onMouseEnter={(e) => {
        setIsHovered(true);
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        props.onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}40`;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        props.onBlur?.(e);
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const App: React.FC = () => {
  const { theme } = useTheme();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Phase 2A: Search and filter state with workspaces
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'created' | 'title' | 'usage' | 'lastUsed'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Workspace and tag management
  const [workspaces, setWorkspaces] = useState<string[]>(['General']);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Toast management functions
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}`;
    const newToast: Toast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

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
      addToast('❌ Title and text are required', 'error');
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
      
      // Show success message
      addToast(editingPrompt ? '✓ Prompt updated!' : '✓ Prompt saved!', 'success');
      
      console.log('Save operation completed successfully');
      
    } catch (error) {
      console.error('Failed to save prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToast(`❌ Failed to save: ${errorMessage}`, 'error');
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
              addToast('✓ Prompt pasted successfully!', 'success');
              // Close popup after successful paste
              setTimeout(() => window.close(), 800);
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
        addToast('📋 Prompt copied to clipboard!', 'success');
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
            addToast('📋 Prompt copied to clipboard!', 'success');
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
      addToast('❌ Failed to copy prompt', 'error');
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
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.fontSize.base,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        boxShadow: `0 4px 12px ${theme.colors.shadow}`
      }}
    >
      <style>{`
        /* Custom scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${theme.colors.surface};
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme.colors.border};
          border-radius: ${theme.borderRadius.sm};
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.borderHover};
        }
        
        /* Toast animations */
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <header 
        style={{ 
          padding: `${theme.spacing.md} ${theme.spacing.lg}`, 
          borderBottom: `1px solid ${theme.colors.border}`, 
          backgroundColor: theme.colors.background,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '44px' // Slightly smaller for better proportion
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <h1 style={{ 
            fontSize: theme.typography.fontSize.lg, 
            fontWeight: theme.typography.fontWeight.semibold, 
            margin: 0,
            color: theme.colors.text,
            letterSpacing: '-0.01em' // Slight negative letter spacing for modern feel
          }}>
            DialogDrive
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
          <ThemeToggle />
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: theme.spacing.sm,
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              transition: 'all 0.15s ease',
              fontSize: theme.typography.fontSize.base
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
              e.currentTarget.style.color = theme.colors.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textSecondary;
            }}
            title="Settings"
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
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
            <div style={{ 
              padding: theme.spacing.md, 
              borderBottom: `1px solid ${theme.colors.border}`, 
              backgroundColor: theme.colors.surface 
            }}>
              {/* Search Bar */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSize.sm,
                  marginBottom: theme.spacing.sm,
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border;
                }}
              />
              
              {/* Compact Filter Row */}
              <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
                <select
                  value={selectedWorkspace}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.sm,
                    color: theme.colors.text,
                    fontSize: theme.typography.fontSize.xs,
                    flex: '1',
                    outline: 'none'
                  }}
                >
                  <option value="All">All Workspaces</option>
                  {workspaces.map(workspace => (
                    <option key={workspace} value={workspace}>{workspace}</option>
                  ))}
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.background,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.sm,
                    color: theme.colors.text,
                    fontSize: theme.typography.fontSize.xs,
                    flex: '1',
                    outline: 'none'
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
                    backgroundColor: theme.colors.surfaceHover,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.sm,
                    color: theme.colors.text,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.xs,
                    minWidth: '20px',
                    fontWeight: theme.typography.fontWeight.medium
                  }}
                  title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                
                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  style={{
                    padding: '2px 4px',
                    backgroundColor: showPinnedOnly ? theme.colors.primary : theme.colors.surfaceHover,
                    border: `1px solid ${showPinnedOnly ? theme.colors.primary : theme.colors.border}`,
                    borderRadius: theme.borderRadius.sm,
                    color: showPinnedOnly ? 'white' : theme.colors.text,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.xs,
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
              padding: theme.spacing.md,
              paddingRight: theme.spacing.xs, // Account for scrollbar
              scrollbarWidth: 'thin'
            }}>
              {isLoading ? (
                <div style={{ 
                  padding: theme.spacing.lg, 
                  textAlign: 'center', 
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary
                }}>
                  Loading prompts...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, paddingRight: theme.spacing.xs }}>
                  {filteredAndSortedPrompts.length === 0 ? (
                    <div style={{ 
                      padding: theme.spacing.lg, 
                      textAlign: 'center', 
                      color: theme.colors.textMuted, 
                      fontSize: theme.typography.fontSize.sm 
                    }}>
                      {searchQuery || selectedWorkspace !== 'All' || showPinnedOnly 
                        ? 'No prompts match your filters.' 
                        : 'No prompts yet. Add your first prompt below!'}
                    </div>
                  ) : (
                    filteredAndSortedPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        style={{
                          padding: theme.spacing.lg,
                          backgroundColor: theme.colors.surface,
                          borderRadius: theme.borderRadius.md,
                          border: `1px solid ${theme.colors.border}`,
                          boxShadow: theme.colors.shadow,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          position: 'relative' as const,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = theme.colors.shadowHover;
                          e.currentTarget.style.borderColor = theme.colors.borderHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = theme.colors.shadow;
                          e.currentTarget.style.borderColor = theme.colors.border;
                        }}
                        onClick={() => handlePaste(prompt)}
                      >
                        <div style={{ marginBottom: theme.spacing.md }}>
                          <h3
                            style={{
                              fontWeight: theme.typography.fontWeight.bold,
                              color: theme.colors.text,
                              margin: `0 0 ${theme.spacing.xs} 0`,
                              fontSize: theme.typography.fontSize.base,
                              lineHeight: '1.4',
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing.sm,
                            }}
                          >
                            {prompt.isPinned && <span style={{ color: theme.colors.accent, fontSize: '14px', marginRight: '2px' }}>📌</span>}
                            {prompt.title}
                          </h3>

                          <p
                            style={{
                              color: theme.colors.textSecondary,
                              fontSize: theme.typography.fontSize.sm,
                              margin: 0,
                              lineHeight: '1.5',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              fontWeight: theme.typography.fontWeight.normal,
                            }}
                          >
                            {prompt.text}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: theme.typography.fontSize.xs,
                              backgroundColor: theme.colors.primary,
                              color: 'white',
                              padding: `2px ${theme.spacing.sm}`,
                              borderRadius: theme.borderRadius.full,
                              fontWeight: theme.typography.fontWeight.medium,
                            }}
                          >
                            {prompt.workspace}
                          </span>

                          {prompt.usageCount > 0 && (
                            <span
                              style={{
                                fontSize: theme.typography.fontSize.xs,
                                backgroundColor: theme.colors.success,
                                color: 'white',
                                padding: `2px ${theme.spacing.sm}`,
                                borderRadius: theme.borderRadius.full,
                                fontWeight: theme.typography.fontWeight.medium,
                              }}
                            >
                              {prompt.usageCount}×
                            </span>
                          )}

                          {prompt.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: theme.typography.fontSize.xs,
                                backgroundColor: theme.colors.surfaceHover,
                                color: theme.colors.textSecondary,
                                border: `1px solid ${theme.colors.border}`,
                                padding: `1px ${theme.spacing.sm}`,
                                borderRadius: theme.borderRadius.sm,
                                fontWeight: theme.typography.fontWeight.normal,
                              }}
                            >
                              {tag}
                            </span>
                          ))}

                          {prompt.tags.length > 3 && (
                            <span
                              style={{
                                fontSize: theme.typography.fontSize.xs,
                                color: theme.colors.textMuted,
                                fontWeight: theme.typography.fontWeight.medium,
                              }}
                            >
                              +{prompt.tags.length - 3}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div
                          style={{
                            position: 'absolute',
                            top: theme.spacing.sm,
                            right: theme.spacing.sm,
                            display: 'flex',
                            gap: theme.spacing.xs,
                          }}
                        >
                          <Button
                            onClick={(e) => { e.stopPropagation(); togglePin(prompt.id); }}
                            variant="text"
                            size="sm"
                            style={{
                              color: theme.colors.textMuted,
                              backgroundColor: 'transparent',
                              minWidth: 'auto',
                              padding: theme.spacing.xs,
                              transition: 'all 0.15s ease',
                              fontSize: '16px'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.accent;
                              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textMuted;
                              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                            }}
                            title={prompt.isPinned ? 'Unpin prompt' : 'Pin prompt'}
                          >
                            {prompt.isPinned ? '📌' : '📍'}
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); editPrompt(prompt); }}
                            variant="text"
                            size="sm"
                            style={{
                              backgroundColor: 'transparent',
                              minWidth: 'auto',
                              padding: theme.spacing.xs,
                              color: theme.colors.textMuted,
                              fontSize: '16px'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.primary;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textMuted;
                            }}
                            title="Edit"
                          >
                            ✏️
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); deletePrompt(prompt.id); }}
                            variant="text"
                            size="sm"
                            style={{
                              backgroundColor: 'transparent',
                              minWidth: 'auto',
                              padding: theme.spacing.xs,
                              color: theme.colors.textMuted,
                              fontSize: '16px'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.error;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textMuted;
                            }}
                            title="Delete"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ 
              padding: theme.spacing.lg, 
              borderTop: `1px solid ${theme.colors.border}`, 
              backgroundColor: theme.colors.surface,
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
                <Button
                  onClick={() => {
                    console.log('Add New Prompt button clicked');
                    setShowForm(true);
                  }}
                  variant="filled"
                  style={{
                    width: '100%',
                    justifyContent: 'center'
                  }}
                >
                  + Add New Prompt
                </Button>
              )}
            </div>
          </>
        )}
      </main>
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}