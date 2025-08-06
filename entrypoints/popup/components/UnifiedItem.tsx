import React from 'react';
// Use whichever tabs API is available (browser or chrome)
const api = (window as any).browser ?? (window as any).chrome;

import type { WorkspaceItem } from '../../../types/chat';
import type { Prompt } from '../../../types/prompt';
import type { ChatBookmark } from '../../../types/chat';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { ChatStorage } from '../../../lib/chatStorage';
import { Pin, Edit2, Trash2, ExternalLink, MessageSquare, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface UnifiedItemProps {
  item: WorkspaceItem;
}

// simple debounce utility scoped to component instance
const useClickDebounce = (delay = 200) => {
  const t = React.useRef<number | null>(null);
  return () => {
    if (t.current) return true; // busy
    t.current = window.setTimeout(() => { t.current && clearTimeout(t.current); t.current = null; }, delay) as unknown as number;
    return false;
  };
};

// shallow compare helper for primitives/flat props we care about
const areUnifiedItemPropsEqual = (prev: Readonly<UnifiedItemProps>, next: Readonly<UnifiedItemProps>) => {
  const a = prev.item; const b = next.item;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.type === b.type &&
    a.isPinned === b.isPinned &&
    a.workspace === b.workspace &&
    (a as any).usageCount === (b as any).usageCount &&
    a.lastUsed === b.lastUsed
  );
};

export const UnifiedItem: React.FC<UnifiedItemProps> = React.memo(({ item }) => {
  const { 
    setEditingPrompt, 
    setEditingChat,
    setCurrentView, 
    deletePrompt, 
    deleteChat,
    togglePinPrompt, 
    togglePinChat,
    incrementUsage,
    incrementChatAccess
  } = useUnifiedStore();

  const handleCardClick = async () => {
    console.log('Card clicked!', item.type);
    
    if (item.type === 'prompt') {
      const prompt = item.data as Prompt;
      console.log('Copying text:', prompt.text);
      
      try {
        await navigator.clipboard.writeText(prompt.text);
        toast.success('📋 Copied!');
        await incrementUsage(prompt.id);
      } catch (err) {
        console.error('Copy failed:', err);
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = prompt.text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('📋 Copied!');
        await incrementUsage(prompt.id);
      }
    } else if (item.type === 'chat') {
      const chat = item.data as ChatBookmark;
      if (api && api.tabs) {
        api.tabs.create({ url: chat.url });
        await incrementChatAccess(chat.id);
        toast.success('🔗 Chat opened');
      }
    }
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (item.type === 'prompt') {
        await togglePinPrompt(item.id);
      } else {
        await togglePinChat(item.id);
      }
      toast.success(item.isPinned ? '📌 Unpinned' : '📌 Pinned');
    } catch {
      toast.error('Failed to update pin status');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'prompt') {
      setEditingPrompt(item.data as Prompt);
      setCurrentView('form');
    } else {
      setEditingChat(item.data as ChatBookmark);
      setCurrentView('chat-form');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const itemType = item.type === 'prompt' ? 'prompt' : 'chat bookmark';
    if (window.confirm(`Delete this ${itemType}?`)) {
      try {
        if (item.type === 'prompt') {
          await deletePrompt(item.id);
        } else {
          await deleteChat(item.id);
        }
        toast.success(`🗑️ ${itemType} deleted`);
      } catch {
        toast.error(`Failed to delete ${itemType}`);
      }
    }
  };

  const getTypeIcon = () => {
    if (item.type === 'prompt') {
      return <FileText className="w-3 h-3 text-accent" />;
    } else {
      const chat = item.data as ChatBookmark;
      const platformIcons: Record<string, string> = { chatgpt: '🤖', gemini: '💎', claude: '🧠' };
      const { urlType, isOwnerOnly } = ChatStorage.parseUrl(chat.url);
      const isShareLink = !isOwnerOnly;
      return (
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-secondary" />
          <span className="text-[11px] leading-4">{platformIcons[chat.platform]}</span>
          {isShareLink ? (
            <span className="text-[10px] leading-4 text-accent bg-accent/10 px-1 rounded" title="Public share link - works without login">🔗</span>
          ) : (
            <span className="text-[10px] leading-4 text-destructive bg-destructive/10 px-1 rounded" title="Private conversation - requires login">🔒</span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="mx-2 my-0.5" role="button" tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div
        className={cn(
          'relative rounded-md px-2.5 py-2 select-none border border-border/60',
          'bg-card hover:bg-card/80',
          'transition-colors'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* title and meta should truncate cleanly */}
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-foreground truncate">{item.title}</div>
            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
              {getTypeIcon()}
              <span className="truncate">{item.workspace || 'General'}</span>
            </div>
          </div>
          {/* right-side actions remain aligned */}
          <div className="flex items-center gap-0.5 shrink-0">
            {item.isPinned && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePin}
              aria-label={item.isPinned ? `Unpin ${item.type}` : `Pin ${item.type}`}
              className={cn(
                'h-7 w-7 p-0 transition-opacity duration-150 rounded-md',
                item.isPinned 
                  ? 'text-accent bg-accent/10 hover:bg-accent/20 border border-accent/20' 
                  : 'text-muted-foreground hover:text-accent hover:bg-accent/10'
              )}
              title={item.isPinned ? `Unpin ${item.type}` : `Pin ${item.type}`}
            >
              <Pin className="w-3.5 h-3.5" />
            </Button>
            {item.type === 'chat' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  const chat = item.data as ChatBookmark;
                  api.tabs.create({ url: chat.url });
                  try { await incrementChatAccess(chat.id); } catch { toast.error('Failed to update chat access count'); }
                }}
                aria-label="Open chat in new tab"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-opacity duration-150 rounded-md"
                title="Open chat in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              aria-label={`Edit ${item.type}`}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-opacity duration-150 rounded-md"
              title={`Edit ${item.type}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              aria-label={`Delete ${item.type}`}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity duration-150 rounded-md"
              title={`Delete ${item.type}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}, areUnifiedItemPropsEqual);
