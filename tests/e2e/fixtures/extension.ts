import { test as base, chromium } from '@playwright/test';

const REQUIRED_ENV = 'DD_EXTENSION_PATH';

type ExtensionFixtures = {
  extensionPath: string;
  extensionId: string;
  extensionUrl: string;
};

export const test = base.extend<ExtensionFixtures>({
  extensionPath: async ({}, use) => {
    const extensionPath = process.env[REQUIRED_ENV];
    if (!extensionPath) {
      throw new Error(`Missing ${REQUIRED_ENV} environment variable. Did global setup run?`);
    }
    await use(extensionPath);
  },
  context: async ({ extensionPath }, use, testInfo) => {
    if (testInfo.project.name !== 'chromium-extension') {
      throw new Error('Extension tests currently support the chromium-extension project only.');
    }

    const userDataDir = testInfo.outputPath('user-data');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker');
    }
    const url = worker.url();
    const [, , id] = url.split('/');
    if (!id) {
      throw new Error(`Unable to derive extension id from service worker url: ${url}`);
    }
    await use(id);
  },
  extensionUrl: async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}`);
  },
});

export const expect = test.expect;
