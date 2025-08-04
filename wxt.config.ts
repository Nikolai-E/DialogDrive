import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  alias: {
    '~': './entrypoints/popup',
    '@': '.',
  },
  manifest: {
    name: 'DialogDrive',
    description: 'Your AI Project Workspaces Extension',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab',
      'scripting',
      'clipboardWrite',
      'contextMenus',
      'notifications',
      'sidePanel'
    ],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*'
    ],
    commands: {
      'paste-latest-prompt': {
        suggested_key: {
          default: 'Ctrl+Shift+P',
          mac: 'Command+Shift+P'
        },
        description: 'Paste the most recently used prompt'
      },
      'save-current-chat': {
        suggested_key: {
          default: 'Ctrl+Shift+B',
          mac: 'Command+Shift+B'
        },
        description: 'Save current chat as bookmark'
      },
      'open-side-panel': {
        suggested_key: {
          default: 'Ctrl+Shift+D',
          mac: 'Command+Shift+D'
        },
        description: 'Open DialogDrive side panel'
      },
      'quick-search': {
        suggested_key: {
          default: 'Ctrl+Shift+F',
          mac: 'Command+Shift+F'
        },
        description: 'Quick search prompts'
      }
    },
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png'
    }
  },
});
