import React, { useState, useEffect } from 'react';
import { useUnifiedStore } from '../../../lib/unifiedStore';
import type { Prompt } from '../../../types/prompt';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { toast } from "sonner";
import { ArrowLeft, Loader2, Key, Shield, Info, ExternalLink, Zap } from 'lucide-react';
import { logger } from '../../../lib/logger';
import { motion } from 'framer-motion';

export const Settings: React.FC = () => {
  const { setCurrentView, prompts } = useUnifiedStore();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const result = await browser.storage.sync.get('openai-api-key');
        setApiKey(result['openai-api-key'] || '');
      } catch (error) {
        logger.error('Failed to load API key:', error);
        toast.error('Failed to load API key');
      } finally {
        setIsLoading(false);
      }
    };
    loadApiKey();
  }, []);

  const saveApiKey = async () => {
    if (!apiKey.trim() || !apiKey.startsWith('sk-')) {
      toast.error('Please enter a valid OpenAI API key starting with "sk-".');
      return;
    }

    setIsSaving(true);
    try {
      await browser.storage.sync.set({ 'openai-api-key': apiKey });
      toast.success('API key saved successfully!');
    } catch (error) {
      logger.error('Failed to save API key:', error);
      toast.error('Failed to save API key. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveApiKey();
  };

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
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
      </motion.div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
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

            {/* API Key Section */}
            <motion.form
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">OpenAI Integration</h3>
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-sm font-medium text-foreground">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    disabled={isSaving}
                    className="border-border rounded-xl"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Stored securely in your browser</span>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSaving} 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-2.5"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Saving...' : 'Save API Key'}
                </Button>
              </div>
            </motion.form>

            {/* About Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground">About DialogDrive</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Manage and paste AI prompts into ChatGPT, Claude, and Gemini with ease.</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-0">v1.0.0</Badge>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-0">WXT Framework</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">ChatGPT</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">Claude</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">Gemini</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
