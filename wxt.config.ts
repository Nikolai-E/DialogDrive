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
  version: '1.0.1',
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
    // Ensure the toolbar/action icon uses our branded assets
  action: {
      default_title: 'DialogDrive',
      default_popup: 'popup.html',
      default_icon: {
    16: 'icon/icon-16.png',
    19: 'icon/icon-19.png',
    32: 'icon/icon-32.png',
    38: 'icon/icon-38.png'
      }
    },
  // Use provided dd-icons PNGs for all manifest icons
    icons: {
    16: 'icon/icon-16.png',
    19: 'icon/icon-19.png',
    32: 'icon/icon-32.png',
    38: 'icon/icon-38.png',
    48: 'icon/icon-48.png',
    96: 'icon/icon_96.png',
    128: 'icon/icon-128.png',
    256: 'icon/icon-256.png'
    }
  },
});
