import React, { useState, useEffect } from 'react';
import { usePromptStore } from '~/lib/promptStore';
import type { Prompt } from '~/types/prompt';

export const PromptForm: React.FC = () => {
  const { activePromptId, prompts, addPrompt, updatePrompt, setActivePromptId } = usePromptStore();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [includeVoiceTag, setIncludeVoiceTag] = useState(false);

  const activePrompt = prompts.find((p) => p.id === activePromptId);

  useEffect(() => {
    if (activePrompt) {
      setTitle(activePrompt.title);
      setText(activePrompt.text);
      setIncludeTimestamp(activePrompt.includeTimestamp);
      setIncludeVoiceTag(activePrompt.includeVoiceTag);
    } else {
      // Reset form when there's no active prompt
      setTitle('');
      setText('');
      setIncludeTimestamp(false);
      setIncludeVoiceTag(false);
    }
  }, [activePrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    const promptData = {
      title,
      text,
      includeTimestamp,
      includeVoiceTag,
    };

    if (activePrompt) {
      updatePrompt({ ...activePrompt, ...promptData });
    } else {
      addPrompt(promptData);
    }
    
    // Reset form and active prompt
    setActivePromptId(null);
  };

  const handleCancel = () => {
    setActivePromptId(null);
  };

  return (
    <div style={{ 
      padding: '16px', 
      backgroundColor: '#1e293b', 
      borderTop: '1px solid #374151' 
    }}>
      <h2 style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        marginBottom: '12px', 
        color: 'white', 
        margin: '0 0 12px 0' 
      }}>
        {activePrompt ? 'Edit Prompt' : 'Add New Prompt'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label 
            htmlFor="title" 
            style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#d1d5db', 
              marginBottom: '4px' 
            }}
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., 'Summarize Article'"
            required
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              border: '1px solid #4b5563',
              borderRadius: '6px',
              padding: '8px 12px',
              color: 'white',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div>
          <label 
            htmlFor="text" 
            style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#d1d5db', 
              marginBottom: '4px' 
            }}
          >
            Prompt Text
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={4}
            required
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              border: '1px solid #4b5563',
              borderRadius: '6px',
              padding: '8px 12px',
              color: 'white',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              id="include-timestamp"
              type="checkbox"
              checked={includeTimestamp}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              style={{
                height: '16px',
                width: '16px',
                marginRight: '8px'
              }}
            />
            <label htmlFor="include-timestamp" style={{ fontSize: '14px', color: '#d1d5db' }}>
              Include Timestamp
            </label>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              id="include-voice-tag"
              type="checkbox"
              checked={includeVoiceTag}
              onChange={(e) => setIncludeVoiceTag(e.target.checked)}
              style={{
                height: '16px',
                width: '16px',
                marginRight: '8px'
              }}
            />
            <label htmlFor="include-voice-tag" style={{ fontSize: '14px', color: '#d1d5db' }}>
              Include Voice Tag
            </label>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {activePrompt && (
            <button 
              type="button" 
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#4b5563',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          )}
          <button 
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {activePrompt ? 'Save Changes' : 'Add Prompt'}
          </button>
        </div>
      </form>
    </div>
  );
};
