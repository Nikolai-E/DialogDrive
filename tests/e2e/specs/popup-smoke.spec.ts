import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';

function getPopupUrl(extensionUrl: string) {
  return `${extensionUrl}/${POPUP_ROUTE}`;
}

test.describe('Popup smoke', () => {
  test('loads header and allows creating prompt draft', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionUrl));

    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('menuitem', { name: /new prompt/i })).toBeVisible();

  await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    await page.getByLabel('Title').fill('Playwright Smoke Prompt');
    await page.getByLabel('Prompt Text').fill('This is a smoke test prompt body.');

    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  });
});
