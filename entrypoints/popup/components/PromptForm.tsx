import { motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, Clock, Hash, Loader2, Wand2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from "sonner";
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import type { Prompt } from '../../../types/prompt';
import { VoiceToneGenerator } from './VoiceToneGenerator';

export const PromptForm: React.FC = () => {
  const {
    editingPrompt,
    workspaces,
    allTags,
    addPrompt,
    updatePrompt,
    setCurrentView,
    setEditingPrompt,
  deleteTag,
  } = useUnifiedStore();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [workspace, setWorkspace] = useState('General');
  const [newWorkspace, setNewWorkspace] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  // Removed includeVoiceTag per product decision
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showVoiceToneGenerator, setShowVoiceToneGenerator] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const PROMPT_SNIPPETS = {
    expertise: [
      "You are an expert in [FIELD] with [NUMBER] years of experience.",
      "As a seasoned [ROLE] specializing in [DOMAIN], you understand...",
      "Drawing from extensive experience in [FIELD], you provide..."
    ],
    instructions: [
      "Please provide a step-by-step analysis of...",
      "Break down this complex topic into simple terms...",
      "Analyze the following and provide actionable insights..."
    ],
    constraints: [
      "Keep your response under [NUMBER] words.",
      "Use bullet points for clarity.",
      "Provide [NUMBER] specific examples."
    ],
    tone: [
      "Maintain a professional yet approachable tone.",
      "Be direct and concise, avoiding unnecessary jargon.",
      "Use an educational tone suitable for beginners."
    ]
  };

  const handleInsertSnippet = (snippetText: string) => {
    if (!textRef.current) return;

    const textarea = textRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = text;
    const newText = currentText.substring(0, start) + snippetText + currentText.substring(end);

    setText(newText);
    setShowSnippets(false);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippetText.length;
    }, 0);
  };

  useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setText(editingPrompt.text);
      setWorkspace(editingPrompt.workspace);
      setTags(editingPrompt.tags || []);
      setIncludeTimestamp(editingPrompt.includeTimestamp);
  // ignore legacy includeVoiceTag
    } else {
      setTitle('');
      setText('');
      setWorkspace('General');
      setTags([]);
      setIncludeTimestamp(false);
  // legacy removed
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
  // includeVoiceTag removed
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
    <div className="relative flex flex-col h-full text-[12px]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="flex items-center p-2 border-b bg-background/80 backdrop-blur-sm"
      >
        <Button variant="ghost" size="icon" className="h-7 w-7 mr-1.5" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
        </h2>
      </motion.div>
      
      <motion.form 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onSubmit={handleSubmit} 
        className="flex flex-col flex-1 overflow-hidden"
      >
        <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5"
          >
            <Label htmlFor="title" className="text-[12px] font-medium">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="e.g., 'Summarize Article'"
              required
              disabled={isSubmitting}
              className="shadow-sm h-8 text-[12px]"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5"
          >
            <div className="flex justify-between items-center">
              <Label htmlFor="text" className="text-[12px] font-medium">Prompt Text</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowVoiceToneGenerator(true)}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Generator
                </Button>
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSnippets(!showSnippets)}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Insert Snippet
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                  {showSnippets && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-background border border-border rounded-md shadow-lg z-10">
                      {Object.entries(PROMPT_SNIPPETS).map(([category, snippets]) => (
                        <div key={category}>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                            {category}
                          </div>
                          {snippets.map((snippet, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleInsertSnippet(snippet)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50"
                            >
                              {snippet.substring(0, 50)}...
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Textarea
              id="text"
              ref={textRef}
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              placeholder="Enter your prompt here..."
              required
              className="min-h-[100px] resize-y shadow-sm text-[12px]"
              disabled={isSubmitting}
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5"
          >
            <Label htmlFor="workspace" className="text-[12px] font-medium">Workspace</Label>
            <Select value={workspace} onValueChange={setWorkspace}>
              <SelectTrigger id="workspace" className="shadow-sm h-8 text-[12px]">
                <SelectValue placeholder="Select a workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws: string) => (
                  <SelectItem key={ws} value={ws}>{ws}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    setWorkspace(ws);
                  } else if (ws) {
                    setWorkspace(ws);
                  }
                  setNewWorkspace('');
                }}
                className="h-8 text-xs"
              >Add</Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-1.5"
          >
            <Label htmlFor="tags" className="text-[12px] font-medium flex items-center gap-2">
              <Hash className="h-3.5 w-3.5" />
              Tags
            </Label>
              <div className="flex items-center justify-between relative" ref={tagDropdownRef}>
                <Label htmlFor="tags" className="text-[12px] font-medium">Tags</Label>
                {allTags.length > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowTagDropdown(v=>!v)} className="h-6 px-2 text-[10px]">
                    Browse <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {showTagDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-52 max-h-60 overflow-y-auto bg-popover border border-border rounded-md shadow-lg z-50 p-1">
                    {allTags.length === 0 && <div className="text-[11px] text-muted-foreground p-2">No tags</div>}
                    {allTags.map(tag => {
                      const selected = tags.includes(tag);
                      return (
                        <div key={tag} className="group flex items-center gap-1 px-2 h-7 text-[11px] rounded hover:bg-accent/10">
                          <button
                            type="button"
                            onClick={() => setTags(prev => selected ? prev.filter(t=>t!==tag) : [...prev, tag])}
                            className="flex-1 text-left truncate"
                          >
                            <span className="inline-flex items-center gap-1">{selected && <Check className="h-3 w-3 text-green-600" />}{tag}</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete tag ${tag}`}
                            className="opacity-60 hover:opacity-100 text-red-600 p-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete tag \"${tag}\" from all items?`)) {
                                deleteTag(tag);
                                setTags(prev => prev.filter(t=>t!==tag));
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
            <div className="relative">
              <Input
                id="tags"
                ref={tagInputRef}
                value={tagInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags (press Enter to add)"
                disabled={isSubmitting}
                className="shadow-sm h-8 text-[12px]"
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
                className="flex flex-wrap gap-1 mt-1.5"
              >
                {tags.map((tag, index) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Badge variant="secondary" className="flex items-center gap-1 h-6 text-[11px]">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-2 pt-1.5"
          >
            <div className="flex items-center justify-between p-2.5 rounded-md border bg-card">
              <Label htmlFor="timestamp-switch" className="flex items-center gap-2 cursor-pointer">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span className="text-[12px] font-medium">Include Timestamp</span>
              </Label>
              <Switch
                id="timestamp-switch"
                checked={includeTimestamp}
                onCheckedChange={setIncludeTimestamp}
                disabled={isSubmitting}
              />
            </div>
            {/* Voice-friendly toggle removed */}
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between gap-2.5 p-2 border-t bg-background/80 backdrop-blur-sm"
          >
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting} className="h-8 px-3">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[110px] h-8 bg-black text-white hover:bg-black/90 border border-black">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPrompt ? 'Update' : 'Create'}
            </Button>
          </motion.div>
      </motion.form>
      <VoiceToneGenerator
        open={showVoiceToneGenerator}
        onOpenChange={setShowVoiceToneGenerator}
        onGenerate={(prompt) => {
          setText((currentText) => currentText + '\n\n' + prompt);
        }}
      />
    </div>
  );
};
