import React, { useState, useEffect } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { chatStorage, ChatStorage } from '../../../lib/chatStorage';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { ArrowLeft, Link, CheckCircle, AlertCircle, X, Hash, Loader2, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
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
          message: 'Please enter a valid ChatGPT or Gemini URL (conversation or share link)'
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
    } catch (error) {
      toast.error('Failed to save chat bookmark');
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingChat(null);
  };

  const handleCaptureCurrentChat = async () => {
    setIsCapturing(true);
    try {
      // Get the current active tab
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (!activeTab?.id) {
        toast.error('No active tab found');
        return;
      }

      // Send message to content script to capture current chat
      let response;
      try {
        response = await browser.tabs.sendMessage(activeTab.id, { 
          type: 'CAPTURE_CURRENT_CHAT' 
        });
      } catch (err: any) {
        if (err && err.message && err.message.includes('Could not establish connection')) {
          toast.error('Could not connect to the tab. Make sure you have permission to access this tab and that the content script is loaded.');
        } else if (err && err.message && err.message.includes('No tab with id')) {
          toast.error('The tab is no longer available or has been closed.');
        } else {
          toast.error(`Failed to send message to tab: ${err?.message || err}`);
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
            ? `Captured: ${capturedData.scrapedContent.summary}. Last message: ${capturedData.scrapedContent.lastMessage?.slice(0, 100)}...`
            : prev.description
        }));
        
        // Show detailed success message
        const contentInfo = capturedData.scrapedContent 
          ? ` (${capturedData.scrapedContent.messageCount || 0} messages)`
          : '';
        toast.success(`Chat captured successfully!${contentInfo}`);
      } else {
        toast.error(response?.message || 'Failed to capture chat');
      }
    } catch (error) {
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
      } catch (fallbackError) {
        toast.error('Failed to capture current chat');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !(formData.tags || []).includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900">
          {editingChat ? 'Edit Chat Bookmark' : 'Add Chat Bookmark'}
        </h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium text-gray-700">
              Chat URL *
            </Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="url"
                type="url"
                placeholder="https://chatgpt.com/share/... or g.co/gemini/share/..."
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="pl-10 pr-4"
                required
              />
            </div>
            {/* URL Validation */}
            {formData.url && (
              <div className={`flex items-center gap-2 text-sm ${
                urlValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {urlValidation.isValid ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {urlValidation.message}
              </div>
            )}
            
            {/* URL Types Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-medium text-gray-800 mb-2">Supported URL formats:</div>
              <div className="space-y-1">
                <div><strong>ChatGPT:</strong></div>
                <div className="ml-2">• Direct: <code>chatgpt.com/c/xxx</code> (private, requires login)</div>
                <div className="ml-2">• Share: <code>chatgpt.com/share/xxx</code> (public, shareable)</div>
                <div><strong>Gemini:</strong></div>
                <div className="ml-2">• Direct: <code>gemini.google.com/app/xxx</code> (private)</div>
                <div className="ml-2">• Share: <code>g.co/gemini/share/xxx</code> (public)</div>
              </div>
            </div>
          </div>

          {/* Quick Capture Button */}
          {!editingChat && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Auto-capture current chat</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    Automatically fill in the URL and title from your current ChatGPT or Gemini tab
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCaptureCurrentChat}
                  disabled={isCapturing}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100 ml-3"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Capture
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Title *
            </Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Platform and Workspace Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="platform" className="text-sm font-medium text-gray-700">
                Platform
              </Label>
              <Select 
                value={formData.platform} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  platform: value as 'chatgpt' | 'gemini' | 'claude' 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chatgpt">🤖 ChatGPT</SelectItem>
                  <SelectItem value="gemini">💎 Gemini</SelectItem>
                  <SelectItem value="claude">🧠 Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace" className="text-sm font-medium text-gray-700">
                Workspace
              </Label>
              <Select 
                value={formData.workspace} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, workspace: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace} value={workspace}>
                      {workspace}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Optional description or notes about this chat..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!currentTag.trim()}
              >
                Add
              </Button>
            </div>
            
            {/* Tag List */}
            {(formData.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(formData.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-red-500" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Pin Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
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
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!urlValidation.isValid || !formData.title.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {editingChat ? 'Update' : 'Save'} Chat
        </Button>
      </div>
    </div>
  );
};
