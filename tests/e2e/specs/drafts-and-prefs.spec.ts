import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';
const getPopupUrl = (extensionUrl: string) => `${extensionUrl}/${POPUP_ROUTE}`;

// Helper selectors
const selectors = {
  header: () => ({ role: 'heading', name: 'DialogDrive' as const }),
  createMenuButton: () => ({ role: 'button', name: 'Create' as const }),
  newPromptItem: () => ({ role: 'menuitem', name: /new prompt/i }),
  newChatItem: () => ({ role: 'menuitem', name: /new chat/i }),
  promptTitle: () => ({ label: 'Title' }),
  promptText: () => ({ label: 'Prompt Text' }),
  back: () => ({ role: 'button', name: /back/i }),
  draftResumed: () => ({ role: 'alert' as const, name: /draft resumed/i }),
  cleanerShow: () => ({ role: 'button', name: /show what this cleaner does/i }),
  cleanerHide: () => ({ role: 'button', name: /hide/i }),
};

async function openPopup(context: any, extensionUrl: string) {
  const page = await context.newPage();
  await page.goto(getPopupUrl(extensionUrl));
  return page;
}

test.describe('Draft restore and prefs persistence', () => {
  test('prompt draft restores after navigating away and back', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

    // Open New Prompt
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    await expect(page.getByRole('heading', { name: /create new prompt/i })).toBeVisible();

    await page.getByLabel('Title').fill('Draft Title A');
    await page.getByLabel('Prompt Text').fill('Some draft body...');

    // Navigate back (draft should autosave)
    await page.getByRole('button', { name: /back/i }).click();

    // Re-open prompt create, expect alert or fields hydrated
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('menuitem', { name: /new prompt/i }).click();

    // Either the banner or the fields must reflect saved data
    const titleValue = await page.getByLabel('Title').inputValue();
    const textValue = await page.getByLabel('Prompt Text').inputValue();
    expect(titleValue).toBe('Draft Title A');
    expect(textValue).toContain('Some draft body');
  });

  test('cleaner tips visibility persists across sessions', async ({ context, extensionUrl }) => {
    const page = await openPopup(context, extensionUrl);

  // Navigate to the cleaner tab via header nav
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();
  // Open cleaner (the control is a button labeled "Cleaner")
  await page.getByRole('button', { name: /cleaner/i }).click();

    // If tips are showing, hide them; if hidden, show then hide
    const showButton = page.getByRole('button', { name: /show what this cleaner does/i });
    const hideButton = page.getByRole('button', { name: /hide/i });

    if (await showButton.isVisible()) {
      await showButton.click();
      await hideButton.click();
    } else {
      await hideButton.click();
    }
    // Allow async storage write to settle
    await page.waitForTimeout(400);

  // Reload popup and ensure hidden remains hidden
  await page.reload();

  await page.getByRole('button', { name: /cleaner/i }).click();
  // After hydration the description block should not be present; the Show button should be visible
  await expect(page.getByRole('button', { name: /show what this cleaner does/i })).toBeVisible();
  });
});
