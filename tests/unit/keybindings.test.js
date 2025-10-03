// Simple keybinding mapping without DOM: returns an action string

function mapKey(evt) {
  const isMac = false; // test assumes non-mac; logic in app handles platform
  const ctrlOrCmd = isMac ? evt.metaKey : evt.ctrlKey;
  if (ctrlOrCmd && !evt.shiftKey && !evt.altKey && evt.key.toLowerCase() === 's')
    return 'focus-search';
  if (ctrlOrCmd && !evt.shiftKey && !evt.altKey && evt.key.toLowerCase() === 'p')
    return 'new-prompt';
  if (ctrlOrCmd && !evt.shiftKey && !evt.altKey && evt.key.toLowerCase() === 'b')
    return 'bookmark-chat';
  return 'none';
}

describe('keybinding dispatch', () => {
  test('Ctrl+S focuses search', () => {
    expect(
      mapKey({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 's' })
    ).toBe('focus-search');
  });
  test('Ctrl+P creates new prompt', () => {
    expect(
      mapKey({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 'p' })
    ).toBe('new-prompt');
  });
  test('Ctrl+B bookmarks chat', () => {
    expect(
      mapKey({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: 'b' })
    ).toBe('bookmark-chat');
  });
  test('Other keys return none', () => {
    expect(
      mapKey({ ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: 'x' })
    ).toBe('none');
  });
});
