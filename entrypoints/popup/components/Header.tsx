import React from 'react';
import { Sparkles, Plus, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { usePromptStore } from '../../../lib/promptStore';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onNewPrompt: () => void;
  onSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewPrompt, onSettings }) => {
  const { currentView } = usePromptStore();

  return (
    <motion.header 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm border-b border-border/80 sticky top-0 z-10"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-primary to-accent/80 rounded-lg flex items-center justify-center shadow-sm">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="text-base font-semibold text-foreground tracking-tight">DialogDrive</h1>
      </div>
      <div className="flex items-center gap-1.5">
        <AnimatePresence>
          {currentView !== 'form' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <Button 
                onClick={onNewPrompt} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 rounded-lg text-xs font-bold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onSettings} 
          className="h-8 w-8 hover:bg-muted rounded-lg"
        >
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </motion.header>
  );
};
