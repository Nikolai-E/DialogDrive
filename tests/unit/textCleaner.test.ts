import { describe, expect, test } from 'vitest';

import { cleanText, defaultCleanOptions, resolveCleanOptions } from '@/lib/textCleaner';

const runCleaner = (input: string, preset: 'plain' | 'email' | 'markdown-slim' | 'chat') =>
  cleanText(input, { preset, locale: 'en-US' });

describe('cleanText', () => {
  test('removes dangerous html while preserving meaningful text', () => {
    const result = runCleaner(
      `<div><script>alert('xss')</script><p>Hello&nbsp;<strong>world</strong></p></div>`,
      'plain'
    );

    expect(result.text).toContain('Hello world');
    expect(result.text).not.toMatch(/alert|script/i);
    expect(result.report.ruleCounts['parse:sanitize-html']).toBeGreaterThanOrEqual(0);
  });

  test('is idempotent across repeated runs', () => {
    const input = [
      '# Heading',
      '',
      '- First item',
      '- Second item',
      '',
      'Visit https://example.com for more info.',
    ].join('\n');

    const first = runCleaner(input, 'markdown-slim');
    const second = cleanText(first.text, { preset: 'markdown-slim', locale: 'en-US' });
    expect(second.text).toBe(first.text);
  });

  test('truncates extremely long input safely', () => {
    const long = 'a'.repeat(100_100);
    const result = runCleaner(long, 'plain');
    expect(result.text.length).toBeGreaterThan(100_000);
    expect(result.text).toMatch(/\[\.{3} Input truncated/);
  });
});

describe('resolveCleanOptions', () => {
  test('applies markdown preset defaults over base configuration', () => {
    const resolved = resolveCleanOptions({ preset: 'markdown-slim' });
    expect(resolved.preset).toBe('markdown-slim');
    expect(resolved.structure.keepBasicMarkdown).toBe(true);
    expect(resolved.whitespace.ensureFinalNewline).toBe(false);
  });

  test('merges user overrides deeply without mutating defaults', () => {
    const overrides = {
      preset: 'plain' as const,
      structure: { ...defaultCleanOptions.structure, dropBlockquotes: false },
      punctuation: { ...defaultCleanOptions.punctuation, curlyQuotes: 'keep' as const },
    };
    const resolved = resolveCleanOptions(overrides);

    expect(resolved.structure.dropBlockquotes).toBe(false);
    expect(resolved.punctuation.curlyQuotes).toBe('keep');
    // Ensure defaults remain intact
    expect(defaultCleanOptions.structure.dropBlockquotes).toBe(true);
    expect(defaultCleanOptions.punctuation.curlyQuotes).toBe('straight');
  });
});
