import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';
const getPopupUrl = (extensionUrl: string) => `${extensionUrl}/${POPUP_ROUTE}`;

async function openPopup(context: any, extensionUrl: string) {
  const page = await context.newPage();
  await page.goto(getPopupUrl(extensionUrl));
  return page;
}

test.describe('Chat bookmark Back button preserves draft', () => {
  test('Back button preserves chat draft and can be resumed', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Chat (menu item labeled 'Bookmark Chat')
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    await expect(page.getByRole('heading', { name: /create chat bookmark/i })).toBeVisible();

    await page.getByLabel('URL').fill('https://chat.openai.com/c/abc');
    await page.getByLabel('Title').fill('Draft Bookmark');

    // Click Back (no confirmation, preserves draft automatically)
    await page.getByRole('button', { name: /back/i }).click();

    // Back to home
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Re-open New Chat; fields should contain the draft
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    await expect(page.getByRole('heading', { name: /create chat bookmark/i })).toBeVisible();

    // Draft should be restored
    await expect(page.getByLabel('URL')).toHaveValue('https://chat.openai.com/c/abc');
    await expect(page.getByLabel('Title')).toHaveValue('Draft Bookmark');
  });
});
