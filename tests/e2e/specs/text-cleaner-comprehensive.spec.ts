import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';

function getPopupUrl(extensionUrl: string) {
  return `${extensionUrl}/${POPUP_ROUTE}`;
}

test.describe('Text Cleaner - Comprehensive Tests', () => {
  test.beforeEach(async ({ page, extensionUrl }) => {
    await page.goto(getPopupUrl(extensionUrl));
    await page.getByRole('tab', { name: /tools/i }).click();
    await page.getByRole('menuitem', { name: /text tools/i }).click();
  });

  test.describe('Markdown removal', () => {
    test('removes headings entirely when dropHeadings is true', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const sample = [
        '### Sprint Update',
        '---',
        'Some content here',
        '### Another Heading',
        'More content',
        '---',
      ].join('\n');

      await rawInput.fill(sample);

      const cleaned = await cleanedOutput.inputValue();
      // At least one heading is dropped entirely
      expect(cleaned).not.toContain('Sprint Update');
      // Horizontal rules should be dropped
      expect(cleaned).not.toContain('---');
      // Regular content should remain
      expect(cleaned).toContain('Some content here');
      expect(cleaned).toContain('More content');
    });

    test('removes all markdown when "Remove Markdown" is enabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const sample = [
        '# Big Heading',
        '## Subheading',
        '',
        '- First item',
        '- Second item',
        '',
        '**Bold text** and *italic*',
        '',
        '---',
      ].join('\n');

      await rawInput.fill(sample);

      const cleaned = await cleanedOutput.inputValue();

      // No bullet markers (unwrapped to sentences)
      expect(cleaned).not.toContain('- ');
      // No horizontal rules
      expect(cleaned).not.toContain('---');
      // No emphasis markers
      expect(cleaned).not.toContain('**');

      // Headings are dropped entirely by default
      expect(cleaned).not.toContain('Big Heading');
      expect(cleaned).not.toContain('Subheading');

      // List content unwrapped to sentences
      expect(cleaned).toContain('First item');
      expect(cleaned).toContain('Second item');
      expect(cleaned).toContain('Bold text');
      expect(cleaned).toContain('italic');
    });

    test('preserves markdown when "Remove Markdown" is disabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');
      const removeMarkdownToggle = page.getByRole('switch', { name: /toggle remove markdown/i });

      // Disable Remove Markdown
      await removeMarkdownToggle.click();
      await expect(removeMarkdownToggle).toHaveAttribute('aria-checked', 'false');

      const sample = '- Item 1\n- Item 2';
      await rawInput.fill(sample);

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('-');
      expect(cleaned).toContain('Item 1');
    });
  });

  test.describe('AI Signs removal (punctuation)', () => {
    test('converts em dashes to commas when enabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      await rawInput.fill('This is a sentence \u2014 with an em dash \u2014 and another');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('\u2014');
      expect(cleaned).toContain(', ');
    });

    test('converts curly quotes to straight quotes when enabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      await rawInput.fill('\u201CSmart quotes\u201D and \u2018single smart quotes\u2019');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('\u201C');
      expect(cleaned).not.toContain('\u201D');
      expect(cleaned).not.toContain('\u2018');
      expect(cleaned).not.toContain('\u2019');
      expect(cleaned).toContain('"');
      expect(cleaned).toContain("'");
    });

    test('converts ellipsis to three dots when enabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      await rawInput.fill('Wait\u2026 really?');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('\u2026');
      expect(cleaned).toContain('...');
    });

    test('preserves special punctuation when AI cleanup is disabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');
      const aiCleanupToggle = page.getByRole('switch', { name: /toggle remove ai signs/i });

      // Disable AI cleanup
      await aiCleanupToggle.click();
      await expect(aiCleanupToggle).toHaveAttribute('aria-checked', 'false');

      await rawInput.fill(
        'Test \u2014 with em dash and \u201Ccurly quotes\u201D and ellipsis\u2026'
      );

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('\u2014');
      expect(cleaned).toContain('\u201C');
      expect(cleaned).toContain('\u201D');
      expect(cleaned).toContain('\u2026');
    });

    test('individual punctuation controls work in advanced mode', async ({ page }) => {
      await page.getByTestId('toggle-advanced-controls').click();
      await expect(page.getByTestId('advanced-controls')).toBeVisible();
      
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      // Test em dash control - use data-testid
      await page.getByTestId('option-em-dash-keep').click();
      
      await rawInput.fill('Test \u2014 dash');
      await page.waitForTimeout(100); // Wait for reactive update
      let cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('\u2014');

      // Test ellipsis removal
      await page.getByTestId('option-ellipsis-remove').click();
      
      await rawInput.fill('Test\u2026');
      await page.waitForTimeout(100);
      cleaned = await cleanedOutput.inputValue();
      expect(cleaned.trim()).toBe('Test');
    });
  });  test.describe('Anonymize contacts', () => {
    test('redacts URLs when enabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      await page.getByRole('switch', { name: /toggle anonymize contacts/i }).click();

      await rawInput.fill('Check out https://example.com and www.test.org');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('example.com');
      expect(cleaned).not.toContain('test.org');
      expect(cleaned).toContain('<URL>');
    });

    test('redacts emails when enabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      await page.getByRole('switch', { name: /toggle anonymize contacts/i }).click();

      await rawInput.fill('Contact me at test@example.com or support@test.org');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('test@example.com');
      expect(cleaned).not.toContain('support@test.org');
      expect(cleaned).toContain('<EMAIL>');
    });

    test('preserves contacts when disabled', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      // Anonymize should be disabled by default
      await rawInput.fill('Visit https://example.com or email test@example.com');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('example.com');
      expect(cleaned).toContain('test@example.com');
      expect(cleaned).not.toContain('<URL>');
      expect(cleaned).not.toContain('<EMAIL>');
    });
  });

  test.describe('Emoji stripping', () => {
    test('strips emojis when enabled', async ({ page }) => {
      await page.getByRole('button', { name: /show advanced/i }).click();

      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');
      const stripEmojis = page.getByRole('switch', { name: /strip emojis/i });

      await stripEmojis.click();
      await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');

      await rawInput.fill('Great work! \uD83C\uDF89 Keep it up \uD83D\uDC4D Love it \u2764\uFE0F');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('\uD83C\uDF89');
      expect(cleaned).not.toContain('\uD83D\uDC4D');
      expect(cleaned).not.toContain('\u2764');
      expect(cleaned).toContain('Great work!');
      expect(cleaned).toContain('Keep it up');
    });

    test('preserves emojis by default', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      await rawInput.fill('Test \uD83D\uDE0A emoji \uD83D\uDE80');

      const cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('\uD83D\uDE0A');
      expect(cleaned).toContain('\uD83D\uDE80');
    });
  });

  test.describe('Option independence', () => {
    test('toggling punctuation does not affect emoji stripping', async ({ page }) => {
      await page.getByRole('button', { name: /show advanced/i }).click();

      const stripEmojis = page.getByRole('switch', { name: /strip emojis/i });
      const aiCleanupToggle = page.getByRole('switch', { name: /toggle remove ai signs/i });

      // Enable emoji stripping
      await stripEmojis.click();
      await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');

      // Toggle AI cleanup off and on
      await aiCleanupToggle.click();
      await expect(aiCleanupToggle).toHaveAttribute('aria-checked', 'false');

      // Emoji stripping should still be on
      await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');

      await aiCleanupToggle.click();
      await expect(aiCleanupToggle).toHaveAttribute('aria-checked', 'true');

      // Emoji stripping should STILL be on
      await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');
    });

    test('toggling markdown removal does not affect emoji stripping', async ({ page }) => {
      await page.getByRole('button', { name: /show advanced/i }).click();

      const stripEmojis = page.getByRole('switch', { name: /strip emojis/i });
      const removeMarkdownToggle = page.getByRole('switch', { name: /toggle remove markdown/i });

      // Enable emoji stripping
      await stripEmojis.click();
      await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');

      // Toggle markdown removal off and on
      await removeMarkdownToggle.click();
      await expect(removeMarkdownToggle).toHaveAttribute('aria-checked', 'false');

      // Emoji stripping should still be on
      await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');

      await removeMarkdownToggle.click();
      await expect(removeMarkdownToggle).toHaveAttribute('aria-checked', 'true');

      // Emoji stripping should STILL be on
      await expect(stripEmojis).toHaveAttribute('aria-checked', 'true');
    });

    test('each toggle operates independently', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const removeMarkdown = page.getByRole('switch', { name: /toggle remove markdown/i });
      const aiCleanup = page.getByRole('switch', { name: /toggle remove ai signs/i });
      const anonymize = page.getByRole('switch', { name: /toggle anonymize contacts/i });

      // Check current state and disable all
      const isAnonymizeOn = await anonymize.getAttribute('aria-checked');

      await removeMarkdown.click(); // Turn off
      await aiCleanup.click(); // Turn off
      if (isAnonymizeOn === 'true') {
        await anonymize.click(); // Turn off if it's on
      }

      await rawInput.fill('\u2013 Test \u2014 item with https://example.com');
      await page.waitForTimeout(100);
      let cleaned = await cleanedOutput.inputValue();

      // All features should be off
      expect(cleaned).toContain('\u2013');
      expect(cleaned).toContain('\u2014');
      expect(cleaned).toContain('example.com');

      // Enable only anonymize
      await anonymize.click();
      await page.waitForTimeout(100);
      cleaned = await cleanedOutput.inputValue();

      expect(cleaned).toContain('\u2013'); // Markdown still preserved
      expect(cleaned).toContain('\u2014'); // Punctuation still preserved
      expect(cleaned).toContain('<URL>'); // But URLs redacted
    });
  });

  test.describe('Advanced controls', () => {
    test('horizontal rule toggle works correctly', async ({ page }) => {
      await page.getByRole('button', { name: /show advanced/i }).click();

      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');
      const dropRules = page.getByRole('switch', { name: /drop horizontal rules/i });

      const sample = '## Update\n---\nContent here';
      await rawInput.fill(sample);

      // By default, horizontal rules should be dropped
      let cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('---');

      // Turn off dropping
      await dropRules.click();
      await expect(dropRules).toHaveAttribute('aria-checked', 'false');

      cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('---');
    });

    test('link mode controls work correctly', async ({ page }) => {
      await page.getByRole('button', { name: /show advanced/i }).click();

      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const sample = 'Check [this link](https://example.com)';
      await rawInput.fill(sample);

      // Default is "Text only"
      let cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('this link');
      expect(cleaned).not.toContain('[');
      expect(cleaned).not.toContain('https://example.com');

      // Switch to "Text + URL"
      const textWithUrl = page
        .locator('div')
        .filter({ hasText: /^Links/ })
        .getByRole('button', { name: /text \+ url/i });
      await textWithUrl.click();

      cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('this link');
      expect(cleaned).toContain('https://example.com');
      expect(cleaned).not.toContain('[');

      // Switch to "Markdown"
      const markdown = page
        .locator('div')
        .filter({ hasText: /^Links/ })
        .getByRole('button', { name: /markdown/i });
      await markdown.click();

      cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toContain('[this link](https://example.com)');
    });

    test('list mode controls work correctly', async ({ page }) => {
      await page.getByRole('button', { name: /show advanced/i }).click();

      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const sample = '- First item\n- Second item';
      await rawInput.fill(sample);

      // Default is "Sentences"
      let cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('-');
      expect(cleaned).toContain('First item');

      // Switch to "Bullets"
      const bullets = page
        .locator('div')
        .filter({ hasText: /^Lists/ })
        .getByRole('button', { name: /bullets/i });
      await bullets.click();

      cleaned = await cleanedOutput.inputValue();
      expect(cleaned).toMatch(/[-•] First item/);
    });

    test('code block handling works correctly', async ({ page }) => {
      await page.getByRole('button', { name: /show advanced/i }).click();

      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const sample = 'Text\n```\ncode here\n```\nMore text';
      await rawInput.fill(sample);

      // Default is "Drop"
      let cleaned = await cleanedOutput.inputValue();
      expect(cleaned).not.toContain('code here');

      // Switch to "Keep indented"
      const keepIndented = page
        .locator('div')
        .filter({ hasText: /^Code blocks/ })
        .getByRole('button', { name: /keep indented/i });
      await keepIndented.click();
      await page.waitForTimeout(100);

      cleaned = await cleanedOutput.inputValue();
      // Code should be present and indented (has spaces before it)
      expect(cleaned).toContain('code here');
      const lines = cleaned.split('\n');
      const codeLine = lines.find((l) => l.includes('code here'));
      expect(codeLine).toMatch(/^\s+code here/);
    });
  });

  test.describe('Edge cases and complex scenarios', () => {
    test('handles empty input gracefully', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      await rawInput.fill('');

      const cleaned = await cleanedOutput.inputValue();
      // May have a final newline due to ensureFinalNewline option
      expect(cleaned.trim()).toBe('');
    });

    test('handles mixed content correctly', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const mixedSample = [
        '# Meeting Notes',
        '---',
        '- Action item one \uD83D\uDCDD',
        '- Item with \u2014 em dash',
        '',
        'Email: contact@example.com',
        'Link: https://example.com',
        '',
        '> Quote with \u201Csmart quotes\u201D',
        '',
        '```',
        'code block',
        '```',
      ].join('\n');

      await rawInput.fill(mixedSample);

      const cleaned = await cleanedOutput.inputValue();

      // Check markdown removed
      expect(cleaned).not.toContain('---');
      expect(cleaned).not.toContain('- ');
      expect(cleaned).not.toContain('```');

      // Check emoji preserved in body (default stripEmojis: false)
      expect(cleaned).toContain('\uD83D\uDCDD');

      // Check punctuation normalized
      expect(cleaned).not.toContain('\u2014');
      expect(cleaned).toContain(',');
      expect(cleaned).not.toContain('\u201C');
      expect(cleaned).not.toContain('\u201D');

      // Check contacts preserved (default)
      expect(cleaned).toContain('contact@example.com');
      expect(cleaned).toContain('example.com');

      // Headings dropped by default
      expect(cleaned).not.toContain('Meeting Notes');
      // But list content remains
      expect(cleaned).toContain('Action item');
    });

    test('whitespace normalization works correctly', async ({ page }) => {
      await page.getByTestId('toggle-advanced-controls').click();

      const rawInput = page.getByLabel('Input');
      const cleanedOutput = page.locator('#clean');

      const sampleInput = 'Text  with   multiple    spaces\n\n\n\nand blank lines';
      await rawInput.fill(sampleInput);

      const cleaned = await cleanedOutput.inputValue();

      // Multiple spaces collapsed to one
      expect(cleaned).not.toContain('  ');
      expect(cleaned).toContain('Text with multiple spaces');

      // Multiple blank lines collapsed
      expect(cleaned).not.toContain('\n\n\n');
    });

    test('reports adjustment count correctly', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const adjustmentCount = page.locator('text=/\\d+ adjustments/');

      await rawInput.fill('No special chars');
      // May have minimal adjustments (trim, etc)
      await expect(adjustmentCount).toContainText(/\d+ adjustments?/);

      await rawInput.fill('Text \u2014 with em dash and \u201Csmart quotes\u201D');
      // Should have multiple adjustments for punctuation
      await expect(adjustmentCount).toContainText(/[1-9]\d* adjustments?/);
    });
  });

  test.describe('UI interactions', () => {
    test('copy button works', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const copyButton = page.getByTestId('copy-button');

      await rawInput.fill('Test text');

      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      await copyButton.click();

      // Wait for button text to change
      await expect(copyButton).toContainText(/copied/i, { timeout: 2000 });
    });

    test('clear button empties input', async ({ page }) => {
      const rawInput = page.getByLabel('Input');
      const clearButton = page.getByRole('button', { name: /clear/i });

      await rawInput.fill('Test text');
      await clearButton.click();

      await expect(rawInput).toHaveValue('');
    });

    test('advanced controls toggle visibility', async ({ page }) => {
      const advancedControls = page.getByTestId('advanced-controls');

      // Advanced controls hidden by default
      await expect(advancedControls).not.toBeVisible();

      await page.getByTestId('toggle-advanced-controls').click();
      await expect(advancedControls).toBeVisible();

      await page.getByTestId('toggle-advanced-controls').click();
      await expect(advancedControls).not.toBeVisible();
    });
  });
});
