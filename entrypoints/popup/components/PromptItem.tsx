import React from 'react';
import type { Prompt } from '~/types/prompt';
import { usePromptStore } from '~/lib/promptStore';
import { showToast } from './ToastProvider';
import { PencilIcon, TrashIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface PromptItemProps {
  prompt: Prompt;
}

export const PromptItem: React.FC<PromptItemProps> = React.memo(({ prompt }) => {
  const { setActivePromptId, deletePrompt, togglePin } = usePromptStore();

  const handleEdit = () => {
    setActivePromptId(prompt.id);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      try {
        await deletePrompt(prompt.id);
        showToast.success('Prompt deleted successfully');
      } catch (error) {
        showToast.error('Failed to delete prompt');
      }
    }
  };

  const handleTogglePin = async () => {
    try {
      await togglePin(prompt.id);
      showToast.info(prompt.isPinned ? 'Prompt unpinned' : 'Prompt pinned');
    } catch (error) {
      showToast.error('Failed to update pin status');
    }
  };

  const handlePaste = async () => {
    try {
      // Transform the prompt text based on settings
      let transformedText = prompt.text;
      
      if (prompt.includeTimestamp) {
        const timestamp = new Date().toLocaleString();
        transformedText = `[${timestamp}] ${transformedText}`;
      }
      
      if (prompt.includeVoiceTag) {
        transformedText = `${transformedText}\n\n[Please respond in a conversational, voice-friendly tone]`;
      }

      // Try to send to content script for direct pasting
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');
      
      const response = await browser.tabs.sendMessage(tab.id, { 
        type: 'PASTE_PROMPT', 
        text: transformedText 
      });
      
      if (response?.ok) {
        showToast.success('Prompt pasted successfully!');
        return;
      }
      
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(transformedText);
      showToast.info('Prompt copied to clipboard');
    } catch (error) {
      // Final fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(prompt.text);
        showToast.info('Prompt copied to clipboard - paste manually');
      } catch (clipboardError) {
        showToast.error('Failed to copy prompt');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0" onClick={handlePaste}>
          <div className="flex items-center gap-2 mb-2">
            {prompt.isPinned && (
              <span className="text-blue-500 text-sm">📌</span>
            )}
            <h3 className="font-semibold text-gray-800 truncate">
              {prompt.title}
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {prompt.text}
          </p>
          
          {/* Meta information */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {prompt.workspace}
            </span>
            
            {prompt.usageCount > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                {prompt.usageCount}× used
              </span>
            )}
            
            <span>
              Created {formatDate(prompt.created)}
            </span>
            
            {prompt.lastUsed && (
              <span>
                Last used {formatDate(prompt.lastUsed)}
              </span>
            )}
          </div>
          
          {/* Tags */}
          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {prompt.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
              {prompt.tags.length > 3 && (
                <span className="text-xs text-gray-500 px-1">
                  +{prompt.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Action buttons - show on hover */}
        <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePaste();
            }}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Paste to active tab"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin();
            }}
            className={`p-2 rounded transition-colors ${
              prompt.isPinned
                ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title={prompt.isPinned ? 'Unpin prompt' : 'Pin prompt'}
          >
            {prompt.isPinned ? '📌' : '📍'}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
            title="Edit prompt"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete prompt"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
