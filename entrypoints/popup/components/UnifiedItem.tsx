import React from 'react';
import type { WorkspaceItem } from '../../../types/chat';
import type { Prompt } from '../../../types/prompt';
import type { ChatBookmark } from '../../../types/chat';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { ChatStorage } from '../../../lib/chatStorage';
import { Pin, Edit2, Trash2, ExternalLink, MessageSquare, FileText } from 'lucide-react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { toast } from 'sonner';

interface UnifiedItemProps {
  item: WorkspaceItem;
}

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
  
  const { copyToClipboard } = useCopyToClipboard();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Get color based on workspace/category (locked specification)
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
      if (item.type === 'prompt') {
        // Existing prompt logic - copy/paste
        const prompt = item.data as Prompt;
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
      } else if (item.type === 'chat') {
        // New chat logic - open in new tab
        const chat = item.data as ChatBookmark;
        window.open(chat.url, '_blank');
        await incrementChatAccess(chat.id);
        toast.success('🔗 Chat opened in new tab');
      }
    } catch (error) {
      toast.error(`Failed to ${item.type === 'prompt' ? 'copy' : 'open chat'}`);
    } finally {
      setIsProcessing(false);
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
    } catch (error) {
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
      } catch (error) {
        toast.error(`Failed to delete ${itemType}`);
      }
    }
  };

  const getTypeIcon = () => {
    if (item.type === 'prompt') {
      return <FileText className="w-3 h-3 text-blue-600" />;
    } else {
      const chat = item.data as ChatBookmark;
      const platformIcons = {
        chatgpt: '🤖',
        gemini: '💎', 
        claude: '🧠'
      };
      
      // Parse URL to check if it's a share link or conversation link
      const { urlType, isOwnerOnly } = ChatStorage.parseUrl(chat.url);
      const isShareLink = !isOwnerOnly;
      
      return (
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-green-600" />
          <span className="text-xs">{platformIcons[chat.platform]}</span>
          {isShareLink && (
            <span 
              className="text-xs text-blue-600 bg-blue-100 px-1 rounded"
              title="Public share link - works without login"
            >
              🔗
            </span>
          )}
          {!isShareLink && (
            <span 
              className="text-xs text-orange-600 bg-orange-100 px-1 rounded"
              title="Private conversation - requires login"
            >
              🔒
            </span>
          )}
        </div>
      );
    }
  };

  // LOCKED SPECIFICATION: Maintain exact layout and dimensions
  return (
    <div className="group border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors duration-200 ease-apple">
      <div 
        className={`relative flex items-center min-h-[52px] px-4 py-3 cursor-pointer transition-all duration-200 ease-apple
          ${isProcessing ? 'animate-pulse bg-blue-50' : ''}
          hover:shadow-sm
        `}
        onClick={handleCardClick}
        style={{
          borderLeft: `4px solid ${getCategoryColor(item.workspace)}`
        }}
      >
        {/* Pin indicator - LOCKED SPECIFICATION */}
        {item.isPinned && (
          <div className="absolute top-2 left-1 w-2 h-2 bg-yellow-400 rounded-full shadow-sm"></div>
        )}
        
        {/* Subtle activity indicator - Google-inspired */}
        {!item.isPinned && (
          <div 
            className="absolute top-2 left-1 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: item.usageCount > 10 ? '#34A853' : item.usageCount > 5 ? '#FBBC04' : '#4285F4'
            }}
            title={`${item.usageCount} uses`}
          ></div>
        )}
        
        {/* Main content - LOCKED SPECIFICATION */}
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getTypeIcon()}
              <h3 className="text-base font-semibold text-gray-900 truncate flex-1">
                {item.title}
              </h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded shrink-0">
              {item.workspace || 'General'}
            </span>
          </div>
          
          {/* Tags and stats - LOCKED SPECIFICATION */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 min-w-0">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium shrink-0">
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="text-gray-400 font-medium shrink-0">+{item.tags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-gray-500 shrink-0">
              <span className="flex items-center gap-1 font-medium">
                <div className="w-2 h-2 rounded-full bg-blue-200"></div>
                {item.usageCount || 0}
              </span>
              {item.lastUsed && (
                <span className="font-medium">{new Date(item.lastUsed).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons - LOCKED SPECIFICATION: float above without affecting layout */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-apple bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-gray-200 z-10">
          <button
            onClick={handlePin}
            className={`p-1.5 rounded-md transition-all duration-200 ease-apple hover:scale-105 active:scale-95 ${
              item.isPinned 
                ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200' 
                : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
            }`}
            title={item.isPinned ? `Unpin ${item.type}` : `Pin ${item.type}`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          
          {item.type === 'chat' && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const chat = item.data as ChatBookmark;
                window.open(chat.url, '_blank');
                try {
                  await incrementChatAccess(chat.id);
                } catch (error) {
                  toast.error('Failed to update chat access count');
                }
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all duration-200 ease-apple hover:scale-105 active:scale-95"
              title="Open chat in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-apple hover:scale-105 active:scale-95"
            title={`Edit ${item.type}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ease-apple hover:scale-105 active:scale-95"
            title={`Delete ${item.type}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Processing overlay - LOCKED SPECIFICATION */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              {item.type === 'prompt' ? 'Processing...' : 'Opening...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
