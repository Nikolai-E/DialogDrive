// Script to reset only DialogDrive UI/prefs/drafts without touching prompts/chats.
// Usage: npm run reset:ui
// This launches Chromium with the built extension, opens popup.html, and clears the specific keys.

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function findBuiltExtensionDir(): Promise<string> {
  const candidate = path.resolve('.output', 'chrome-mv3');
  if (fs.existsSync(path.join(candidate, 'manifest.json'))) return candidate;
  throw new Error('Built extension not found. Run "npm run build" first.');
}

function extractExtensionIdFromWorker(worker: any): string | null {
  try {
    const url = worker.url(); // chrome-extension://<id>/_generated_background_page.html or similar
    const match = url.match(/^chrome-extension:\/\/([a-p]{32})\//);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function run() {
  const extPath = await findBuiltExtensionDir();
  const userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dd-reset-'));
  const context: any = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // extensions are only supported in headed mode
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
    ],
  });

  try {
    // Wait for the extension service worker to register so we can read its URL and ID
    const worker = await new Promise<any>((resolve, reject) => {
      const existing = context.serviceWorkers?.();
      if (existing && existing.length > 0) return resolve(existing[0]!);
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for extension service worker')), 5000);
      context.once?.('serviceworker', (sw: any) => {
        clearTimeout(timeout);
        resolve(sw);
      });
    });

    const id = extractExtensionIdFromWorker(worker);
    if (!id) throw new Error('Failed to determine extension ID');

    const page = await context.newPage();
    await page.goto(`chrome-extension://${id}/popup.html`);
    // Execute storage removal in the extension page context
    await page.evaluate(async () => {
      const keys = ['dd:ui:v1', 'dd:prefs:v2', 'dd:drafts:v1'];
      // prefer browser.* but fall back to chrome.*
      const api: any = (globalThis as any).browser?.storage ?? (globalThis as any).chrome?.storage;
      if (!api) throw new Error('Extension storage API not available');
      await api.local.remove(keys);
      await api.sync.remove(keys);
    });

    // Small pause for onChanged listeners to propagate, then done
    await new Promise((r) => setTimeout(r, 200));
  } finally {
    await context.close();
  }
}

run().catch((err) => {
  console.error('[reset:ui] Failed:', err);
  process.exit(1);
});
