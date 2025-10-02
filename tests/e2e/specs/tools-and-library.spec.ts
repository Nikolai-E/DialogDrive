import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';
function getPopupUrl(extensionUrl: string) {
  return `${extensionUrl}/${POPUP_ROUTE}`;
}

test.describe('Tools dropdown and Library', () => {
  test('shows Tools dropdown with Text Tools and opens it', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionUrl));

    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Open Tools
    await page.getByRole('tab', { name: /tools/i }).click();
    await expect(page.getByRole('menuitem', { name: /text tools/i })).toBeVisible();

    // Open Text Tools
    await page.getByRole('menuitem', { name: /text tools/i }).click();
    // Verify cleaner panel markers
    await expect(page.getByText(/input/i).first()).toBeVisible();
    await expect(page.getByText(/cleaned/i).first()).toBeVisible();
  });

  test('Library tab lists premade prompts and Add works', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionUrl));

    // Switch to Library tab
    await page.getByRole('tab', { name: /library/i }).click();

    await expect(page.getByRole('heading', { name: /prompt library/i })).toBeVisible();

    // Add the specific new example: Bug report template
    const card = page.getByRole('heading', { name: /bug report template/i }).locator('..').locator('..');
    const addBtn = card.getByRole('button', { name: /^select/i });
    await addBtn.click();
    await expect(addBtn).toHaveText(/selected/i);
  });
});
