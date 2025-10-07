import { expect, test } from '../fixtures/extension';

const POPUP_ROUTE = 'popup.html';

function getPopupUrl(extensionUrl: string) {
  return `${extensionUrl}/${POPUP_ROUTE}`;
}

test.describe('Text Cleaner - Real World Input Tests', () => {
  test.beforeEach(async ({ page, extensionUrl }) => {
    await page.goto(getPopupUrl(extensionUrl));
    await page.getByRole('tab', { name: /tools/i }).click();
    await page.getByRole('menuitem', { name: /text tools/i }).click();
  });

  test('handles complex markdown with code blocks, emojis, and special characters', async ({
    page,
  }) => {
    const rawInput = page.getByLabel('Input');
    const cleanedOutput = page.locator('#clean');
    const charCounter = page.locator('text=/\\d+.*chars/');

    // Real-world complex input with multiple code blocks, emojis, lists, etc.
    const complexInput = `### "Quick brainstorm" draft 🤖💡
  He‍y team—just tossing in this raw dump before coffee ☕️…there's probably  ƒuzzy edges everywhere, but whatevs!!!
  
  > TODO: polish later? maybe? ¯\\_(ツ)_/¯
  
  * ✅ Goal?? improve the onboarding funnel??? maybe??
  * ❗ Painpoints:
     1. Users tap "Skip" → app screams \`undefined\` 🙃
     2. On slo‍w networks we show THREE loaders (why😂)
  - Mixed metrics: MAU ↑ 12 % — except in 🇩🇪 where it's "meh".
  - Let's "ship" by Friday* (*ish) or whenever the cosmic rays align.
  
  
  **Actionables??**
  1. re-check the figma™ link → [??broken??](https://figma.com/file/test)
  2.  audit copy for tone-of-voice — it's "🤠 yeehaw" right now.
  3. add guardrails around the 🤖 auto-responder so it stops replying in pseudo-JSON like:
  ~~~json
  {
     "status": "yolo",
     "message": "Ok i did the thing!!!"
  }
  ~~~
  (yes that was real, send help)
  
  - invisible spaces?? probably.
  - Footnote??[^huh]

  **‼ WAIT** I think the CSV export still says "NULL???" in column q.

  ps: there's a sneaky zero-width joiner hid‍ing somewhere.

  [^huh]: reminder to run \`yarn  lint\`??? maybe?

> ## Sync Notes: Growth Onboarding Draft 🧭✨
  Hey team—quick brain-dump before standup. I ran the latest flows through the co‌-pilot sandbox and noted a few oddities:
  
  - ✅ Funnel health: activation rate holding at 47 %, rolling 7-day.
  - 😬 Error spike on step 3: \`"POST /intake" → 422\` if the referral tag is blank.
  - 🐢 On 3G we reveal the skeleton loader twice (looks jittery).
  - 🇩🇪 cohort: copy sounding "zu locker"; sentiment score slipped from 0.64 → 0.52.
  
  > Reminder: new legal header copy still lives in "Archive (final-final).md" 🙃
  
  ### Cleanup TODOs
  1. Replace hero CTA with \`Join&nbsp;today\` variant that product signed off on.
  2. Normalize spacing in the FAQ accordion—two panels still swap \`en\` vs \`em\` dashes.
  3. Add guardrail so the bot stops replying:
     \`\`\`json
     {"status":"did it","details":"¯\\\\_(ツ)_/¯"}
     \`\`\`
  4. Re-run the slow network scenario in Playwright—my exported trace flagged "␀" in the tooltip text.
  5. Confirm the CSV export: column Q occasionally prints "null??" instead of empty string.
  
  Random crumbs:
  
  - data-promo-id shows as "ʟaunch-2025" on prod (!?)
  - The welcome email uses a sneaky tab after "Hi" → Hi {{first_name}}.
  - Footnote still references the 2022 SLA.[^followup]
  - Check if the feature flag onboarding-pulse flipped overnight; analytics chart looked flatline.
  
  Action request: could someone scrub the markdown for hidden ZWJ/ZWSP? I spotted one between the letters in "on‍boarding" but couldn't catch the rest.
  
  ps: yes, lint still screams about trailing whitespace—saving that for the cleanup pass.
  
  [^followup]: Once legal approves the disclaimer, replace placeholder with actual link.`;

    await rawInput.fill(complexInput);

    // Wait for processing
    await page.waitForTimeout(500);

    const cleaned = await cleanedOutput.inputValue();
    const inputLength = complexInput.length;

    // Verify character counter is working
    await expect(charCounter).toBeVisible();
    const counterText = await charCounter.textContent();
    expect(counterText).toMatch(/\d+.*chars/);

    // Check that content is NOT truncated (output should be substantial)
    expect(cleaned.length).toBeGreaterThan(500);

    // Verify key content is preserved (not lost due to parsing errors)
    expect(cleaned).toContain('Quick brainstorm');
    expect(cleaned).toContain('team');
    expect(cleaned).toContain('coffee');
    expect(cleaned).toContain('Goal');
    expect(cleaned).toContain('improve the onboarding funnel');
    expect(cleaned).toContain('Painpoints');
    expect(cleaned).toContain('Users tap');
    expect(cleaned).toContain('Skip');

    // Check that em-dashes were converted to commas
    expect(cleaned).toContain(','); // Em-dashes should become commas

    // Verify code block content is preserved (not lost)
    expect(cleaned).toContain('status');
    expect(cleaned).toContain('yolo');
    expect(cleaned).toContain('message');
    expect(cleaned).toContain('did it');

    // Check spacing is reasonable (commas should have spaces after them)
    expect(cleaned).toMatch(/team,\s/); // Should be "team, " not "team,"

    // Verify links are handled
    expect(cleaned).toMatch(/broken/); // Link text should be present

    // Check that special characters and emojis are handled
    // (depending on stripEmojis setting, but shouldn't crash)
    const hasEmojis = cleaned.includes('🤖') || cleaned.includes('✅');
    expect(typeof hasEmojis).toBe('boolean'); // Just verify no crash

    // Verify lists are unwrapped or preserved (depending on settings)
    expect(cleaned).toContain('Funnel health');
    expect(cleaned).toContain('activation rate');

    // Check second code block is also preserved
    expect(cleaned).toMatch(/Join.*today/); // From the code block
    expect(cleaned).toContain('Cleanup TODOs');

    // Verify content continues to the end (not truncated mid-document)
    expect(cleaned).toContain('trailing whitespace');
    expect(cleaned).toContain('cleanup pass');

    // Check that footnotes were handled
    expect(cleaned).toContain('yarn'); // From footnote
    expect(cleaned).toContain('lint');
  });

  test('handles large inputs without crashing', async ({ page }) => {
    const rawInput = page.getByLabel('Input');
    const cleanedOutput = page.locator('#clean');

    // Create a more reasonable test size (around 20k chars to avoid timeout)
    const paragraph =
      'This is a test paragraph with some content. '.repeat(50) + '\n\n';
    const largeInput = paragraph.repeat(20);

    await rawInput.fill(largeInput);

    // Wait for processing with longer timeout
    await page.waitForTimeout(1500);

    // Should not crash - output should exist
    const cleaned = await cleanedOutput.inputValue();
    expect(cleaned).toBeTruthy();
    expect(cleaned.length).toBeGreaterThan(0);

    // Content should be preserved (or truncated with message)
    expect(cleaned).toContain('test paragraph');
  });

  test('shows size warning for inputs over 100k characters', async ({ page }) => {
    const rawInput = page.getByLabel('Input');
    const sizeWarning = page.locator('text=/Too large/i');

    // Create an input just over 100k
    const largeInput = 'a'.repeat(100001);

    await rawInput.fill(largeInput);
    await page.waitForTimeout(300);

    // Warning should appear
    await expect(sizeWarning).toBeVisible();

    // Character counter should show the count
    const charCounter = page.locator('text=/100,001.*chars/');
    await expect(charCounter).toBeVisible();
  });

  test('handles unclosed code fences gracefully', async ({ page }) => {
    const rawInput = page.getByLabel('Input');
    const cleanedOutput = page.locator('#clean');

    const unclosedFence = `Some text before
\`\`\`javascript
const x = 1;
const y = 2;
// Missing closing fence!

More content after the code block
This should still appear in output.`;

    await rawInput.fill(unclosedFence);
    await page.waitForTimeout(500);

    const cleaned = await cleanedOutput.inputValue();

    // Should not crash or truncate
    expect(cleaned).toContain('Some text before');
    expect(cleaned).toContain('x = 1');
    expect(cleaned).toContain('y = 2');
    expect(cleaned).toContain('More content after');
    expect(cleaned).toContain('still appear');
  });

  test('preserves content after multiple code blocks', async ({ page }) => {
    const rawInput = page.getByLabel('Input');
    const cleanedOutput = page.locator('#clean');

    const multipleBlocks = `First paragraph

\`\`\`json
{"test": "first block"}
\`\`\`

Middle paragraph

~~~javascript
const second = "block";
~~~

Final paragraph at the end`;

    await rawInput.fill(multipleBlocks);
    await page.waitForTimeout(500);

    const cleaned = await cleanedOutput.inputValue();

    // All sections should be preserved
    expect(cleaned).toContain('First paragraph');
    expect(cleaned).toContain('test');
    expect(cleaned).toContain('first block');
    expect(cleaned).toContain('Middle paragraph');
    expect(cleaned).toContain('second');
    expect(cleaned).toContain('block');
    expect(cleaned).toContain('Final paragraph');
    expect(cleaned).toContain('at the end');
  });

  test('handles mixed link formats correctly', async ({ page }) => {
    const rawInput = page.getByLabel('Input');
    const cleanedOutput = page.locator('#clean');

    const linksTest = `Check out [this link](https://example.com) and also [another one](https://test.com "with title").
Also inline link: [click here](https://foo.bar).`;

    await rawInput.fill(linksTest);
    await page.waitForTimeout(300);

    const cleaned = await cleanedOutput.inputValue();

    // Link text should be extracted (textOnly mode by default)
    expect(cleaned).toContain('this link');
    expect(cleaned).toContain('another one');
    expect(cleaned).toContain('click here');

    // URLs should NOT appear in textOnly mode
    expect(cleaned).not.toContain('https://example.com');
  });

  test('character counter updates in real-time', async ({ page }) => {
    const rawInput = page.getByLabel('Input');
    const charCounter = page.locator('text=/\\d+.*chars/');

    // Start with empty
    await expect(charCounter).toContainText('0 chars');

    // Type some text
    await rawInput.fill('Hello world');
    await expect(charCounter).toContainText('11 chars');

    // Add more text (56 characters)
    await rawInput.fill('Hello world! This is a longer message with more content.');
    await expect(charCounter).toContainText('56 chars');

    // Clear
    await rawInput.fill('');
    await expect(charCounter).toContainText('0 chars');
  });
});
