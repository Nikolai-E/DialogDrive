// Minimal pure logic tests for picker trigger detection

function detectTriggerInTextareaValue(value, caret, mode) {
  const before = value.slice(0, caret);
  if (mode === 'doubleSlash') return before.endsWith('//');
  if (mode === 'backslash') return before.endsWith('\\');
  return false;
}

describe('picker trigger detection', () => {
  test('double slash detected only when // at caret', () => {
    expect(detectTriggerInTextareaValue('hi/', 3, 'doubleSlash')).toBe(false);
    expect(detectTriggerInTextareaValue('hi//', 4, 'doubleSlash')).toBe(true);
    expect(detectTriggerInTextareaValue('//', 2, 'doubleSlash')).toBe(true);
  });
  test('backslash detected only when \\ at caret', () => {
    expect(detectTriggerInTextareaValue('hi\\', 3, 'backslash')).toBe(true);
    expect(detectTriggerInTextareaValue('hi/\\', 4, 'backslash')).toBe(true);
    expect(detectTriggerInTextareaValue('hi/', 3, 'backslash')).toBe(false);
  });
});
