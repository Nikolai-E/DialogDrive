import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';
const getPopupUrl = (extensionUrl: string) => `${extensionUrl}/${POPUP_ROUTE}`;

async function openPopup(context: any, extensionUrl: string) {
  const page = await context.newPage();
  await page.goto(getPopupUrl(extensionUrl));
  return page;
}

test.describe('Prompt cancel clears draft', () => {
  test('cancel discards draft after confirmation', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Prompt
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    await page.getByLabel('Title').fill('Cancel Me');
    await page.getByLabel('Prompt Text').fill('Some text to discard');

    // Stub confirm to always accept for this test, then click Cancel
    await page.evaluate(() => {
      // @ts-ignore
      window.confirm = () => true;
    });
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Back on home
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Re-open New Prompt; fields should not contain prior draft
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    await expect(page.getByLabel('Title')).toHaveValue('');
    await expect(page.getByLabel('Prompt Text')).toHaveValue('');
  });
});
