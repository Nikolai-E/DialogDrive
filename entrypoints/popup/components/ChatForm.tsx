import { ArrowLeft, Check, ChevronDown, Link, Save, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { AddChatBookmark } from '../../../types/chat';

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
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
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
        <Button variant="ghost" size="icon" onClick={handleCancel} className="h-7 w-7 p-0">
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
            <div className="relative" ref={workspaceRef}>
              <button
                type="button"
                onClick={() => setShowWorkspaceDropdown(prev => !prev)}
                className="w-full h-8 text-[12px] px-3 border border-border bg-background text-foreground rounded-md flex items-center justify-between hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <span>{formData.workspace}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {showWorkspaceDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-[9999] overflow-hidden">
                  <div className="max-h-40 overflow-y-auto">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace}
                        type="button"
                        onClick={() => handleWorkspaceSelect(workspace)}
                        className="w-full h-8 text-left text-xs px-3 hover:bg-accent/10"
                      >
                        {workspace}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-border bg-background/50 space-y-2">
                    <input
                      type="text"
                      value={newWorkspace}
                      onChange={(e) => setNewWorkspace(e.target.value)}
                      placeholder="New workspace name"
                      className="w-full h-7 px-2 text-[11px] border rounded"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!newWorkspace.trim()}
                      className="w-full h-7 text-[11px]"
                      onClick={() => {
                        const ws = newWorkspace.trim();
                        if (ws && !workspaces.includes(ws)) {
                          // Add to store and select it
                          // use store action
                          (useUnifiedStore.getState().addWorkspace)(ws);
                          handleWorkspaceSelect(ws);
                        } else if (ws) {
                          handleWorkspaceSelect(ws);
                        }
                        setNewWorkspace('');
                        setShowWorkspaceDropdown(false);
                      }}
                    >Add Workspace</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description removed (optional) */}

          {/* Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between relative" ref={tagDropdownRef}>
              <Label className="text-[12px] font-medium">Tags</Label>
              {allTags.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTagDropdown(v=>!v)} className="h-6 px-2 text-[10px]">
                  Browse
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              )}
              {showTagDropdown && (
                <div className="absolute top-full right-0 mt-1 w-48 max-h-60 overflow-y-auto bg-popover border border-border rounded-md shadow-lg z-50 p-1">
                  {allTags.length === 0 && (
                    <div className="text-[11px] text-muted-foreground p-2">No tags</div>
                  )}
                  {allTags.map(tag => {
                    const selected = (formData.tags||[]).includes(tag);
                    return (
                      <div key={tag} className="group flex items-center gap-1 px-2 h-7 text-[11px] rounded hover:bg-accent/10">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, tags: selected ? (prev.tags||[]).filter(t=>t!==tag) : [...(prev.tags||[]), tag] }))}
                          className="flex-1 text-left truncate"
                        >
                          <span className="inline-flex items-center gap-1">
                            {selected && <Check className="h-3 w-3 text-green-600" />}{tag}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete tag ${tag}`}
                          className="opacity-60 hover:opacity-100 text-red-600 p-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete tag "${tag}" from all items?`)) {
                              deleteTag(tag);
                              setFormData(prev => ({ ...prev, tags: (prev.tags||[]).filter(t=>t!==tag) }));
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
