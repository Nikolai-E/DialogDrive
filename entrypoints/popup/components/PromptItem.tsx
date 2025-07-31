import React from 'react';
import type { Prompt } from '../../../types/prompt';
import { usePromptStore } from '../../../lib/promptStore';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { Pin, Edit, Trash2, Copy, Check, Clock, Mic } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface PromptItemProps {
  prompt: Prompt;
}

export const PromptItem: React.FC<PromptItemProps> = React.memo(({ prompt }) => {
  const { setEditingPrompt, setCurrentView, deletePrompt, togglePinPrompt } = usePromptStore();
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const handleEdit = () => {
    setEditingPrompt(prompt);
    setCurrentView('form');
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      try {
        await deletePrompt(prompt.id);
        toast.success('Prompt deleted');
      } catch (error) {
        toast.error('Failed to delete prompt');
      }
    }
  };

  const handleCopy = () => {
    copyToClipboard(prompt.text);
    toast.success('Prompt text copied!');
  };

  const handlePin = async () => {
    try {
      await togglePinPrompt(prompt.id);
      toast.info(prompt.isPinned ? 'Prompt unpinned' : 'Prompt pinned');
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };

  const handlePaste = async () => {
    try {
      let transformedText = prompt.text;
      if (prompt.includeTimestamp) {
        transformedText = `[${new Date().toLocaleString()}] ${transformedText}`;
      }
      if (prompt.includeVoiceTag) {
        transformedText = `${transformedText}\n\n[Response tone: conversational]`;
      }

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await browser.tabs.sendMessage(tab.id, { 
          type: 'PASTE_PROMPT', 
          text: transformedText 
        });
        if (response?.success) {
          toast.success('Pasted to active tab');
          return;
        }
      }
      
      await navigator.clipboard.writeText(transformedText);
      toast.info('Copied to clipboard as fallback');
    } catch (error) {
      toast.error('Failed to paste or copy');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white rounded-2xl p-4 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
    >
      {/* Header with workspace and pin */}
      <div className="flex items-center justify-between mb-3">
        <Badge 
          variant="secondary" 
          className="bg-blue-50 text-blue-600 text-xs font-medium px-2.5 py-1 rounded-full border-0"
        >
          {prompt.workspace || 'General'}
        </Badge>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-gray-50 rounded-full"
            onClick={handlePin}
          >
            <Pin className={`h-3.5 w-3.5 ${prompt.isPinned ? 'text-amber-500 fill-current' : 'text-gray-400'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-gray-50 rounded-full"
            onClick={handleEdit}
          >
            <Edit className="h-3.5 w-3.5 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-red-50 hover:text-red-500 rounded-full"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2 leading-snug text-sm">
        {prompt.title}
      </h3>

      {/* Preview text */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
        {prompt.text}
      </p>

      {/* Tags */}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {prompt.tags.slice(0, 2).map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
          {prompt.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{prompt.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Action button */}
      <Button
        onClick={handleCopy}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium shadow-sm"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isCopied ? 'check' : 'copy'}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{isCopied ? 'Copied!' : 'Copy & Use'}</span>
          </motion.div>
        </AnimatePresence>
      </Button>
    </motion.div>
  );
});
