import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';
const getPopupUrl = (extensionUrl: string) => `${extensionUrl}/${POPUP_ROUTE}`;

async function openPopup(context: any, extensionUrl: string) {
  const page = await context.newPage();
  await page.goto(getPopupUrl(extensionUrl));
  return page;
}

test.describe('Prompt Back button preserves draft', () => {
  test('Back button preserves draft and can be resumed', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Prompt
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    await page.getByLabel('Title').fill('Draft Prompt');
    await page.getByLabel('Prompt Text').fill('Some text to preserve');

    // Click Back (no confirmation needed, preserves draft automatically)
    await page.getByRole('button', { name: /back/i }).click();

    // Back on home
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Re-open New Prompt; fields should contain prior draft
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    // Draft should be restored
    await expect(page.getByLabel('Title')).toHaveValue('Draft Prompt');
    await expect(page.getByLabel('Prompt Text')).toHaveValue('Some text to preserve');
  });
});
