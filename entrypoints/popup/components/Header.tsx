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
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between p-4 bg-white border-b border-gray-100"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">DialogDrive</h1>
      </div>
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {currentView !== 'form' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Button 
                onClick={onNewPrompt} 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onSettings} 
          className="h-9 w-9 hover:bg-gray-100 rounded-xl"
        >
          <SettingsIcon className="h-4 w-4 text-gray-600" />
        </Button>
      </div>
    </motion.header>
  );
};
