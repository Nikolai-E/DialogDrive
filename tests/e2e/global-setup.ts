import type { FullConfig } from '@playwright/test';
import { buildExtension } from './helpers/build-extension';

export default async function globalSetup(_: FullConfig) {
  const extensionPath = await buildExtension();
  process.env.DD_EXTENSION_PATH = extensionPath;
}
