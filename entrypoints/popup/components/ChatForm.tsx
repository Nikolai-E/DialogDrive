// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Chat bookmark form for saving AI conversations with tags and workspaces.

import { ArrowLeft, Link, Save, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { useDraftStore, type ChatDraftData, type DraftRecord } from '../../../lib/draftStore';
import { logSilentError } from '../../../lib/errorHandler';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import { useAutosaveDraft } from '../../../lib/useAutosaveDraft';
import { formatRelativeTime, cn } from '../../../lib/utils';
import { AddChatBookmark } from '../../../types/chat';
import { sanitizeTagLabel } from '../../floating-save/tagHelpers';
import TagSelect from './TagSelect';
import WorkspaceSelect from './WorkspaceSelect';

const DEFAULT_FORM: AddChatBookmark = {
  title: '',
  url: '',
  platform: 'chatgpt',
  workspace: 'General',
  tags: [],
  isPinned: false,
};

type ChatFormProps = { onboardingActive?: boolean };
export const ChatForm: React.FC<ChatFormProps> = ({ onboardingActive }) => {
  const {
    editingChat,
    setEditingChat,
    setCurrentView,
    addChat,
    updateChat,
    workspaces,
    allTags,
    deleteTag,
  } = useUnifiedStore();

  const [formData, setFormData] = useState<AddChatBookmark>(() => ({ ...DEFAULT_FORM }));
  const [currentTag, setCurrentTag] = useState('');
  const [newWorkspace, setNewWorkspace] = useState('');
  const [resumedDraftAt, setResumedDraftAt] = useState<number | null>(null);

  const draftId = editingChat ? `chat:${editingChat.id}` : 'chat:new';
  const finalizeDraft = useDraftStore((state) => state.finalizeDraft);

  const handleDraftHydrated = useCallback((payload: ChatDraftData, record: DraftRecord<'chat'>) => {
    setFormData({
      title: payload.title ?? '',
      url: payload.url ?? '',
      platform: payload.platform ?? 'chatgpt',
      workspace: payload.workspace ?? 'General',
      tags: Array.isArray(payload.tags) ? [...payload.tags] : [],
      isPinned: Boolean(payload.isPinned),
    });
    setResumedDraftAt(record.updatedAt);
  }, []);

  const draftPayload = useMemo<ChatDraftData>(
    () => ({
      title: formData.title ?? '',
      url: formData.url ?? '',
      workspace: formData.workspace ?? 'General',
      tags: Array.isArray(formData.tags) ? [...formData.tags] : [],
      platform: formData.platform ?? 'chatgpt',
      isPinned: Boolean(formData.isPinned),
    }),
    [formData]
  );

  const {
    hydrated: draftHydrated,
    conflict: draftConflict,
    flush: flushDraft,
    discard: discardDraft,
    saveImmediate,
    clearConflict: clearDraftConflict,
  } = useAutosaveDraft({
    id: draftId,
    type: 'chat',
    data: draftPayload,
    onHydrated: handleDraftHydrated,
  });

  const handleApplyRemoteDraft = useCallback(() => {
    if (!draftConflict || draftConflict.remote.type !== 'chat') return;
    const payload = draftConflict.remote.data as ChatDraftData;
    setFormData({
      title: payload.title ?? '',
      url: payload.url ?? '',
      platform: payload.platform ?? 'chatgpt',
      workspace: payload.workspace ?? 'General',
      tags: Array.isArray(payload.tags) ? [...payload.tags] : [],
      isPinned: Boolean(payload.isPinned),
    });
    setResumedDraftAt(draftConflict.remote.updatedAt);
    saveImmediate(payload);
    clearDraftConflict();
  }, [draftConflict, saveImmediate, clearDraftConflict]);

  const handleDismissConflict = useCallback(() => {
    clearDraftConflict();
  }, [clearDraftConflict]);

  const normalizedAllTags = useMemo(() => {
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
    if (editingChat) {
      const safeTags = (editingChat.tags || [])
        .map((tag) => sanitizeTagLabel(tag).toLowerCase())
        .filter(Boolean);
      setFormData({
        title: editingChat.title,
        url: editingChat.url,
        platform: editingChat.platform,
        workspace: editingChat.workspace,
        tags: Array.from(new Set(safeTags)),
        isPinned: editingChat.isPinned,
      });
    }
  }, [editingChat, clearDraftConflict]);

  const detectPlatform = (url: string): 'chatgpt' | 'gemini' | 'claude' | 'deepseek' => {
    try {
      const host = new URL(url).hostname;
      if (host.includes('chatgpt') || host.includes('openai')) return 'chatgpt';
      if (host.includes('gemini') || host.includes('google')) return 'gemini';
      if (host.includes('claude') || host.includes('anthropic')) return 'claude';
      if (host.includes('deepseek')) return 'deepseek';
    } catch (error) {
      logSilentError('ChatForm.detectPlatform', error);
    }
    return 'chatgpt';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = formData.title.trim();
    if (!title) {
      toast.error('Please enter a title');
      return;
    }

    let urlInput = formData.url.trim() || editingChat?.url || '';
    if (!urlInput) {
      toast.error('Please enter a valid URL (include https://)');
      return;
    }
    if (!/^https?:\/\//i.test(urlInput)) {
      urlInput = `https://${urlInput}`;
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = new URL(urlInput).toString();
    } catch (error) {
      logSilentError('ChatForm.urlNormalization', error);
      toast.error('Please enter a valid URL (include https://)');
      return;
    }

    const workspace = (formData.workspace || 'General').trim() || 'General';
    const tags = Array.from(
      new Set(
        (formData.tags || []).map((tag) => sanitizeTagLabel(tag).toLowerCase()).filter(Boolean)
      )
    );

    const base = {
      ...formData,
      title,
      url: normalizedUrl,
      workspace,
      tags,
    };

    setFormData((prev) => ({
      ...prev,
      ...base,
    }));

    try {
      await flushDraft();
      const platform = detectPlatform(normalizedUrl);
      await finalizeDraft(draftId, async () => {
        if (editingChat) {
          await updateChat({
            ...editingChat,
            ...base,
            platform,
          });
          toast.success('Bookmark updated!');
        } else {
          await addChat({ ...base, platform });
          toast.success('Bookmark added!');
        }
      });
      discardDraft();
      setResumedDraftAt(null);
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save bookmark';
      toast.error(message);
    }
  };

  const handleClose = () => {
    // Preserve draft and navigate back to list
    saveImmediate();
    setCurrentView('list');
    setEditingChat(null);
  };

  const handleAddTag = () => {
    const safeTag = sanitizeTagLabel(currentTag).toLowerCase();
    if (safeTag && !(formData.tags || []).includes(safeTag)) {
      setFormData((prev) => ({ ...prev, tags: [...(prev.tags || []), safeTag] }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const safeTag = sanitizeTagLabel(tagToRemove).toLowerCase();
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((tag) => tag !== safeTag),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-[12px]">
      <div className="flex items-center p-2 border-b bg-background/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="xs"
          className="h-7 mr-1.5 rounded-full px-2.5 text-[11.5px] font-medium text-foreground/80 hover:bg-[hsl(var(--surface-contrast))] hover:text-foreground"
          onClick={() => handleClose()}
          aria-label="Back"
          withIcon
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <h2 className="text-sm font-semibold">
          {editingChat ? 'Edit Chat Bookmark' : 'Create Chat Bookmark'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                <span>
                  Another window saved new edits{' '}
                  {formatRelativeTime(draftConflict.remote.updatedAt)}.
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleApplyRemoteDraft}>
                    Use remote
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDismissConflict}>
                    Keep mine
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

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
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                className="pl-8 pr-3 h-8 text-[12px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[12px] font-medium">
              Title *
            </Label>
            <Input
              id="title"
              placeholder="Enter a descriptive title..."
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              required
              className="h-8 text-[12px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workspace" className="text-[12px] font-medium">
              Workspace
            </Label>
            <WorkspaceSelect
              value={formData.workspace}
              onChange={(value) => setFormData((prev) => ({ ...prev, workspace: value }))}
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
                variant="default"
                disabled={!newWorkspace.trim()}
                onClick={() => {
                  const ws = newWorkspace.trim();
                  if (ws && !workspaces.includes(ws)) {
                    useUnifiedStore.getState().addWorkspace(ws);
                    setFormData((prev) => ({ ...prev, workspace: ws }));
                  } else if (ws) {
                    setFormData((prev) => ({ ...prev, workspace: ws }));
                  }
                  setNewWorkspace('');
                }}
                title="Add workspace"
                className={cn(
                  'h-8 rounded-full px-3 text-[12px] font-semibold hover:bg-primary/90',
                  onboardingActive &&
                    'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Tags</Label>
            <TagSelect
              allTags={normalizedAllTags}
              value={formData.tags || []}
              onChange={(next) => setFormData((prev) => ({ ...prev, tags: next }))}
              onDeleteTag={(tag) => {
                const safeTag = sanitizeTagLabel(tag).toLowerCase();
                if (!safeTag) return;
                deleteTag(safeTag);
                setFormData((prev) => ({
                  ...prev,
                  tags: (prev.tags || []).filter((item) => item !== safeTag),
                }));
              }}
            />
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
                variant="default"
                size="sm"
                onClick={handleAddTag}
                disabled={!sanitizeTagLabel(currentTag)}
                title="Add tag"
                className={cn(
                  'h-8 rounded-full px-3 text-[12px] font-semibold hover:bg-primary/90',
                  onboardingActive &&
                    'ring-2 ring-primary ring-offset-2 ring-offset-background'
                )}
              >
                Add
              </Button>
            </div>
            {(formData.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(formData.tags || []).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 h-6 text-[11px]"
                  >
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pin" className="text-[12px] font-medium">
              Pin this bookmark
            </Label>
            <Switch
              id="pin"
              checked={formData.isPinned}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPinned: checked }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-3 py-2 border-t bg-background/80 backdrop-blur-sm">
          <Button
            type="submit"
            disabled={!formData.title.trim()}
            className="h-8 rounded-full px-4 text-[12.5px] font-semibold hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {editingChat ? 'Update' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
};
