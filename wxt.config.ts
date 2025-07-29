import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'DialogDrive',
    description: 'Your AI Project Workspaces Extension',
    version: '1.0.0',
  },
});
