import React from 'react';
import type { Prompt } from '~/types/prompt';
import { usePromptStore } from '~/lib/promptStore';
import { PencilIcon, TrashIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface PromptItemProps {
  prompt: Prompt;
}

export const PromptItem: React.FC<PromptItemProps> = ({ prompt }) => {
  const { setActivePromptId, deletePrompt } = usePromptStore();

  const handleEdit = () => {
    setActivePromptId(prompt.id);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      deletePrompt(prompt.id);
    }
  };

  const handlePaste = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');
      const response = await browser.tabs.sendMessage(tab.id, { type: 'PASTE_PROMPT', text: prompt.text });
      if (response?.ok) return;
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(prompt.text);
      alert('Prompt copied to clipboard. Please paste it manually.');
    } catch (e) {
      await navigator.clipboard.writeText(prompt.text);
      alert('Prompt copied to clipboard. Please paste it manually.');
    }
  };

  return (
    <div 
      style={{
        padding: '12px',
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        transition: 'background-color 0.2s',
        cursor: 'pointer'
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#334155'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: '600', color: '#f1f5f9', margin: '0 0 4px 0' }}>
            {prompt.title}
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#94a3b8', 
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {prompt.text}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
          <button 
            onClick={handlePaste} 
            style={{
              padding: '6px',
              color: '#94a3b8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <ClipboardDocumentIcon style={{ height: '20px', width: '20px' }} />
          </button>
          <button 
            onClick={handleEdit} 
            style={{
              padding: '6px',
              color: '#94a3b8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <PencilIcon style={{ height: '20px', width: '20px' }} />
          </button>
          <button 
            onClick={handleDelete} 
            style={{
              padding: '6px',
              color: '#94a3b8',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <TrashIcon style={{ height: '20px', width: '20px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};
