import { ArrowLeft, Link, Save, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { AddChatBookmark } from '../../../types/chat';
import TagSelect from './TagSelect';
import WorkspaceSelect from './WorkspaceSelect';

export const ChatForm: React.FC = () => {
  const { 
    editingChat, 
    setEditingChat, 
    setCurrentView, 
    addChat, 
    updateChat,
  workspaces,
  allTags,
  deleteTag
  } = useUnifiedStore();

  const [formData, setFormData] = useState<AddChatBookmark>({
    title: '',
    url: '',
    platform: 'chatgpt',
    workspace: 'General',
  // description removed
    tags: [],
    isPinned: false
  });

  const [currentTag, setCurrentTag] = useState('');
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingChat) {
      setFormData({
        title: editingChat.title,
        url: editingChat.url,
        platform: editingChat.platform,
        workspace: editingChat.workspace,
  // description retained if previously present but not editable
        tags: editingChat.tags || [],
        isPinned: editingChat.isPinned
      });
    } else {
      // Reset form for new chat
      setFormData({
        title: '',
        url: '',
        platform: 'chatgpt',
        workspace: 'General',
  // description removed
        tags: [],
        isPinned: false
      });
    }
  }, [editingChat]);

  // Auto-detect platform instead of manual selection
  const detectPlatform = (url: string): 'chatgpt' | 'gemini' | 'claude' | 'deepseek' => {
    try {
      const host = new URL(url).hostname;
      if (host.includes('chatgpt') || host.includes('openai')) return 'chatgpt';
      if (host.includes('gemini') || host.includes('google')) return 'gemini';
      if (host.includes('claude') || host.includes('anthropic')) return 'claude';
      if (host.includes('deepseek')) return 'deepseek';
    } catch {}
    return 'chatgpt';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const platform = detectPlatform(formData.url || editingChat?.url || '');
      if (editingChat) {
        await updateChat({
          ...editingChat,
          ...formData,
          platform
        });
        toast.success('Bookmark updated!');
      } else {
        await addChat({ ...formData, platform });
        toast.success('Bookmark added!');
      }
      
      setCurrentView('list');
      setEditingChat(null);
    } catch {
      toast.error('Failed to save bookmark');
    }
  };

  const handleCancel = () => { setCurrentView('list'); setEditingChat(null); };

  const handleAddTag = () => {
    if (currentTag.trim() && !(formData.tags || []).includes(currentTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), currentTag.trim()] }));
      setCurrentTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => { 
    setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(tag => tag !== tagToRemove) })); 
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => { 
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } 
  };

  const handlePlatformSelect = (platform: 'chatgpt' | 'gemini' | 'claude') => {
    setFormData(prev => ({ ...prev, platform }));
    setShowPlatformDropdown(false);
  };

  const handleWorkspaceSelect = (workspace: string) => {
    setFormData(prev => ({ ...prev, workspace }));
    setShowWorkspaceDropdown(false);
  };

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (platformRef.current && !platformRef.current.contains(event.target as Node)) {
        setShowPlatformDropdown(false);
      }
  // workspace dropdown handled by Select internally
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background text-[12px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 py-2 border-b bg-background/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-7 w-7 p-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {editingChat ? 'Edit Bookmark' : 'Add Bookmark'}
        </h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* URL Input */}
          <div className="space-y-1.5">
            <Label htmlFor="url" className="text-[12px] font-medium">
              URL
            </Label>
            <div className="relative">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="pl-8 pr-3 h-8 text-[12px]"
              />
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[12px] font-medium">
              Title *
            </Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="h-8 text-[12px]"
            />
          </div>

          {/* Workspace (platform selection removed) */}
          <div className="space-y-1.5">
            <Label htmlFor="workspace" className="text-[12px] font-medium">Workspace</Label>
            <WorkspaceSelect
              value={formData.workspace}
              onChange={(v) => setFormData(prev => ({ ...prev, workspace: v }))}
              id="workspace"
              className="shadow-sm h-8 text-[12px]"
            />
            <div className="flex mt-2 gap-1">
              <Input
                placeholder="New workspace name"
                value={newWorkspace}
                onChange={(e) => setNewWorkspace(e.target.value)}
                className="h-8 text-[12px]"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!newWorkspace.trim()}
                onClick={() => {
                  const ws = newWorkspace.trim();
                  if (ws && !workspaces.includes(ws)) {
                    (useUnifiedStore.getState().addWorkspace)(ws);
                    setFormData(prev => ({ ...prev, workspace: ws }));
                  } else if (ws) {
                    setFormData(prev => ({ ...prev, workspace: ws }));
                  }
                  setNewWorkspace('');
                }}
                className="h-8 text-xs"
              >Add</Button>
            </div>
          </div>

          {/* Description removed (optional) */}

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Tags</Label>
            <TagSelect
              allTags={allTags}
              value={formData.tags || []}
              onChange={(next) => setFormData(prev => ({ ...prev, tags: next }))}
              onDeleteTag={(tag) => {
                deleteTag(tag);
                setFormData(prev => ({ ...prev, tags: (prev.tags||[]).filter(t=>t!==tag) }));
              }}
            />
            <div className="flex flex-wrap gap-1">
              {['chatgpt','gemini','claude','deepseek'].map(p => {
                const active = (formData.tags || []).includes(p);
                return (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setFormData(prev => {
                      const existing = prev.tags || [];
                      return ({ ...prev, tags: active ? existing.filter(t=>t!==p) : [...existing, p] });
                    })}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-1.5">
              <Input
                placeholder="Add a tag..."
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-8 text-[12px]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!currentTag.trim()}
                className="h-8"
              >
                Add
              </Button>
            </div>
            {(formData.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(formData.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 h-6 text-[11px]">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Pin Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="pin" className="text-[12px] font-medium">
              Pin this bookmark
            </Label>
            <Switch
              id="pin"
              checked={formData.isPinned}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPinned: checked }))}
            />
          </div>
        </form>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2.5 px-3 py-2 border-t bg-background/80 backdrop-blur-sm">
        <Button type="button" variant="outline" onClick={handleCancel} className="h-8 px-3">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!formData.title.trim()} className="h-8 px-3 bg-black text-white hover:bg-black/90 border border-black">
          <Save className="h-4 w-4 mr-1.5" />
          {editingChat ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
