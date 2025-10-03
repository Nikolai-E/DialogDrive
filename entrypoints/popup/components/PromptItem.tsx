import { Edit2, Pin, Trash2 } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import type { Prompt } from '../../../types/prompt';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

interface PromptItemProps {
  prompt: Prompt;
}

export const PromptItem: React.FC<PromptItemProps> = React.memo(({ prompt }) => {
  const { setEditingPrompt, setCurrentView, deletePrompt, togglePinPrompt, incrementUsage } = useUnifiedStore();
  const { copyToClipboard } = useCopyToClipboard();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Get color based on workspace/category - using professional theme-aligned colors
  const getCategoryColor = (workspace: string): string => {
    const colors = {
      'General': 'hsl(215, 73%, 52%)',
      'Work': 'hsl(158, 61%, 40%)',
      'Personal': 'hsl(265, 73%, 52%)',
      'Development': 'hsl(25, 95%, 53%)',
      'Research': 'hsl(173, 73%, 40%)',
      'Writing': 'hsl(330, 73%, 52%)',
    };
    return colors[workspace as keyof typeof colors] || 'hsl(var(--muted-foreground))';
  };

  const isSupportedChatUrl = (url: string) => {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      return host.endsWith('chatgpt.com') || host.endsWith('claude.ai') || host.endsWith('gemini.google.com');
    } catch {
      return false;
    }
  };

  const buildPromptText = (p: Prompt): string => {
    let base = p.text;
    if (p.includeTimestamp) {
      const now = new Date();
      const ts = now.toISOString().replace('T', ' ').replace(/\..+/, '');
      base += `\n\n[Timestamp: ${ts}]`;
    }
    return base;
  };

  const handleCardClick = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Copy to clipboard first
      await copyToClipboard(buildPromptText(prompt));
      await incrementUsage(prompt.id);
      
      // Try to paste to active tab if on supported site
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url && isSupportedChatUrl(tab.url)) {
          const response = await browser.tabs.sendMessage(tab.id, { 
            type: 'PASTE_PROMPT', 
            text: buildPromptText(prompt) 
          }).catch((err) => {
            // Content script may not be injected yet
            console.warn('sendMessage failed, likely no content script', err);
            return undefined;
          });
          if (response?.success) {
            toast.success('Prompt pasted into chat');
            return;
          }
          // Provide actionable guidance
          toast.info('Copied. Open the input box and press Ctrl+V to paste.');
        }
      } catch (tabError) {
        console.warn('Could not paste to tab, copied to clipboard', tabError);
      }
      
      toast.success('Copied to clipboard');
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
      toast.success(prompt.isPinned ? 'Prompt unpinned' : 'Prompt pinned');
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
        toast.success('Prompt deleted');
      } catch (error) {
        toast.error('Failed to delete prompt');
      }
    }
  };

  return (
    <div className="mx-3 my-2" role="listitem">
      <button
        type="button"
        onClick={handleCardClick}
        className={cn(
          'w-full text-left select-none',
          'rounded-md px-4 py-3',
          'bg-white hover:bg-gray-50',
          'transition-colors focus:outline-none'
        )}
        aria-label={`Use prompt ${prompt.title}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground truncate">{prompt.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {prompt.workspace || 'General'}
              {prompt.tags && prompt.tags.length > 0 && (
                <span className="ml-1.5 text-muted-foreground/70">
                  • {prompt.tags.slice(0, 3).join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Action buttons */}
            <button
              type="button"
              aria-label={prompt.isPinned ? 'Unpin prompt' : 'Pin prompt'}
              onClick={handlePin}
              className={`${prompt.isPinned ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200' : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'} p-1.5 rounded-md transition-all duration-150`}
              title={prompt.isPinned ? 'Unpin prompt' : 'Pin prompt'}
            >
              <Pin className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Edit prompt"
              onClick={handleEdit}
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150"
              title="Edit prompt"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Delete prompt"
              onClick={handleDelete}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
              title="Delete prompt"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </button>
    </div>
  );
});
