import { describe, expect, test } from 'vitest';

import {
  detectContentEditableTrigger,
  detectTextareaInputTrigger,
  detectTextareaKeyTrigger,
} from '@/lib/promptPickerTriggers';

describe('prompt picker textarea triggers', () => {
  test('detectTextareaKeyTrigger removes prior slash on double slash', () => {
    const result = detectTextareaKeyTrigger({
      trigger: 'doubleSlash',
      key: '/',
      value: 'hello/',
      selectionStart: 6,
    });

    expect(result).toEqual({
      shouldOpen: true,
      nextValue: 'hello',
      nextCaret: 5,
    });
  });

  test('detectTextareaKeyTrigger opens on backslash without mutating value', () => {
    const result = detectTextareaKeyTrigger({
      trigger: 'backslash',
      key: '\\',
      value: 'draft',
      selectionStart: 5,
    });

    expect(result.shouldOpen).toBe(true);
    if (!result.shouldOpen) throw new Error('Expected trigger to open');
    expect(result.nextValue).toBe('draft');
    expect(result.nextCaret).toBe(5);
  });

  test('detectTextareaInputTrigger trims trailing // fallback', () => {
    const result = detectTextareaInputTrigger({
      trigger: 'doubleSlash',
      value: 'note//',
      selectionStart: 6,
    });

    expect(result).toEqual({
      shouldOpen: true,
      nextValue: 'note',
      nextCaret: 4,
    });
  });

  test('detectTextareaInputTrigger ignores when trigger disabled', () => {
    const result = detectTextareaInputTrigger({
      trigger: 'none',
      value: 'content',
      selectionStart: 7,
    });

    expect(result.shouldOpen).toBe(false);
  });
});

describe('prompt picker contenteditable triggers', () => {
  test('detectContentEditableTrigger identifies double slash via keydown', () => {
    const decision = detectContentEditableTrigger({
      trigger: 'doubleSlash',
      key: '/',
      textBeforeCaret: 'Answer /',
    });

    expect(decision.shouldOpen).toBe(true);
    if (!decision.shouldOpen) throw new Error('Expected decision to open');
    expect(decision.stripChars).toBe(1);
  });

  test('detectContentEditableTrigger catches fallback // pattern', () => {
    const decision = detectContentEditableTrigger({
      trigger: 'doubleSlash',
      key: '/',
      textBeforeCaret: 'Answer //',
    });

    expect(decision.shouldOpen).toBe(true);
    if (!decision.shouldOpen) throw new Error('Expected decision to open');
    expect(decision.stripChars).toBe(2);
  });

  test('detectContentEditableTrigger handles backslash fallback', () => {
    const decision = detectContentEditableTrigger({
      trigger: 'backslash',
      key: '\\',
      textBeforeCaret: 'Prompt',
    });

    expect(decision.shouldOpen).toBe(true);
    if (!decision.shouldOpen) throw new Error('Expected decision to open');
  });
});
