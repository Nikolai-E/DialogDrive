// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Settings view that handles management tasks and data wipes.

import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Folder, Info, Tag, Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import type { Prompt } from '../../../types/prompt';

export const Settings: React.FC = () => {
  // Tap into shared store to surface stats and destructive actions.
  const {
    setCurrentView,
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

  // Simple aggregate counters for the quick stats cards.
  const stats = {
    totalPrompts: prompts.length,
    pinnedPrompts: prompts.filter((p: Prompt) => p.isPinned).length,
    totalUsage: prompts.reduce((sum: number, p: Prompt) => sum + p.usageCount, 0),
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center p-4 border-b border-border"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 mr-3 hover:bg-muted rounded-xl"
          onClick={() => setCurrentView('list')}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
      </motion.div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {/* Quick stats showing prompt usage. */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-center border border-primary/20">
              <div className="text-2xl font-bold text-primary">{stats.totalPrompts}</div>
              <div className="text-xs text-primary/70">Prompts</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-center border border-amber-200">
              <div className="text-2xl font-bold text-amber-600">{stats.pinnedPrompts}</div>
              <div className="text-xs text-amber-600/70">Pinned</div>
            </div>
            <div className="p-3 rounded-xl bg-green-50 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-600">{stats.totalUsage}</div>
              <div className="text-xs text-green-600/70">Uses</div>
            </div>
          </div>
        </motion.div>

        {/* Manage workspaces created by the user. */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Folder className="h-4 w-4"/> Manage Workspaces</h3>
          <div className="space-y-2">
            {workspaces.filter(w => w !== 'General').length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom workspaces yet.</p>
            ) : (
              <ul className="space-y-1">
                {/* List every custom workspace with a delete affordance. */}
                {workspaces.filter(w => w !== 'General').map(ws => (
                  <li key={ws} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Tag className="h-4 w-4"/> Manage Tags</h3>
          <div className="space-y-2">
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {/* Surface each tag with a remove button for quick pruning. */}
                {allTags.map(tag => (
                  <li key={tag} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Info className="h-4 w-4" /> Privacy & Data</h3>
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="text-muted-foreground">
              DialogDrive is designed to keep your saved prompts, chat snippets (including URLs), workspaces, tags, usage counts, and UI preferences on this device only. We do not send that content to DialogDrive-operated servers, and if we ever offered optional cloud sync, we would ask you first.
            </p>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 text-foreground/70" />
              <span>
                Depending on your Chrome profile, Google Sync may back up lightweight preferences (for example, layout choices). The Clear Local Data control removes the copies DialogDrive stores locally and issues a wipe request for any synced entries.
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-8 text-xs"
                onClick={() => browser.tabs.create({ url: 'https://chromewebstore.google.com/detail/dialogdrive' })}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Chrome Web Store Listing
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Clear Local Data */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Trash2 className="h-4 w-4" /> Clear Local Data</h3>
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <p className="text-xs text-destructive/90 leading-relaxed">
              Erase all prompts, chats, workspaces, tags, preferences, and usage counters saved on this browser in one step.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last cleared:</span>
              <span className="font-medium text-foreground">{lastClearedAt ? new Date(lastClearedAt).toLocaleString() : '—'}</span>
            </div>
            <Button
              variant="destructive"
              className="w-full h-9"
              onClick={() => { setConfirmationText(''); setShowClearModal(true); }}
            >
              Wipe DialogDrive Data
            </Button>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
              <Info className="mt-0.5 h-3.5 w-3.5 text-foreground/70" />
              <span>
                If Chrome Sync is enabled, Google may back up lightweight preferences (for example, layout settings). Clearing local data also requests removal of those synced copies.
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur">
          <div className="w-[360px] rounded-xl border border-destructive/30 bg-card shadow-lg p-5 space-y-4">
            <div className="space-y-2">
              <h4 className="text-base font-semibold text-foreground">Type DELETE to confirm</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This removes every saved prompt, chat, workspace, tag, usage count, and preference from DialogDrive on this browser. There is no undo.
              </p>
            </div>
            <input
              type="text"
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            <p className="text-[11px] text-muted-foreground">
              Tip: If you only need to remove a workspace or tag, use the lists above instead.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

