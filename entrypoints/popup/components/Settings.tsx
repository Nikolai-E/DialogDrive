import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Folder, Info, Shield, Tag, Trash2 } from 'lucide-react';
import React from 'react';
import { Button } from '../../../components/ui/button';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import type { Prompt } from '../../../types/prompt';

export const Settings: React.FC = () => {
  const { setCurrentView, prompts, workspaces, allTags, deleteWorkspace, deleteTag } = useUnifiedStore();

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
        {/* Quick Stats */}
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


        {/* Manage Workspaces */}
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

        {/* Manage Tags */}
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

        {/* Privacy & Support */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy & Support</h3>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">DialogDrive stores all data locally. No analytics, tracking, or external data transfer.</p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start h-8 text-xs" onClick={() => browser.tabs.create({ url: 'https://github.com/Nikolai-E/DialogDrive/blob/main/PRIVACY_POLICY.md' })}>
                <Shield className="h-3.5 w-3.5 mr-2" /> Privacy Policy
              </Button>
              <Button variant="outline" className="justify-start h-8 text-xs" onClick={() => browser.tabs.create({ url: 'https://github.com/Nikolai-E/DialogDrive/issues' })}>
                <Info className="h-3.5 w-3.5 mr-2" /> Support & Issues
              </Button>
              <Button variant="outline" className="justify-start h-8 text-xs" onClick={() => browser.tabs.create({ url: 'https://github.com/Nikolai-E/DialogDrive' })}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Source Code
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
