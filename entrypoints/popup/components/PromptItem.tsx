import React from 'react';
import type { Prompt } from '../../../types/prompt';
import { usePromptStore } from '../../../lib/promptStore';
import { Pin, Edit2, Trash2 } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { toast } from 'sonner';

interface PromptItemProps {
  prompt: Prompt;
}

export const PromptItem: React.FC<PromptItemProps> = React.memo(({ prompt }) => {
  const { setEditingPrompt, setCurrentView, deletePrompt, togglePinPrompt, incrementUsage } = usePromptStore();
  const { copyToClipboard } = useCopyToClipboard();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Get color based on workspace/category
  const getCategoryColor = (workspace: string): string => {
    const colors = {
      'General': '#3b82f6',     // blue-500
      'Work': '#10b981',        // green-500
      'Personal': '#8b5cf6',    // purple-500
      'Development': '#f97316', // orange-500
      'Research': '#14b8a6',    // teal-500
      'Writing': '#ec4899',     // pink-500
    };
    return colors[workspace as keyof typeof colors] || '#6b7280'; // gray-500
  };

  const handleCardClick = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Copy to clipboard first
      await copyToClipboard(prompt.text);
      await incrementUsage(prompt.id);
      
      // Try to paste to active tab if on supported site
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url) {
          const isSupportedSite = tab.url.includes('chatgpt.com') || 
                                  tab.url.includes('claude.ai') || 
                                  tab.url.includes('gemini.google.com');
          
          if (isSupportedSite) {
            const response = await browser.tabs.sendMessage(tab.id, { 
              type: 'PASTE_PROMPT', 
              text: prompt.text 
            });
            if (response?.success) {
              toast.success('✨ Pasted to active tab');
              return;
            }
          }
        }
      } catch (tabError) {
        console.warn('Could not paste to tab, copied to clipboard');
      }
      
      toast.success('📋 Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await togglePinPrompt(prompt.id);
      toast.success(prompt.isPinned ? '📌 Unpinned' : '📌 Pinned');
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setCurrentView('form');
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${prompt.title}"?`)) {
      try {
        await deletePrompt(prompt.id);
        toast.success('🗑️ Prompt deleted');
      } catch (error) {
        toast.error('Failed to delete prompt');
      }
    }
  };

  return (
    <div className="group border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-150">
      <div 
        className={`relative flex items-center min-h-[52px] px-4 py-3 cursor-pointer
          ${isProcessing ? 'animate-pulse bg-blue-50' : ''}
        `}
        onClick={handleCardClick}
        style={{
          borderLeft: `4px solid ${getCategoryColor(prompt.workspace)}`
        }}
      >
        {/* Pin indicator */}
        {prompt.isPinned && (
          <div className="absolute top-2 left-1 w-2 h-2 bg-yellow-400 rounded-full shadow-sm"></div>
        )}
        
        {/* Main content */}
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold text-gray-900 truncate flex-1">
              {prompt.title}
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded shrink-0">
              {prompt.workspace || 'General'}
            </span>
          </div>
          
          {/* Tags and stats */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex gap-1 min-w-0">
                  {prompt.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium shrink-0">
                      {tag}
                    </span>
                  ))}
                  {prompt.tags.length > 3 && (
                    <span className="text-gray-400 font-medium shrink-0">+{prompt.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-gray-500 shrink-0">
              <span className="flex items-center gap-1 font-medium">
                <div className="w-2 h-2 rounded-full bg-blue-200"></div>
                {prompt.usageCount || 0}
              </span>
              {prompt.lastUsed && (
                <span className="font-medium">{new Date(prompt.lastUsed).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons - float above without affecting layout */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-gray-200 z-10">
          <button
            onClick={handlePin}
            className={`p-1.5 rounded-md transition-all duration-150 ${
              prompt.isPinned 
                ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200' 
                : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
            }`}
            title={prompt.isPinned ? 'Unpin prompt' : 'Pin prompt'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150"
            title="Edit prompt"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
            title="Delete prompt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
