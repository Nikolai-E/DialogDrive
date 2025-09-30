import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';
const getPopupUrl = (extensionUrl: string) => `${extensionUrl}/${POPUP_ROUTE}`;

async function openPopup(context: any, extensionUrl: string) {
  const page = await context.newPage();
  await page.goto(getPopupUrl(extensionUrl));
  return page;
}

test.describe('Chat bookmark cancel clears draft', () => {
  test('cancel discards chat draft after confirmation', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

  // Open New Chat (menu item labeled 'Bookmark Chat')
    await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    await expect(page.getByRole('heading', { name: /create chat bookmark/i })).toBeVisible();

    await page.getByLabel('URL').fill('https://chat.openai.com/c/abc');
    await page.getByLabel('Title').fill('Discard Me');

    // Stub confirm to accept, then Cancel
    await page.evaluate(() => {
      // @ts-ignore
      window.confirm = () => true;
    });
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Back to home
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

  // Re-open New Chat; fields should be empty
    await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    await expect(page.getByRole('heading', { name: /create chat bookmark/i })).toBeVisible();
    await expect(page.getByLabel('URL')).toHaveValue('');
    await expect(page.getByLabel('Title')).toHaveValue('');
  });
});
