import AxeBuilder from '@axe-core/playwright';

import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';

const popupUrl = (extensionUrl: string) => `${extensionUrl}/${POPUP_ROUTE}`;

test.describe('@smoke extension flows', () => {
  test('popup create prompt workflow passes axe scan', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl(extensionUrl));

    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();
    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    await page.getByLabel('Title').fill('Smoke Prompt');
    await page.getByLabel('Prompt Text').fill('Playwright smoke test prompt body.');
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    const accessibilityScan = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScan.violations, 'Popup should be axe-clean').toEqual([]);
  });

  test('floating save overlay renders and captures basic tag entry', async ({ context }) => {
    const page = await context.newPage();
    await page.route('**/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><main id="root">Dialog platform fixture</main></body></html>',
      });
    });

    await page.goto('https://chatgpt.com/dialogdrive-smoke');

    const host = page.locator('#dialogdrive-floating-save');
    await expect(host).toBeVisible({ timeout: 5000 });

    await host.locator('css=#dd-save-btn').click();
    const modal = host.locator('css=#dd-save-modal');
    await expect(modal).toHaveClass(/show/);

    const tagInput = host.locator('css=#dd-tag-input');
    await tagInput.fill('smoke-tag');
    await tagInput.press('Enter');

    await expect(host.locator('css=#dd-tags .dd-tag')).toHaveCount(1);
  });

  test('text cleaner baseline transforms markdown to plain text', async ({
    context,
    extensionUrl,
  }) => {
    const page = await context.newPage();
    await page.goto(popupUrl(extensionUrl));

    await page.getByRole('tab', { name: /tools/i }).click();
    await page.getByRole('menuitem', { name: /text tools/i }).click();

    const rawInput = page.getByLabel('Input');
    const cleanedOutput = page.locator('#clean');

    await rawInput.fill('# Heading\n\n- Item one\n- Item two');
    await expect(cleanedOutput).toHaveValue(/Heading/);
    await expect(cleanedOutput).not.toHaveValue(/#/);
    await expect(cleanedOutput).not.toHaveValue(/-/);
  });
});
