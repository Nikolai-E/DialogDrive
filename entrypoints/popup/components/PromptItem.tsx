import React from 'react';
import type { Prompt } from '../../../types/prompt';
import { usePromptStore } from '../../../lib/promptStore';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { Pin, Edit, Trash2, Copy, Check, Clock, Mic, Loader2, ClipboardPaste } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface PromptItemProps {
  prompt: Prompt;
}

export const PromptItem: React.FC<PromptItemProps> = React.memo(({ prompt }) => {
  const { setEditingPrompt, setCurrentView, deletePrompt, togglePinPrompt, incrementUsage } = usePromptStore();
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const [copying, setCopying] = React.useState(false);
  const [pasting, setPasting] = React.useState(false);

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

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      // Use the hook's copyToClipboard which handles the toast
      await copyToClipboard(prompt.text);
      await incrementUsage(prompt.id);
    } catch (error) {
      toast.error('Failed to copy prompt');
    } finally {
      setCopying(false);
    }
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
    if (pasting) return;
    setPasting(true);
    try {
      let transformedText = prompt.text;
      if (prompt.includeTimestamp) {
        transformedText = `[${new Date().toLocaleString()}] ${transformedText}`;
      }
      if (prompt.includeVoiceTag) {
        transformedText = `${transformedText}\n\n[Response tone: conversational]`;
      }

      // Try to paste to active tab first
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const response = await browser.tabs.sendMessage(tab.id, { 
            type: 'PASTE_PROMPT', 
            text: transformedText 
          });
          if (response?.success) {
            await incrementUsage(prompt.id);
            toast.success('Pasted to active tab');
            return;
          }
        }
      } catch (tabError) {
        console.warn('Failed to paste to tab, falling back to clipboard:', tabError);
      }
      
      // Fallback to clipboard
      await navigator.clipboard.writeText(transformedText);
      await incrementUsage(prompt.id);
      toast.info('Copied to clipboard as fallback');
    } catch (error) {
      console.error('Paste error:', error);
      toast.error('Failed to paste or copy');
    } finally {
      setPasting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -1, boxShadow: '0 2px 8px hsla(var(--foreground) / 0.08)' }}
      transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
      className="group relative bg-card rounded-lg p-3 border border-border/80 shadow-sm hover:border-border transition-all duration-150"
    >
      {/* Pin Indicator */}
      <AnimatePresence>
        {prompt.isPinned && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute -top-1.5 -left-1.5"
          >
            <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center border-2 border-background">
              <Pin className="h-2.5 w-2.5 text-accent-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with workspace and actions */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-sm text-foreground truncate">{prompt.title}</h3>
          <p className="text-xs text-muted-foreground">{prompt.workspace || 'General'}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-card rounded-full border border-border/50 p-0.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePin}>
                  <Pin className={`h-3.5 w-3.5 ${prompt.isPinned ? 'text-accent' : 'text-muted-foreground'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>{prompt.isPinned ? 'Unpin' : 'Pin'}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEdit}>
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Edit</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive/80" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Prompt Text */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {prompt.text}
      </p>

      {/* Tags and metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {prompt.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="px-2 py-0.5 text-xs rounded-md">{tag}</Badge>
          ))}
          {(prompt.tags?.length || 0) > 2 && (
            <span className="text-xs">+{(prompt.tags?.length || 0) - 2}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{prompt.usageCount || 0} uses</span>
          </div>
          {prompt.includeTimestamp && <Clock className="h-3 w-3" />}
          {prompt.includeVoiceTag && <Mic className="h-3 w-3" />}
        </div>
      </div>

      <Separator className="my-3" />

      {/* Footer Actions */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={handlePaste}
          disabled={pasting}
          className="flex-1 h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all"
        >
          {pasting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Pasting...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-3 w-3" />
              Paste
            </div>
          )}
        </Button>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 flex-shrink-0 rounded-lg border-border hover:bg-accent hover:text-accent-foreground transition-all"
                onClick={handleCopy}
                disabled={copying}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={copying ? "loading" : (isCopied ? "check" : "copy")}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.08 }}
                  >
                    {copying ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isCopied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{copying ? 'Copying...' : 'Copy to Clipboard'}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
});
