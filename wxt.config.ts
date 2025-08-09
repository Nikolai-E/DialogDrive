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
      // Data persistence
      'storage',
      // Tab querying & messaging to active tab (replaces previous activeTab usage)
      'tabs',
      // Clipboard copy fallback for prompt pasting
      'clipboardWrite',
      // User interaction surfaces
      'contextMenus',
      'notifications',
      'sidePanel'
    ],
    // Restrict host permissions to only AI chat domains actually integrated.
    // Previously used <all_urls> (over-broad, store review risk).
    host_permissions: [
      'https://chatgpt.com/*',
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
    // Updated to use icon_* assets (consistent blue D artwork)
    icons: {
      16: 'icon/icon_16.png',
      19: 'icon/icon_19.png', // toolbar @2x for some browsers  
      32: 'icon/icon_32.png',
      38: 'icon/icon_38.png', // toolbar @2x for some browsers
      48: 'icon/icon_48.png',
      128: 'icon/icon_128.png',
      256: 'icon/icon_256.png'
    }
  },
});
