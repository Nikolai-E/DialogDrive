import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';
const getPopupUrl = (extensionUrl: string) => `${extensionUrl}/${POPUP_ROUTE}`;

async function openPopup(context: any, extensionUrl: string) {
  const page = await context.newPage();
  await page.goto(getPopupUrl(extensionUrl));
  return page;
}

test.describe('UI Consistency - No redundant buttons', () => {
  test('PromptForm has no Cancel button - only Back and Submit', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Prompt
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    // Verify Back button exists
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

    // Verify Submit button exists - use type="submit" to distinguish from menu Create button
    await expect(page.locator('button[type="submit"]', { hasText: /create/i })).toBeVisible();

    // Verify NO Cancel button exists
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible();
  });

  test('ChatForm has no Cancel button - only Back and Save', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Chat
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    await expect(page.getByRole('heading', { name: /create chat bookmark/i })).toBeVisible();

    // Verify Back button exists
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();

    // Verify Save button exists (may be disabled initially)
    const saveButton = page.getByRole('button', { name: /save/i });
    await expect(saveButton).toBeVisible();

    // Verify NO Cancel button exists
    await expect(page.getByRole('button', { name: 'Cancel' })).not.toBeVisible();
  });
});

test.describe('Back button navigation', () => {
  test('Back button preserves draft in PromptForm', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Prompt
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    // Fill in form
    await page.getByLabel('Title').fill('Draft Title');
    await page.getByLabel('Prompt Text').fill('Draft prompt text');

    // Click Back button
    await page.getByRole('button', { name: /back/i }).click();

    // Should return to home
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Re-open New Prompt
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    // Draft should be restored
    await expect(page.getByLabel('Title')).toHaveValue('Draft Title');
    await expect(page.getByLabel('Prompt Text')).toHaveValue('Draft prompt text');
  });

  test('Back button preserves draft in ChatForm', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Chat
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    await expect(page.getByRole('heading', { name: /create chat bookmark/i })).toBeVisible();

    // Fill in form
    await page.getByLabel('URL').fill('https://chat.openai.com/test');
    await page.getByLabel('Title').fill('Test Bookmark');

    // Click Back button
    await page.getByRole('button', { name: /back/i }).click();

    // Should return to home
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Re-open New Chat
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    // Draft should be restored
    await expect(page.getByLabel('URL')).toHaveValue('https://chat.openai.com/test');
    await expect(page.getByLabel('Title')).toHaveValue('Test Bookmark');
  });
});

test.describe('Panel navigation', () => {
  test('Can navigate to Settings and back', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open Settings using the settings button in header
    await page.locator('button[aria-label="Open settings"]').click();

    // Settings page should show
    await expect(page.getByRole('heading', { name: /prompt picker trigger/i })).toBeVisible();

    // ESC should go back (global shortcut)
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  });

  test('Can navigate to Library and back', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open Library using tab button
    await page.getByRole('tab', { name: /library/i }).click();

    // Library page should show
    await expect(page.getByRole('heading', { name: /prompt library/i })).toBeVisible();

    // ESC should go back
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  });

  test('Can navigate to Text Cleaner and back', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open Tools menu
    await page.getByRole('tab', { name: /tools/i }).click();
    
    // Click Text Tools menu item
    await page.getByRole('menuitem', { name: /text tools/i }).click();

    // Text Cleaner should show with Input/Cleaned labels
    await expect(page.getByText('Input')).toBeVisible();
    await expect(page.getByText('Cleaned')).toBeVisible();

    // ESC should go back
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  });
});

test.describe('ESC key navigation', () => {
  test('ESC exits PromptForm without confirmation', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Prompt
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    // Fill in some data
    await page.getByLabel('Title').fill('Test');

    // Press ESC
    await page.keyboard.press('Escape');

    // Should return to home without confirmation
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  });

  test('ESC exits ChatForm without confirmation', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Chat
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /bookmark chat/i }).click();

    await expect(page.getByRole('heading', { name: /create chat bookmark/i })).toBeVisible();

    // Fill in some data
    await page.getByLabel('Title').fill('Test Chat');

    // Press ESC
    await page.keyboard.press('Escape');

    // Should return to home without confirmation
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  });
});

test.describe('Header consistency', () => {
  test('All panels have consistent header styling', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Check PromptForm header
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();
    const promptFormHeader = page.locator('div.border-b').first();
    await expect(promptFormHeader).toBeVisible();
    await page.keyboard.press('Escape');

    // Check ChatForm header
    await page.locator('button[aria-controls="create-menu"]').click();
    await page.getByRole('menuitem', { name: /bookmark chat/i }).click();
    const chatFormHeader = page.locator('div.border-b').first();
    await expect(chatFormHeader).toBeVisible();
    await page.keyboard.press('Escape');

    // Check Library header
    await page.getByRole('tab', { name: /library/i }).click();
    const libraryHeader = page.locator('div.border-b').first();
    await expect(libraryHeader).toBeVisible();
    await page.keyboard.press('Escape');

    // Check TextCleaner header
    await page.getByRole('tab', { name: /tools/i }).click();
    await page.getByRole('menuitem', { name: /text tools/i }).click();
    const cleanerHeader = page.locator('div.border-b').first();
    await expect(cleanerHeader).toBeVisible();
  });
});
