import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';

function getPopupUrl(extensionUrl: string) {
  return `${extensionUrl}/${POPUP_ROUTE}`;
}

test.describe('Filter dropdown toggle behavior', () => {
  test('Sort dropdown closes on second click', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionUrl));

    // Wait for header to load
    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Find the Sort button by checking for the default sort label
    const sortButton = page
      .locator('button')
      .filter({ hasText: /Recent|Sort|A-Z|Most Used|Pinned First/i })
      .first();
    await expect(sortButton).toBeVisible();

    // Get initial visibility state
    const sortMenu = page.locator('#sort-menu');
    const initiallyVisible = await sortMenu.isVisible().catch(() => false);
    console.log(`Initial state: menu ${initiallyVisible ? 'visible' : 'hidden'}`);

    // First click - should open the menu
    await sortButton.click();
    await page.waitForTimeout(300);

    const afterFirstClick = await sortMenu.isVisible();
    console.log(`After first click: menu ${afterFirstClick ? 'visible' : 'hidden'}`);
    expect(afterFirstClick).toBe(true);

    // Second click on same button - should close the menu
    await sortButton.click();
    await page.waitForTimeout(300);

    const afterSecondClick = await sortMenu.isVisible().catch(() => false);
    console.log(`After second click: menu ${afterSecondClick ? 'visible' : 'hidden'}`);
    expect(afterSecondClick).toBe(false);
  });

  test('Workspace dropdown closes on second click', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionUrl));

    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    const workspaceButton = page.locator('button').filter({ hasText: 'Workspace' }).first();
    await expect(workspaceButton).toBeVisible();

    const workspaceMenu = page.locator('#workspace-menu');

    // First click - open
    await workspaceButton.click();
    await page.waitForTimeout(300);

    const afterFirstClick = await workspaceMenu.isVisible();
    console.log(`After first click: workspace menu ${afterFirstClick ? 'visible' : 'hidden'}`);
    expect(afterFirstClick).toBe(true);

    // Second click - close
    await workspaceButton.click();
    await page.waitForTimeout(300);

    const afterSecondClick = await workspaceMenu.isVisible().catch(() => false);
    console.log(`After second click: workspace menu ${afterSecondClick ? 'visible' : 'hidden'}`);
    expect(afterSecondClick).toBe(false);
  });

  test('Tools dropdown closes on second click', async ({ context, extensionUrl }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionUrl));

    await expect(page.getByRole('heading', { name: 'DialogDrive' })).toBeVisible();

    // Tools is a tab button with "Tools" text
    const toolsButton = page.getByRole('tab', { name: /tools/i });
    await expect(toolsButton).toBeVisible();

    const toolsMenu = page.locator('#tools-menu');

    // First click - open
    await toolsButton.click();
    await page.waitForTimeout(300);

    const afterFirstClick = await toolsMenu.isVisible();
    console.log(`After first click: tools menu ${afterFirstClick ? 'visible' : 'hidden'}`);
    expect(afterFirstClick).toBe(true);

    // Second click - close
    await toolsButton.click();
    await page.waitForTimeout(300);

    const afterSecondClick = await toolsMenu.isVisible().catch(() => false);
    console.log(`After second click: tools menu ${afterSecondClick ? 'visible' : 'hidden'}`);
    expect(afterSecondClick).toBe(false);
  });
});
