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
      'clipboardWrite'
    ],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*'
    ],
    icons: {
      16: 'icon/DialogDriveIcon.png',
      32: 'icon/DialogDriveIcon.png',
      48: 'icon/DialogDriveIcon.png',
      96: 'icon/DialogDriveIcon.png',
      128: 'icon/DialogDriveIcon.png'
    }
  },
});
