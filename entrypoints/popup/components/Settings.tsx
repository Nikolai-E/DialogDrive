import React, { useState, useEffect } from 'react';
import { showToast } from './ToastProvider';
import { logger } from '~/lib/logger';

interface SettingsProps {
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) {
        const result = await browser.storage.sync.get('openai-api-key');
        setApiKey(result['openai-api-key'] || '');
      } else {
        // Fallback to localStorage
        const key = localStorage.getItem('openai-api-key') || '';
        setApiKey(key);
      }
    } catch (error) {
      logger.error('Failed to load API key:', error);
      // Try localStorage fallback
      try {
        const key = localStorage.getItem('openai-api-key') || '';
        setApiKey(key);
      } catch (localError) {
        logger.error('localStorage fallback failed:', localError);
        showToast.error('Failed to load API key');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      showToast.error('Please enter a valid API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      showToast.error('OpenAI API keys should start with "sk-"');
      return;
    }

    setIsSaving(true);

    try {
      let success = false;
      
      // Try browser storage first
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) {
        try {
          await browser.storage.sync.set({ 'openai-api-key': apiKey });
          success = true;
          logger.log('API key saved to browser storage');
        } catch (browserError) {
          logger.error('Browser sync storage failed:', browserError);
        }
      }
      
      // Fallback to localStorage
      if (!success) {
        localStorage.setItem('openai-api-key', apiKey);
        success = true;
        logger.log('API key saved to localStorage');
      }
      
      if (success) {
        showToast.success('API key saved successfully!');
      } else {
        throw new Error('All storage methods failed');
      }
    } catch (error) {
      logger.error('Failed to save API key:', error);
      showToast.error('Failed to save API key. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveApiKey();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title="Close Settings"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* API Key Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-800 mb-3">
              OpenAI API Configuration
            </h3>
            
            <div className="space-y-3">
              <div>
                <label 
                  htmlFor="apiKey" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  API Key
                </label>
                {isLoading ? (
                  <div className="w-full h-10 bg-gray-100 rounded-md animate-pulse"></div>
                ) : (
                  <input
                    type="password"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Used for prompt improvement feature. Get your API key from{' '}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>

              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {isSaving ? 'Saving...' : 'Save API Key'}
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-800 mb-3">
              Features
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Prompt library management</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Cross-site prompt injection</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Workspace organization</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>AI prompt improvement (requires API key)</span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-sm font-medium text-gray-800 mb-3">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>New prompt</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+N</kbd>
              </div>
              <div className="flex justify-between">
                <span>Search prompts</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+F</kbd>
              </div>
              <div className="flex justify-between">
                <span>Close forms/settings</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Escape</kbd>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-800 mb-3">
              About
            </h3>
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                <strong>DialogDrive v1.0.0</strong>
              </p>
              <p>
                Your AI prompt library and assistant for ChatGPT, Claude, and Gemini.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
