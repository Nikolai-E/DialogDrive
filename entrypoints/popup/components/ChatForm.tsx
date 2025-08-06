import React, { useState, useEffect, useRef } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { chatStorage, ChatStorage } from '../../../lib/chatStorage';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { ArrowLeft, Link, CheckCircle, AlertCircle, X, Loader2, Download, Save, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import type { AddChatBookmark } from '../../../types/chat';

export const ChatForm: React.FC = () => {
  const { 
    editingChat, 
    setEditingChat, 
    setCurrentView, 
    addChat, 
    updateChat,
    workspaces 
  } = useUnifiedStore();

  const [formData, setFormData] = useState<AddChatBookmark>({
    title: '',
    url: '',
    platform: 'chatgpt',
    workspace: 'General',
    description: '',
    tags: [],
    isPinned: false
  });

  const [currentTag, setCurrentTag] = useState('');
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    platform: string | null;
    message: string;
  }>({ isValid: false, platform: null, message: '' });
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const platformRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingChat) {
      setFormData({
        title: editingChat.title,
        url: editingChat.url,
        platform: editingChat.platform,
        workspace: editingChat.workspace,
        description: editingChat.description || '',
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
        description: '',
        tags: [],
        isPinned: false
      });
    }
  }, [editingChat]);

  // Validate URL and auto-detect platform
  useEffect(() => {
    if (formData.url) {
      const parsed = ChatStorage.parseUrl(formData.url);
      
      if (parsed.platform) {
        const urlTypeMessage = parsed.urlType === 'conversation' 
          ? '(Private - requires login)' 
          : '(Shareable - works without login)';
          
        setUrlValidation({
          isValid: true,
          platform: parsed.platform,
          message: `Valid ${parsed.platform} ${parsed.urlType} URL ${urlTypeMessage}`
        });
        
        // Auto-update platform and generate title if not editing
        if (!editingChat) {
          setFormData(prev => ({
            ...prev,
            platform: parsed.platform!,
            title: prev.title || ChatStorage.generateTitle(formData.url, parsed.platform!)
          }));
        }
      } else {
        setUrlValidation({
          isValid: false,
          platform: null,
          message: 'Please enter a valid ChatGPT, Gemini or Claude URL'
        });
      }
    } else {
      setUrlValidation({ isValid: false, platform: null, message: '' });
    }
  }, [formData.url, editingChat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urlValidation.isValid) {
      toast.error('Please enter a valid chat URL');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      if (editingChat) {
        await updateChat({
          ...editingChat,
          ...formData
        });
        toast.success('Chat bookmark updated!');
      } else {
        await addChat(formData);
        toast.success('Chat bookmark added!');
      }
      
      setCurrentView('list');
      setEditingChat(null);
    } catch {
      toast.error('Failed to save chat bookmark');
    }
  };

  const handleCancel = () => { setCurrentView('list'); setEditingChat(null); };

  const handleCaptureCurrentChat = async () => {
    setIsCapturing(true);
    try {
      // Get the current active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (!activeTab?.id) { toast.error('No active tab found'); return; }

      // Send message to content script to capture current chat
      let response;
      try {
        response = await browser.tabs.sendMessage(activeTab.id, { 
          type: 'CAPTURE_CURRENT_CHAT' 
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (error?.message?.includes('Could not establish connection')) {
          toast.error('Could not connect to the tab. Ensure permissions and content script.');
        } else if (error?.message?.includes('No tab with id')) {
          toast.error('The tab is no longer available.');
        } else {
          toast.error(`Failed to send message: ${error?.message || error}`);
        }
        setIsCapturing(false);
        return;
      }

      if (response?.success) {
        const capturedData = response.data;
        
        // Update form with captured data
        setFormData(prev => ({
          ...prev,
          title: capturedData.title,
          url: capturedData.url,
          platform: capturedData.platform,
          // Add description with captured content info
          description: capturedData.scrapedContent 
            ? `Captured: ${capturedData.scrapedContent.summary}. Last: ${capturedData.scrapedContent.lastMessage?.slice(0, 90)}…`
            : prev.description
        }));
        
        // Show detailed success message
        const contentInfo = capturedData.scrapedContent 
          ? ` (${capturedData.scrapedContent.messageCount || 0} messages)`
          : '';
        toast.success(`Chat captured!${contentInfo}`);
      } else {
        toast.error(response?.message || 'Failed to capture chat');
      }
    } catch {
      // Fallback: get current tab URL
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        
        if (activeTab?.url) {
          const parsed = ChatStorage.parseUrl(activeTab.url);
          if (parsed.platform) {
            setFormData(prev => ({
              ...prev,
              url: activeTab.url!,
              platform: parsed.platform!,
              title: prev.title || ChatStorage.generateTitle(activeTab.url!, parsed.platform!)
            }));
            toast.success('URL captured - please add a title');
          } else {
            toast.error('Current tab is not a supported chat platform');
          }
        } else {
          toast.error('Cannot access current tab URL');
        }
      } catch {
        toast.error('Failed to capture current chat');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !(formData.tags || []).includes(currentTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), currentTag.trim()] }));
      setCurrentTag('');
    }
  };
  const handleRemoveTag = (tagToRemove: string) => { setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(tag => tag !== tagToRemove) })); };
  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } };

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
          {editingChat ? 'Edit Chat Bookmark' : 'Add Chat Bookmark'}
        </h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* URL Input */}
          <div className="space-y-1.5">
            <Label htmlFor="url" className="text-[12px] font-medium">
              Chat URL *
            </Label>
            <div className="relative">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder="https://chatgpt.com/share/... or g.co/gemini/share/..."
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="pl-8 pr-3 h-8 text-[12px]"
                required
              />
            </div>
            {formData.url && (
              <div className={`flex items-center gap-1.5 text-[12px] ${urlValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {urlValidation.isValid ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {urlValidation.message}
              </div>
            )}
            <div className="bg-muted/40 border border-border rounded-md p-2 text-[11px] text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Supported URL formats:</div>
              <div className="space-y-0.5">
                <div>ChatGPT: direct or share</div>
                <div>Gemini: direct or share</div>
                <div>Claude: direct or share</div>
              </div>
            </div>
          </div>

          {/* Quick Capture Button */}
          {!editingChat && (
            <div className="border rounded-md p-2 bg-secondary/10 border-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[12px] font-medium">Auto-capture current chat</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Fill URL and title from your current chat tab
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCaptureCurrentChat}
                  disabled={isCapturing}
                  className="h-8 px-2"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Capturing…
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1.5" />
                      Capture
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

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

          {/* Platform and Workspace Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="platform" className="text-[12px] font-medium">
                Platform
              </Label>
              <div className="relative" ref={platformRef}>
                <button
                  type="button"
                  onClick={() => setShowPlatformDropdown(prev => !prev)}
                  className="w-full h-8 text-[12px] px-3 border border-border bg-background text-foreground rounded-md flex items-center justify-between hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span>
                    {formData.platform === 'chatgpt' && '🤖 ChatGPT'}
                    {formData.platform === 'gemini' && '💎 Gemini'}
                    {formData.platform === 'claude' && '🧠 Claude'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showPlatformDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-[9999] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handlePlatformSelect('chatgpt')}
                      className="w-full h-8 text-left text-xs px-3 hover:bg-accent/10 flex items-center gap-2"
                    >
                      🤖 ChatGPT
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlatformSelect('gemini')}
                      className="w-full h-8 text-left text-xs px-3 hover:bg-accent/10 flex items-center gap-2"
                    >
                      💎 Gemini
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlatformSelect('claude')}
                      className="w-full h-8 text-left text-xs px-3 hover:bg-accent/10 flex items-center gap-2"
                    >
                      🧠 Claude
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="workspace" className="text-[12px] font-medium">
                Workspace
              </Label>
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
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-[9999] overflow-hidden max-h-48 overflow-y-auto">
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
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[12px] font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Optional description or notes..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[80px] resize-none text-[12px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Tags</Label>
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
              Pin this chat bookmark
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
        <Button onClick={handleSubmit} disabled={!urlValidation.isValid || !formData.title.trim()} className="h-8 px-3 bg-foreground text-white hover:opacity-90">
          <Save className="h-4 w-4 mr-1.5" />
          {editingChat ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
