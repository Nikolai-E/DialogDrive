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

const universalTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#72A9F2', // Bright blue from palette
    primaryHover: '#5B94E8', // Slightly darker blue for hover
    secondary: '#80BDF2', // Light blue from palette
    background: '#FAFBFC', // Slightly off-white for warmth
    surface: '#FFFFFF', // Pure white for cards to stand out
    surfaceHover: '#F8FAFB', // Very light gray for hover states
    border: '#E1E8ED', // Softer border color
    borderHover: '#CBD5E1', // Medium gray for hover
    text: '#1A202C', // Near black text
    textSecondary: '#4A5568', // Medium gray for secondary text
    textMuted: '#718096', // Lighter gray for muted content
    success: '#4F7D3D', // Forest green from palette
    warning: '#F2C48D', // Warm beige from palette
    error: '#E53E3E', // Clean red for errors
    accent: '#709722', // Olive green from palette
    shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    shadowHover: '0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px'
  },
  borderRadius: {
    sm: '6px',
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

const ThemeContext = createContext<{
  theme: Theme;
}>({
  theme: universalTheme
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
            transition: 'all 0.2s ease',
            fontSize: '16px'
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
  const theme = universalTheme;

  return (
    <ThemeContext.Provider value={{ theme }}>
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

// Logo Component
const Logo: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { theme } = useTheme();
  
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: theme.spacing.sm,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.15s ease',
        borderRadius: theme.borderRadius.sm,
        padding: `${theme.spacing.xs} 0`
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.opacity = '0.8';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.opacity = '1';
        }
      }}
      title={onClick ? "Click to reset filters and sorting" : undefined}
    >
      <img 
        src="/icon/DialogDriveIcon.png" 
        alt="DialogDrive Icon"
        style={{
          width: '24px',
          height: '24px',
          display: 'block',
          objectFit: 'contain'
        }}
      />
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

  // Reset all filters and sorting to default state
  const resetToDefaults = () => {
    setSearchQuery('');
    setSelectedWorkspace('All');
    setSortBy('created');
    setSortOrder('desc');
    setShowPinnedOnly(false);
    addToast('🔄 View reset to defaults', 'info', 2000);
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
        
        /* Show action buttons on hover */
        div:hover .prompt-actions {
          opacity: 1 !important;
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
        <Logo onClick={resetToDefaults} />
        
        <div style={{ display: 'flex', gap: theme.spacing.xs, alignItems: 'center' }}>
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
              fontSize: '16px'
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
            ⚙️
          </button>
        </div>
      </header>

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        minHeight: '500px'
      }}>
        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : showForm ? (
          <div style={{ 
            padding: theme.spacing.lg,
            overflow: 'auto',
            flex: 1
          }}>
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
          </div>
        ) : (
          <>
            {/* Integrated Search and Controls */}
            <div style={{
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              backgroundColor: theme.colors.background,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.sm,
              position: 'relative',
              zIndex: 100
            }}>
              {/* Search Input with integrated actions */}
              <div style={{ 
                display: 'flex', 
                gap: theme.spacing.lg, // Golden ratio spacing - increased from sm to lg
                alignItems: 'center',
                position: 'relative',
                zIndex: 101
              }}>
                <div style={{ 
                  position: 'relative', 
                  flex: 1,
                  zIndex: 10
                }}>
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      paddingLeft: '36px',
                      backgroundColor: theme.colors.surface,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      color: theme.colors.text,
                      fontSize: theme.typography.fontSize.sm,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      zIndex: 1,
                      height: '36px', // Explicit height for consistency
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.backgroundColor = theme.colors.background;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border;
                      e.currentTarget.style.backgroundColor = theme.colors.surface;
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: theme.spacing.sm,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: theme.colors.textMuted,
                    pointerEvents: 'none',
                    fontSize: '14px',
                    zIndex: 2
                  }}>
                    🔍
                  </div>
                </div>

                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`, // Smaller padding for better proportion
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    border: `1px solid ${theme.colors.primary}`,
                    borderRadius: theme.borderRadius.sm, // Smaller border radius to match search
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.xs, // Smaller font size
                    fontWeight: theme.typography.fontWeight.medium,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px', // Tight gap between + and New
                    minWidth: '60px', // Reduced width
                    height: '32px', // Smaller height for better proportion
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(114, 169, 242, 0.15)',
                    position: 'relative',
                    zIndex: 200,
                    flexShrink: 0,
                    isolation: 'isolate'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                    e.currentTarget.style.borderColor = theme.colors.primaryHover;
                    e.currentTarget.style.transform = 'translateY(-0.5px)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(114, 169, 242, 0.2)';
                    e.currentTarget.style.zIndex = '300';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.primary;
                    e.currentTarget.style.borderColor = theme.colors.primary;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(114, 169, 242, 0.15)';
                    e.currentTarget.style.zIndex = '200';
                  }}
                >
                  + New
                </button>
              </div>

              {/* Compact Filter Controls */}
              <div style={{
                display: 'flex',
                gap: theme.spacing.xs,
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <select
                  value={selectedWorkspace}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.sm,
                    color: theme.colors.text,
                    fontSize: theme.typography.fontSize.xs,
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '80px'
                  }}
                >
                  <option value="All">All</option>
                  {workspaces.map(workspace => (
                    <option key={workspace} value={workspace}>
                      {workspace}
                    </option>
                  ))}
                </select>

                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                    setSortBy(sort);
                    setSortOrder(order);
                  }}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.borderRadius.sm,
                    color: theme.colors.text,
                    fontSize: theme.typography.fontSize.xs,
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '90px'
                  }}
                >
                  <option value="created-desc">Newest</option>
                  <option value="created-asc">Oldest</option>
                  <option value="title-asc">A-Z</option>
                  <option value="title-desc">Z-A</option>
                  <option value="usage-desc">Most Used</option>
                  <option value="lastUsed-desc">Recent</option>
                </select>

                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  style={{
                    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                    backgroundColor: showPinnedOnly ? theme.colors.primary : theme.colors.surface,
                    color: showPinnedOnly ? 'white' : theme.colors.textSecondary,
                    border: `1px solid ${showPinnedOnly ? theme.colors.primary : theme.colors.border}`,
                    borderRadius: theme.borderRadius.sm,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.xs,
                    fontWeight: theme.typography.fontWeight.medium,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📌
                  {showPinnedOnly ? 'Pinned' : 'All'}
                </button>

                {(searchQuery || selectedWorkspace !== 'All' || showPinnedOnly) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedWorkspace('All');
                      setShowPinnedOnly(false);
                    }}
                    style={{
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      backgroundColor: 'transparent',
                      color: theme.colors.textMuted,
                      border: 'none',
                      borderRadius: theme.borderRadius.sm,
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSize.xs,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.colors.textMuted;
                    }}
                    title="Clear all filters"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Prompts List */}
            <div style={{ 
              flex: 1, 
              overflow: 'auto',
              backgroundColor: theme.colors.background
            }}>
              {isLoading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  Loading prompts...
                </div>
              ) : filteredAndSortedPrompts.length === 0 ? (
                <div style={{ 
                  padding: theme.spacing.xl,
                  textAlign: 'center',
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  {searchQuery || selectedWorkspace !== 'All' || showPinnedOnly 
                    ? 'No prompts match your filters' 
                    : 'No prompts yet. Create your first one!'}
                </div>
              ) : (
                <div style={{ 
                  padding: theme.spacing.md,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.sm
                }}>
                  {filteredAndSortedPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      style={{
                        padding: theme.spacing.lg,
                        backgroundColor: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.borderRadius.md,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        boxShadow: theme.colors.shadow
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                        e.currentTarget.style.borderColor = theme.colors.borderHover;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = theme.colors.shadowHover;
                        // Show action buttons
                        const actionsEl = e.currentTarget.querySelector('.prompt-actions') as HTMLElement;
                        if (actionsEl) actionsEl.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.surface;
                        e.currentTarget.style.borderColor = theme.colors.border;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = theme.colors.shadow;
                        // Hide action buttons
                        const actionsEl = e.currentTarget.querySelector('.prompt-actions') as HTMLElement;
                        if (actionsEl) actionsEl.style.opacity = '0';
                      }}
                      onClick={() => handlePaste(prompt)}
                    >
                      {/* Header with title and actions */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: theme.spacing.sm
                      }}>
                        <div style={{ flex: 1, marginRight: theme.spacing.md }}>
                          <h3 style={{
                            fontWeight: theme.typography.fontWeight.semibold,
                            color: theme.colors.text,
                            margin: 0,
                            fontSize: theme.typography.fontSize.base,
                            lineHeight: '1.4',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs
                          }}>
                            {prompt.isPinned && (
                              <span style={{ 
                                fontSize: '14px' 
                              }}>📌</span>
                            )}
                            {prompt.title}
                          </h3>
                        </div>

                        {/* Action buttons - show on hover */}
                        <div 
                          className="prompt-actions"
                          style={{
                            display: 'flex',
                            gap: theme.spacing.xs,
                            opacity: 0,
                            transition: 'opacity 0.2s ease'
                          }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(prompt.id); }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: theme.borderRadius.sm,
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.background;
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={prompt.isPinned ? 'Unpin prompt' : 'Pin prompt'}
                          >
                            {prompt.isPinned ? '📌' : '📍'}
                          </button>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); editPrompt(prompt); }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: theme.borderRadius.sm,
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.background;
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Edit prompt"
                          >
                            ✏️
                          </button>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); deletePrompt(prompt.id); }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: theme.borderRadius.sm,
                              cursor: 'pointer',
                              fontSize: '16px',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.colors.background;
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Delete prompt"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Preview text */}
                      <p style={{
                        color: theme.colors.textSecondary,
                        fontSize: theme.typography.fontSize.sm,
                        margin: `0 0 ${theme.spacing.md} 0`,
                        lineHeight: '1.5',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {prompt.text}
                      </p>

                      {/* Meta information */}
                      <div style={{ 
                        display: 'flex', 
                        gap: theme.spacing.xs, 
                        alignItems: 'center', 
                        flexWrap: 'wrap' 
                      }}>
                        <span style={{
                          fontSize: theme.typography.fontSize.xs,
                          backgroundColor: theme.colors.primary,
                          color: 'white',
                          padding: `2px ${theme.spacing.xs}`,
                          borderRadius: theme.borderRadius.sm,
                          fontWeight: theme.typography.fontWeight.medium
                        }}>
                          {prompt.workspace}
                        </span>

                        {prompt.usageCount > 0 && (
                          <span style={{
                            fontSize: theme.typography.fontSize.xs,
                            backgroundColor: theme.colors.success,
                            color: 'white',
                            padding: `2px ${theme.spacing.xs}`,
                            borderRadius: theme.borderRadius.sm,
                            fontWeight: theme.typography.fontWeight.medium
                          }}>
                            {prompt.usageCount}×
                          </span>
                        )}

                        {prompt.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: theme.typography.fontSize.xs,
                              backgroundColor: theme.colors.background,
                              color: theme.colors.textSecondary,
                              border: `1px solid ${theme.colors.border}`,
                              padding: `1px ${theme.spacing.xs}`,
                              borderRadius: theme.borderRadius.sm
                            }}
                          >
                            {tag}
                          </span>
                        ))}

                        {prompt.tags.length > 2 && (
                          <span style={{
                            fontSize: theme.typography.fontSize.xs,
                            color: theme.colors.textMuted,
                            fontWeight: theme.typography.fontWeight.medium
                          }}>
                            +{prompt.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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