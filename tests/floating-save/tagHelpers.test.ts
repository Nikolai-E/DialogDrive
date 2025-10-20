import { describe, expect, test, vi } from 'vitest';

import { createTagChip, sanitizeTagLabel } from '@/entrypoints/floating-save/tagHelpers';

describe('floating save tag helpers', () => {
  test('sanitizeTagLabel trims and strips control characters', () => {
    expect(sanitizeTagLabel('\u0001 spaced \u0002tag ')).toBe('spaced tag');
    expect(sanitizeTagLabel(123 as any)).toBe('');
  });

  test('createTagChip renders label and wires removal handlers', () => {
    const onRemove = vi.fn();
    const chip = createTagChip({
      document,
      tag: 'Danger <script>alert(1)</script>',
      onRemove,
    });

    expect(chip.className).toBe('dd-tag');
    const label = chip.querySelector('span');
    const button = chip.querySelector('svg');
    expect(label?.textContent).toBe('Danger <script>alert(1)</script>');
    expect(button?.getAttribute('aria-label')).toBe('Remove tag Danger <script>alert(1)</script>');

    button?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(onRemove).toHaveBeenCalledTimes(1);

    button?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  test('createTagChip rejects empty sanitized tags', () => {
    expect(() =>
      createTagChip({
        document,
        tag: '\u0000  ',
        onRemove: vi.fn(),
      })
    ).toThrow('Tag label cannot be empty after sanitization');
  });
});
