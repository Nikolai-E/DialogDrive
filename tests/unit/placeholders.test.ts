import { describe, expect, test } from 'vitest';

import { extractPlaceholders, replacePlaceholders } from '@/lib/placeholders';

describe('placeholders utilities', () => {
  test('extractPlaceholders finds unique bracketed names in order', () => {
    const text = 'Prep [file] and [dir], then rename [file].';
    const result = extractPlaceholders(text);
    expect(result).toEqual(['file', 'dir', 'file']);
  });

  test('replacePlaceholders substitutes from map, defaulting to empty string', () => {
    const text = 'Deploy to [env] with tag [tag] and owner [owner].';
    const map = { env: 'prod', tag: 'v1.2.3' };
    const result = replacePlaceholders(text, map);
    expect(result).toBe('Deploy to prod with tag v1.2.3 and owner .');
  });
});
