import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';

function getPopupUrl(extensionUrl: string) {
  return `${extensionUrl}/${POPUP_ROUTE}`;
}

test.describe('Text cleaner advanced controls', () => {
  test('horizontal rule and emoji toggles adjust output', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionUrl));

    await page.getByRole('tab', { name: /tools/i }).click();
    await page.getByRole('menuitem', { name: /text tools/i }).click();

    const rawInput = page.getByLabel('Input');
    const cleanedOutput = page.locator('#clean');

    const sample = [
      '## Sprint Update — Week 22',
      '---',
      '- Polish landing page 🙂',
      '- QA pass 🙂',
    ].join('\n');

    await rawInput.fill(sample);

    await expect(cleanedOutput).not.toHaveValue(/---/);
    await expect(cleanedOutput).toHaveValue(/🙂/);

    await page.getByRole('button', { name: /show advanced/i }).click();

    const dropRules = page.getByRole('switch', { name: /drop horizontal rules/i });
    await dropRules.click();
    await expect(dropRules).toHaveAttribute('aria-checked', 'false');
    await expect(cleanedOutput).toHaveValue(/---/);

    const stripEmojis = page.getByRole('switch', { name: /strip emojis/i });
    await stripEmojis.click();
    await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');
    await expect(cleanedOutput).not.toHaveValue(/🙂/);
  });
});
