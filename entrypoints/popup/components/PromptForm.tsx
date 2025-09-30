// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Prompt editor that lets people craft, label, and save reusable prompts.

import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Clock, Hash, Loader2, Wand2, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { useDraftStore, type DraftRecord, type PromptDraftData } from '../../../lib/draftStore';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { useAutosaveDraft } from '../../../lib/useAutosaveDraft';
import { formatRelativeTime } from '../../../lib/utils';
import type { Prompt } from '../../../types/prompt';
import { sanitizeTagLabel } from '../../floating-save/tagHelpers';
import TagSelect from './TagSelect';
import { VoiceToneGenerator } from './VoiceToneGenerator';
import WorkspaceSelect from './WorkspaceSelect';

type PromptFormProps = { onboardingActive?: boolean };
export const PromptForm: React.FC<PromptFormProps> = ({ onboardingActive }) => {
  // Wire into the unified store to read/write prompt data.
  const {
    editingPrompt,
    workspaces,
    allTags,
    addPrompt,
    updatePrompt,
    setCurrentView,
    setEditingPrompt,
    addWorkspace,
  deleteTag,
  } = useUnifiedStore();

  // Local form state mirrors the fields the user can edit.
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [workspace, setWorkspace] = useState('General');
  const [newWorkspace, setNewWorkspace] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  // Legacy includeVoiceTag flag is no longer exposed.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showVoiceToneGenerator, setShowVoiceToneGenerator] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  const draftId = editingPrompt ? `prompt:${editingPrompt.id}` : 'prompt:new';
  const finalizeDraft = useDraftStore((state) => state.finalizeDraft);
  const [resumedDraftAt, setResumedDraftAt] = useState<number | null>(null);

  const handleDraftHydrated = useCallback((payload: PromptDraftData, record: DraftRecord<'prompt'>) => {
    setTitle(payload.title ?? '');
    setText(payload.text ?? '');
    setWorkspace(payload.workspace ?? 'General');
    setTags(Array.isArray(payload.tags) ? [...payload.tags] : []);
    setIncludeTimestamp(Boolean(payload.includeTimestamp));
    setResumedDraftAt(record.updatedAt);
  }, []);

  const draftPayload = useMemo(() => ({
    title,
    text,
    workspace,
    tags,
    includeTimestamp,
  }), [title, text, workspace, tags, includeTimestamp]);

  const {
    hydrated: draftHydrated,
    conflict: draftConflict,
    flush: flushDraft,
    discard: discardDraft,
    saveImmediate,
    clearConflict: clearDraftConflict,
  } = useAutosaveDraft({
    id: draftId,
    type: 'prompt',
    data: draftPayload,
    onHydrated: handleDraftHydrated,
  });

  const handleApplyRemoteDraft = useCallback(() => {
    if (!draftConflict || draftConflict.remote.type !== 'prompt') return;
    const payload = draftConflict.remote.data as PromptDraftData;
    setTitle(payload.title ?? '');
    setText(payload.text ?? '');
    setWorkspace(payload.workspace ?? 'General');
    setTags(Array.isArray(payload.tags) ? [...payload.tags] : []);
    setIncludeTimestamp(Boolean(payload.includeTimestamp));
    setResumedDraftAt(draftConflict.remote.updatedAt);
    saveImmediate(payload);
    clearDraftConflict();
  }, [draftConflict, saveImmediate, clearDraftConflict]);

  const handleDismissConflict = useCallback(() => {
    clearDraftConflict();
  }, [clearDraftConflict]);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const PROMPT_SNIPPETS = {
    // Handy starter snippets so the user can compose faster.
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
    // Drops a canned snippet at the current cursor position.
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

  const normalizedAllTags = React.useMemo(() => {
    // Lowercase and dedupe tags so suggestions stay tidy.
    const seen = new Set<string>();
    const result: string[] = [];
    allTags.forEach((tag: string) => {
      const safe = sanitizeTagLabel(tag).toLowerCase();
      if (!safe || seen.has(safe)) return;
      seen.add(safe);
      result.push(safe);
    });
    return result;
  }, [allTags]);

  useEffect(() => {
    clearDraftConflict();
    // When a prompt is selected for edit, hydrate the form fields from the entity.
    // For a new prompt, avoid resetting fields so hydrated draft data (if any) isn't clobbered.
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setText(editingPrompt.text);
      setWorkspace(editingPrompt.workspace);
      const safeTags = (editingPrompt.tags || []).map(t => sanitizeTagLabel(t).toLowerCase()).filter(Boolean);
      setTags(Array.from(new Set(safeTags)));
      setIncludeTimestamp(editingPrompt.includeTimestamp);
    }
  }, [editingPrompt, clearDraftConflict]);

  const handleSubmit = async (e: React.FormEvent) => {
    // Validate and persist the prompt back into storage.
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast.error('Title and prompt text are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await flushDraft();
      const promptData = {
        title: title.trim(),
        text: text.trim(),
        workspace,
        tags,
        includeTimestamp,
        usageCount: editingPrompt?.usageCount || 0,
        isPinned: editingPrompt?.isPinned || false,
        lastUsed: editingPrompt?.lastUsed,
      };

      await finalizeDraft(draftId, async () => {
        if (editingPrompt) {
          await updatePrompt({ ...editingPrompt, ...promptData });
          toast.success('Prompt updated successfully!');
        } else {
          await addPrompt(promptData as Omit<Prompt, 'id' | 'created'>);
          toast.success('Prompt created successfully!');
        }
      });
      discardDraft();
      setResumedDraftAt(null);
      handleClose(false);
    } catch (error) {
      toast.error(`Failed to save prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (preserveDraft: boolean = true) => {
    // Return to the list view and clear editing state.
    if (preserveDraft) {
      saveImmediate();
    }
    setEditingPrompt(null);
    setCurrentView('list');
  };

  const handleCancel = async () => {
    // Confirm before discarding current draft and leaving the form.
    // If user confirms, discard any autosaved draft and navigate back without saving.
    const hasContent = (title.trim().length + text.trim().length + tags.length) > 0 || includeTimestamp;
    const shouldAsk = true; // Always ask to protect user input.
    let proceed = true;
    if (shouldAsk && hasContent) {
  // Use native confirm for simplicity and reliability in tests.
  proceed = window.confirm('Discard your unsaved changes?');
    }
    if (!proceed) return;
    try {
      await discardDraft();
      setResumedDraftAt(null);
    } finally {
      setEditingPrompt(null);
      setCurrentView('list');
    }
  };

  const addTag = (tagToAdd?: string) => {
    // Sanitize and add a custom tag to the prompt.
    const candidate = sanitizeTagLabel(tagToAdd ?? tagInput).toLowerCase();
    if (candidate && !tags.includes(candidate)) {
      setTags([...tags, candidate]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    // Remove an applied tag chip from the form.
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    // Add the tag when users press enter or comma.
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const normalizedQuery = sanitizeTagLabel(tagInput).toLowerCase();
  const suggestedTags = normalizedQuery
    ? normalizedAllTags.filter((tag: string) =>
        tag.includes(normalizedQuery) && !tags.includes(tag)
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mr-1.5"
          onClick={() => handleClose()}
          aria-label="Back"
        >
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
          {draftHydrated && resumedDraftAt && !draftConflict && (
            <Alert className="text-[12px] border-emerald-300/60 bg-emerald-50 text-emerald-900">
              <AlertTitle>Draft resumed</AlertTitle>
              <AlertDescription>
                Restored your unsaved changes from {formatRelativeTime(resumedDraftAt)}.
              </AlertDescription>
            </Alert>
          )}
          {draftConflict && (
            <Alert variant="destructive" className="text-[12px]">
              <AlertTitle>Draft updated elsewhere</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>Another window saved new edits {formatRelativeTime(draftConflict.remote.updatedAt)}.</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleApplyRemoteDraft}>Use remote</Button>
                  <Button size="sm" variant="outline" onClick={handleDismissConflict}>Keep mine</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
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
            <WorkspaceSelect value={workspace} onChange={setWorkspace} id="workspace" className="shadow-sm h-8 text-[12px]" />
            {/* Inline delete now available directly in Select dropdown; extra Browse menu removed. */}
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
                variant="default"
                disabled={!newWorkspace.trim()}
                onClick={() => {
                  const ws = newWorkspace.trim();
                  if (!ws) return;
                  // Ensure it's added to the central store immediately
                  if (!workspaces.includes(ws)) {
                    try { addWorkspace(ws); } catch {}
                  }
                  // Select it in the form either way
                  setWorkspace(ws);
                  setNewWorkspace('');
                }}
                title="Add workspace"
                className={`h-8 text-xs bg-black text-white hover:bg-black/90 border border-black ${onboardingActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
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
            <TagSelect
              allTags={normalizedAllTags}
              value={tags}
              onChange={(next) => setTags(next)}
              onDeleteTag={(tag) => {
                const safeTag = sanitizeTagLabel(tag).toLowerCase();
                if (!safeTag) return;
                deleteTag(safeTag);
                setTags((prev) => prev.filter(t => t !== safeTag));
              }}
            />
            <div className="flex gap-1.5 items-center">
              <Input
                id="tags"
                ref={tagInputRef}
                value={tagInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag..."
                disabled={isSubmitting}
                className="shadow-sm h-8 text-[12px] flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => addTag()}
                disabled={!sanitizeTagLabel(tagInput)}
                title="Add tag"
                className={`h-8 bg-black text-white hover:bg-black/90 border border-black ${onboardingActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
              >
                Add
              </Button>
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
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting} className="h-8 px-3">
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

