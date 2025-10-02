import React from 'react';
// Use whichever tabs API is available (browser or chrome)
const api = (window as any).browser ?? (window as any).chrome;

import { Edit2, ExternalLink, FileText, MessageSquare, Pin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { ChatStorage } from '../../../lib/chatStorage';
import { logger } from '../../../lib/logger';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { cn } from '../../../lib/utils';
import type { ChatBookmark, WorkspaceItem } from '../../../types/chat';
import type { Prompt } from '../../../types/prompt';

interface UnifiedItemProps {
  item: WorkspaceItem;
}

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
    logger.debug('Card clicked', item.type);

    if (item.type === 'prompt') {
      const prompt = item.data as Prompt;
      const buildText = () => {
        let txt = prompt.text;
        if (prompt.includeTimestamp) {
          const now = new Date();
          const ts = now.toISOString().replace('T', ' ').replace(/\..+/, '');
          txt += `\n\n[Timestamp: ${ts}]`;
        }
        return txt;
      };
      const finalText = buildText();
      logger.debug('Pasting to active tab (len)', finalText.length);
      // Prefer pasting into the active tab via content script; fallback to clipboard
      try {
        const tabs = await (window as any).browser?.tabs?.query({ active: true, currentWindow: true })
          ?? await api.tabs?.query({ active: true, currentWindow: true });
        const tabId = tabs && tabs[0] && tabs[0].id;
        if (tabId) {
          try {
            await (window as any).browser?.tabs?.sendMessage(tabId, { type: 'PASTE_PROMPT', text: finalText })
              ?? await api.tabs?.sendMessage(tabId, { type: 'PASTE_PROMPT', text: finalText });
            toast.success('Prompt pasted into chat');
            await incrementUsage(prompt.id);
            return;
          } catch (e) {
            logger.warn('Active tab paste failed, falling back to clipboard', e);
          }
        }
      } catch (e) {
        logger.warn('Unable to message active tab, falling back to clipboard', e);
      }

      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(finalText);
        toast.success('Copied to clipboard');
        await incrementUsage(prompt.id);
      } catch (err) {
        logger.error('Clipboard API failed, using execCommand fallback:', err);
        const textArea = document.createElement('textarea');
        textArea.value = finalText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Copied to clipboard');
        await incrementUsage(prompt.id);
      }
    } else if (item.type === 'chat') {
      const chat = item.data as ChatBookmark;
      if (api && api.tabs) {
        api.tabs.create({ url: chat.url });
        await incrementChatAccess(chat.id);
        toast.success('Chat opened in new tab');
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
      toast.success(item.isPinned ? 'Item unpinned' : 'Item pinned');
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
        toast.success(`${itemType} deleted`);
      } catch {
        toast.error(`Failed to delete ${itemType}`);
      }
    }
  };

  const renderChatMeta = () => {
    if (item.type !== 'chat') return null;
    const chat = item.data as ChatBookmark;
    const platformNames: Record<string, string> = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude', deepseek: 'DeepSeek' };
    const { isOwnerOnly } = ChatStorage.parseUrl(chat.url);
    const isShareLink = !isOwnerOnly;

    return (
      <>
        <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--surface-subtle))] px-2.5 py-0.5 text-[11px] text-muted-foreground/80">
          {platformNames[chat.platform] || chat.platform}
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
            isShareLink ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
          )}
          title={isShareLink ? 'Public share link - works without login' : 'Private conversation - requires login'}
        >
          {isShareLink ? 'Public' : 'Private'}
        </span>
      </>
    );
  };

  return (
    <div
      className="px-0 py-0"
      role="button"
      tabIndex={0}
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
          'group rounded-[var(--radius)] border border-border/70 bg-[hsl(var(--card))] px-3.5 py-1.5 transition-all duration-150 shadow-[0_1px_1px_rgba(15,23,42,0.05)]',
          'hover:border-border/60 hover:bg-[hsl(var(--card))] hover:shadow-[0_5px_14px_rgba(15,23,42,0.14)]'
        )}
      >
        {/* Row 1: Icon + Title + Pin + Open */}
        <div className="flex items-center gap-2.25 mb-1.5">
          <div className="flex-shrink-0">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              {item.type === 'prompt' ? (
                <FileText className="h-3 w-3" />
              ) : (
                <MessageSquare className="h-3 w-3" />
              )}
            </span>
          </div>
          
          <span className="truncate text-[12.5px] font-semibold text-foreground/95 flex-1 min-w-0">{item.title}</span>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePin}
              aria-label={item.isPinned ? `Unpin ${item.type}` : `Pin ${item.type}`}
              className={cn(
                'h-6 w-6 rounded-full text-muted-foreground transition-colors',
                item.isPinned && 'bg-primary/10 text-primary'
              )}
              title={item.isPinned ? `Unpin ${item.type}` : `Pin ${item.type}`}
            >
              <Pin className="h-3 w-3" />
            </Button>
            {item.type === 'chat' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={async (e) => {
                  e.stopPropagation();
                  const chat = item.data as ChatBookmark;
                  api.tabs.create({ url: chat.url });
                  try {
                    await incrementChatAccess(chat.id);
                  } catch {
                    toast.error('Failed to update chat access count');
                  }
                }}
                aria-label="Open chat in new tab"
                className="h-6 w-6 rounded-full text-muted-foreground transition-colors hover:text-foreground"
                title="Open chat in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Tags/Workspace + Edit + Delete */}
        <div className="flex items-center gap-2.25">
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground flex-1 min-w-0">
            {item.isPinned && (
              <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground shrink-0">Pinned</span>
            )}
            <span className="inline-flex items-center rounded-full border border-border/70 bg-[hsl(var(--surface-subtle))] px-2 py-0.5 text-[10.5px] text-muted-foreground/80 whitespace-nowrap">
              {item.workspace || 'General'}
            </span>
            {item.type === 'chat' ? (
              renderChatMeta()
            ) : (
              <span className="text-muted-foreground/80 whitespace-nowrap">Prompt</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              aria-label={`Edit ${item.type}`}
              className="h-6 w-6 rounded-full text-muted-foreground transition-colors hover:text-foreground"
              title={`Edit ${item.type}`}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              aria-label={`Delete ${item.type}`}
              className="h-6 w-6 rounded-full text-muted-foreground transition-colors hover:text-destructive"
              title={`Delete ${item.type}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}, areUnifiedItemPropsEqual);
