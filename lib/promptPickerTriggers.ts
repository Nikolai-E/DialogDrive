import type { PickerTrigger } from './constants';

export type TriggerDecision =
  | { shouldOpen: false }
  | {
      shouldOpen: true;
      nextValue?: string;
      nextCaret?: number;
      stripChars?: number;
    };

const noopDecision: TriggerDecision = { shouldOpen: false };

export function detectTextareaKeyTrigger({
  trigger,
  key,
  value,
  selectionStart,
}: {
  trigger: PickerTrigger;
  key: string;
  value: string;
  selectionStart: number;
}): TriggerDecision {
  if (trigger === 'none') return noopDecision;

  if (trigger === 'backslash' && key === '\\') {
    return { shouldOpen: true, nextValue: value, nextCaret: selectionStart };
  }

  if (trigger === 'doubleSlash' && key === '/') {
    const before = value.slice(0, selectionStart);
    if (before.endsWith('/')) {
      const after = value.slice(selectionStart);
      return {
        shouldOpen: true,
        nextValue: before.slice(0, -1) + after,
        nextCaret: selectionStart - 1,
      };
    }
  }

  return noopDecision;
}

export function detectTextareaInputTrigger({
  trigger,
  value,
  selectionStart,
}: {
  trigger: PickerTrigger;
  value: string;
  selectionStart: number;
}): TriggerDecision {
  if (trigger === 'none') return noopDecision;

  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionStart);

  if (trigger === 'backslash' && before.endsWith('\\')) {
    return {
      shouldOpen: true,
      nextValue: before.slice(0, -1) + after,
      nextCaret: Math.max(0, selectionStart - 1),
    };
  }

  if (trigger === 'doubleSlash' && before.endsWith('//')) {
    return {
      shouldOpen: true,
      nextValue: before.slice(0, -2) + after,
      nextCaret: Math.max(0, selectionStart - 2),
    };
  }

  return noopDecision;
}

export function detectContentEditableTrigger({
  trigger,
  key,
  textBeforeCaret,
}: {
  trigger: PickerTrigger;
  key: string;
  textBeforeCaret: string;
}): TriggerDecision {
  if (trigger === 'none') return noopDecision;

  const lastChar = textBeforeCaret.slice(-1);
  const lastTwo = textBeforeCaret.slice(-2);

  if (trigger === 'backslash' && (key === '\\' || lastChar === '\\')) {
    return { shouldOpen: true, stripChars: lastChar === '\\' ? 1 : 0 };
  }

  if (trigger === 'doubleSlash' && (key === '/' ? lastChar === '/' : lastTwo === '//')) {
    const stripChars = lastTwo === '//' ? 2 : 1;
    return { shouldOpen: true, stripChars };
  }

  return noopDecision;
}
