// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Settings view that handles management tasks and data wipes.

import { motion } from 'framer-motion';
import { ExternalLink, Folder, Info, Keyboard, RotateCcw, Slash, Tag, Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from '../../../components/ui/button';
import type { PickerTrigger } from '../../../lib/constants';
import { usePrefsStore } from '../../../lib/prefsStore';
import { STORAGE_KEYS } from '../../../lib/storage/constants';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import type { Prompt } from '../../../types/prompt';

export const Settings: React.FC = () => {
  // Tap into shared store to surface stats and destructive actions.
  const {
    prompts,
    workspaces,
    allTags,
    deleteWorkspace,
    deleteTag,
    clearAllData,
    lastClearedAt,
  } = useUnifiedStore();

  // Local state keeps track of the confirmation modal and its form field.
  const [showClearModal, setShowClearModal] = React.useState(false);
  const [confirmationText, setConfirmationText] = React.useState('');
  const [isClearing, setIsClearing] = React.useState(false);
  const pickerTrigger = usePrefsStore((state) => state.pickerTrigger);
  const setPickerTrigger = usePrefsStore((state) => state.setPickerTrigger);
  const prefsRehydrated = usePrefsStore((state) => state._rehydrated);
  const [isResettingUi, setIsResettingUi] = React.useState(false);

  const updatePickerTrigger = (mode: PickerTrigger) => {
    setPickerTrigger(mode);
  };

  // Simple aggregate counters for the quick stats cards.
  const stats = {
    totalPrompts: prompts.length,
    pinnedPrompts: prompts.filter((p: Prompt) => p.isPinned).length,
    totalUsage: prompts.reduce((sum: number, p: Prompt) => sum + p.usageCount, 0),
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-3 pt-2 pb-3 space-y-4 flex-1 overflow-y-auto">
        {/* Prompt Picker Trigger */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2"><Slash className="h-4 w-4"/> Prompt picker trigger</h3>
          <div className="text-[12.5px] text-muted-foreground">Choose how to pop open your saved prompts while you're typing in ChatGPT.</div>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              className={`px-3 py-2 text-[13px] ${pickerTrigger === 'none' ? 'bg-[#1f1f21] text-white' : 'bg-background text-foreground'}`}
              aria-pressed={pickerTrigger === 'none'}
              onClick={() => updatePickerTrigger('none')}
            >None</button>
            <button
              className={`px-3 py-2 text-[13px] border-l border-border ${pickerTrigger === 'doubleSlash' ? 'bg-[#1f1f21] text-white' : 'bg-background text-foreground'}`}
              aria-pressed={pickerTrigger === 'doubleSlash'}
              onClick={() => updatePickerTrigger('doubleSlash')}
           >// (double slash)</button>
            <button
              className={`px-3 py-2 text-[13px] border-l border-border ${pickerTrigger === 'backslash' ? 'bg-[#1f1f21] text-white' : 'bg-background text-foreground'}`}
              aria-pressed={pickerTrigger === 'backslash'}
              onClick={() => updatePickerTrigger('backslash')}
            >\ (backslash)</button>
          </div>
          <div className="text-[12px] text-muted-foreground">Tip: If you often type // in messages, pick backslash or none.</div>
        </motion.div>
        {/* Keyboard Shortcuts */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2"><Keyboard className="h-4 w-4"/> Keyboard shortcuts</h3>
          <ul className="space-y-1.5 text-[13px]">
            <li className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-1.5">
              <span className="text-foreground/90">Focus search</span>
              <span className="text-xs text-muted-foreground">Ctrl/Cmd + S</span>
            </li>
            <li className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-1.5">
              <span className="text-foreground/90">Bookmark chat</span>
              <span className="text-xs text-muted-foreground">Ctrl/Cmd + B</span>
            </li>
            <li className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-1.5">
              <span className="text-foreground/90">New prompt</span>
              <span className="text-xs text-muted-foreground">Ctrl/Cmd + P</span>
            </li>
            <li className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-1.5">
              <span className="text-foreground/90">Back to list</span>
              <span className="text-xs text-muted-foreground">Escape</span>
            </li>
          </ul>
          <p className="text-[12px] text-muted-foreground">When the popup is focused, these keys take over the browser shortcuts so DialogDrive responds instantly.</p>
        </motion.div>
        {/* Quick stats showing prompt usage. */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground">Quick stats</h3>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-center border border-primary/20">
              <div className="text-[20px] font-bold text-primary">{stats.totalPrompts}</div>
              <div className="text-[12px] text-primary/70">Prompts</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-center border border-amber-200">
              <div className="text-[20px] font-bold text-amber-600">{stats.pinnedPrompts}</div>
              <div className="text-[12px] text-amber-600/70">Pinned</div>
            </div>
            <div className="p-2.5 rounded-xl bg-green-50 text-center border border-green-200">
              <div className="text-[20px] font-bold text-green-600">{stats.totalUsage}</div>
              <div className="text-[12px] text-green-600/70">Uses</div>
            </div>
          </div>
        </motion.div>

        {/* Manage workspaces created by the user. */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2"><Folder className="h-4 w-4"/> Workspaces</h3>
          <p className="text-[12.5px] text-muted-foreground">Workspaces act like folders for different clients or projects. Switch them from the chips above the library to swap context.</p>
          <div className="space-y-1.5">
            {workspaces.filter(w => w !== 'General').length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom workspaces yet.</p>
            ) : (
              <ul className="space-y-1">
                {/* List every custom workspace with a delete affordance. */}
                {workspaces.filter(w => w !== 'General').map(ws => (
                  <li key={ws} className="flex items-center justify-between text-[13px] bg-muted/30 rounded-md px-3 py-1.5">
                    <span>{ws}</span>
                    <Button variant="destructive" size="sm" className="h-7 px-2 text-[11px]" onClick={() => deleteWorkspace(ws)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1"/> Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>

        {/* Manage tags applied across prompts and chats. */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2"><Tag className="h-4 w-4"/> Tags</h3>
          <p className="text-[12.5px] text-muted-foreground">Tags are quick labels you can stack to narrow results. Add them in the editor, tidy them up here.</p>
          <div className="space-y-1.5">
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-1.5">
                {/* Surface each tag with a remove button for quick pruning. */}
                {allTags.map(tag => (
                  <li key={tag} className="flex items-center justify-between text-[13px] bg-muted/30 rounded-md px-3 py-1.5">
                    <span>#{tag}</span>
                    <Button variant="destructive" size="sm" className="h-7 px-2 text-[11px]" onClick={() => deleteTag(tag)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1"/> Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>

        {/* Extension Info */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2"><Info className="h-4 w-4" /> Privacy & data</h3>
          <div className="space-y-2.5 text-[13px] leading-relaxed">
            <p className="text-foreground/85">
              Everything you save - prompts, chat snippets, workspaces, tags, usage counts, preferences - stays on this device. Nothing is uploaded to our servers, and we'll ask before offering any future sync.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-8 text-[12.5px]"
                onClick={() => browser.tabs.create({ url: 'https://chromewebstore.google.com/detail/dialogdrive/belhaomgpobfemnleoglnpnkfkkdechd' })}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Chrome Web Store listing
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Reset settings to defaults (non-destructive) */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.22 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Reset settings</h3>
          <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2.5">
            <p className="text-[13px] leading-relaxed text-foreground/85">
              Restore DialogDrive preferences and filters to their defaults. Your saved prompts and chat bookmarks are not affected.
            </p>
            <Button
              variant="outline"
              className="w-full h-9 text-[13px]"
              disabled={isResettingUi}
              onClick={async () => {
                if (!confirm('Reset settings to defaults? This won\'t delete saved prompts or chats.')) return;
                setIsResettingUi(true);
                try {
                  await Promise.all([
                    browser.storage.sync.remove([STORAGE_KEYS.prefs]),
                    browser.storage.local.remove([STORAGE_KEYS.ui]),
                  ]);
                  setTimeout(() => window.location.reload(), 150);
                } finally {
                  setTimeout(() => setIsResettingUi(false), 400);
                }
              }}
            >
              {isResettingUi ? 'Resetting…' : 'Reset settings'}
            </Button>
          </div>
        </motion.div>

        {/* Clear Local Data */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.25 }}
          className="space-y-2"
        >
          <h3 className="text-[14.5px] font-semibold text-foreground flex items-center gap-2"><Trash2 className="h-4 w-4" /> Clear local data</h3>
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 space-y-2.5">
            <p className="text-[13px] text-destructive/90 leading-relaxed">Erase all prompts, chats, workspaces, tags, preferences, and usage counters saved in this browser.</p>
            <div className="flex items-center justify-between text-[12.5px] text-foreground/80">
              <span>Last cleared</span>
              <span className="font-medium text-foreground">{lastClearedAt ? new Date(lastClearedAt).toLocaleString() : '—'}</span>
            </div>
            <Button
              variant="destructive"
              className="w-full h-9 text-[13px]"
              onClick={() => { setConfirmationText(''); setShowClearModal(true); }}
            >
              Wipe DialogDrive data
            </Button>
            
          </div>
        </motion.div>

        
      </div>

      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
          <div className="w-[360px] rounded-xl border border-destructive/30 bg-card shadow-lg p-4 space-y-3.5">
            <div className="space-y-2">
              <h4 className="text-[15px] font-semibold text-foreground">Type DELETE to confirm</h4>
              <p className="text-[13px] text-foreground/85 leading-relaxed">
                This removes every saved prompt, chat, workspace, tag, usage count, and preference from DialogDrive in this browser. There is no undo.
              </p>
            </div>
            <input
              type="text"
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px]"
              placeholder="DELETE"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && confirmationText === 'DELETE' && !isClearing) {
                  void (async () => {
                    setIsClearing(true);
                    try {
                      await clearAllData();
                      setShowClearModal(false);
                      setConfirmationText('');
                    } finally {
                      setIsClearing(false);
                    }
                  })();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={confirmationText !== 'DELETE' || isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await clearAllData();
                    setShowClearModal(false);
                    setConfirmationText('');
                  } finally {
                    setIsClearing(false);
                  }
                }}
              >
                {isClearing ? 'Clearing…' : 'Confirm Wipe'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowClearModal(false);
                  setConfirmationText('');
                }}
                disabled={isClearing}
              >
                Cancel
              </Button>
            </div>
            <p className="text-[12.5px] text-foreground/80">Tip: To remove just a workspace or tag, use the lists above.</p>
          </div>
        </div>
      )}
    </div>
  );
};

