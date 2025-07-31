import React, { useState, useEffect, useRef } from 'react';
import { usePromptStore } from '../../../lib/promptStore';
import { toast } from "sonner";
import type { Prompt } from '../../../types/prompt';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { ArrowLeft, Loader2, X, Clock, Mic, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

export const PromptForm: React.FC = () => {
  const { 
    editingPrompt,
    workspaces,
    allTags,
    addPrompt, 
    updatePrompt, 
    setCurrentView,
    setEditingPrompt,
  } = usePromptStore();
  
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [workspace, setWorkspace] = useState('General');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [includeVoiceTag, setIncludeVoiceTag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setText(editingPrompt.text);
      setWorkspace(editingPrompt.workspace);
      setTags(editingPrompt.tags || []);
      setIncludeTimestamp(editingPrompt.includeTimestamp);
      setIncludeVoiceTag(editingPrompt.includeVoiceTag);
    } else {
      setTitle('');
      setText('');
      setWorkspace('General');
      setTags([]);
      setIncludeTimestamp(false);
      setIncludeVoiceTag(false);
    }
  }, [editingPrompt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast.error('Title and prompt text are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const promptData = {
        title: title.trim(),
        text: text.trim(),
        workspace,
        tags,
        includeTimestamp,
        includeVoiceTag,
        usageCount: editingPrompt?.usageCount || 0,
        isPinned: editingPrompt?.isPinned || false,
        lastUsed: editingPrompt?.lastUsed,
      };

      if (editingPrompt) {
        await updatePrompt({ ...editingPrompt, ...promptData });
        toast.success('Prompt updated successfully!');
      } else {
        await addPrompt(promptData as Omit<Prompt, 'id' | 'created'>);
        toast.success('Prompt created successfully!');
      }
      
      handleClose();
    } catch (error) {
      toast.error(`Failed to save prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEditingPrompt(null);
    setCurrentView('list');
  };

  const addTag = (tagToAdd?: string) => {
    const newTag = (tagToAdd || tagInput).trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const suggestedTags = tagInput.trim()
    ? allTags.filter((tag: string) => 
        tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag)
      ).slice(0, 5)
    : [];

  return (
    <div className="flex flex-col h-full">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center p-3 border-b bg-background/80 backdrop-blur-sm"
      >
        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
        </h2>
      </motion.div>
      
      <motion.form 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        onSubmit={handleSubmit} 
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-thin">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="title" className="text-sm font-medium">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="e.g., 'Summarize Article'"
              required
              disabled={isSubmitting}
              className="shadow-sm"
            />
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="space-y-2"
          >
            <Label htmlFor="text" className="text-sm font-medium">Prompt Text</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              placeholder="Enter your prompt here..."
              required
              className="min-h-[120px] resize-y shadow-sm"
              disabled={isSubmitting}
            />
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="space-y-2"
          >
            <Label htmlFor="workspace" className="text-sm font-medium">Workspace</Label>
            <Select value={workspace} onValueChange={setWorkspace} disabled={isSubmitting}>
              <SelectTrigger id="workspace" className="shadow-sm">
                <SelectValue placeholder="Select a workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws: string) => (
                  <SelectItem key={ws} value={ws}>{ws}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="space-y-2"
          >
            <Label htmlFor="tags" className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Tags
            </Label>
            <div className="relative">
              <Input
                id="tags"
                ref={tagInputRef}
                value={tagInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags (press Enter to add)"
                disabled={isSubmitting}
                className="shadow-sm"
              />
            </div>
            {suggestedTags.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-1 mt-1"
              >
                {suggestedTags.map((tag: string) => (
                  <Button 
                    key={tag} 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => addTag(tag)} 
                    className="h-6 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {tag}
                  </Button>
                ))}
              </motion.div>
            )}
            {tags.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap gap-1 mt-2"
              >
                {tags.map((tag, index) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full hover:bg-muted-foreground/20 transition-colors"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="space-y-3 pt-2"
          >
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <Label htmlFor="timestamp-switch" className="flex items-center gap-2 cursor-pointer">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Include Timestamp</span>
              </Label>
              <Switch
                id="timestamp-switch"
                checked={includeTimestamp}
                onCheckedChange={setIncludeTimestamp}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <Label htmlFor="voice-switch" className="flex items-center gap-2 cursor-pointer">
                <Mic className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Voice-friendly Tone</span>
              </Label>
              <Switch
                id="voice-switch"
                checked={includeVoiceTag}
                onCheckedChange={setIncludeVoiceTag}
                disabled={isSubmitting}
              />
            </div>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="flex justify-end gap-3 p-3 border-t bg-background/80 backdrop-blur-sm"
        >
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
          </Button>
        </motion.div>
      </motion.form>
    </div>
  );
};
