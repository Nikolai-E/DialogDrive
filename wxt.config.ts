import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  alias: {
    '~': './entrypoints/popup',
    '@': '.',
  },
  manifest: {
    name: 'DialogDrive',
    description: 'Your AI Project Workspaces Extension',
    version: '1.0.2',
    permissions: [
      'storage',
      'tabs',
      'clipboardWrite',
      'contextMenus',
      'notifications',
      'sidePanel'
    ],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*'
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
    icons: {
      16: 'icon/icon-16.png',
      19: 'icon/icon-19.png',
      32: 'icon/icon-32.png',
      38: 'icon/icon-38.png',
      48: 'icon/icon-48.png',
      128: 'icon/icon-128.png',
      256: 'icon/icon-256.png'
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
    }
  },
});
