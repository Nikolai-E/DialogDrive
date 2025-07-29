const SUPPORTED_SITES = [
  /chat\.openai\.com/,
  /chatgpt\.com/,
  /claude\.ai/,
  /gemini\.google\.com/
];

function isSupportedSite() {
  return SUPPORTED_SITES.some((re) => re.test(window.location.hostname));
}

function pasteIntoActiveTextbox(text: string) {
  console.log('Attempting to paste text:', text);
  
  // ChatGPT specific handling
  if (window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('chat.openai.com')) {
    console.log('ChatGPT detected, looking for contenteditable');
    
    // Look for ChatGPT's input area (contenteditable div)
    const chatInput = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (chatInput) {
      console.log('Found contenteditable element:', chatInput);
      chatInput.focus();
      chatInput.innerText = text;
      
      // Trigger input events
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      chatInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focus and place cursor at end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(chatInput);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      return true;
    }
    
    // Fallback: look for any textarea or input
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      console.log('Found textarea fallback:', textarea);
      textarea.focus();
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }
  
  // Try to find the active/focused textbox or textarea
  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && (active.type === 'text' || active.type === 'search')))) {
    console.log('Found active input element:', active);
    active.value = text;
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.focus();
    return true;
  }
  
  // Try contenteditable elements (for other sites)
  const contentEditable = document.querySelector('[contenteditable="true"]') as HTMLElement;
  if (contentEditable) {
    console.log('Found contenteditable element:', contentEditable);
    contentEditable.focus();
    contentEditable.innerText = text;
    contentEditable.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  
  // Try to find a visible textarea or input
  const el = document.querySelector('textarea, input[type="text"], input[type="search"]') as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) {
    console.log('Found generic input element:', el);
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    return true;
  }
  
  console.log('No suitable input element found');
  return false;
}

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*'
  ],
  main() {
    console.log('DialogDrive content script loaded on:', window.location.hostname);
    
    browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      console.log('Content script received message:', msg);
      
      if (msg && msg.type === 'PASTE_PROMPT') {
        if (isSupportedSite()) {
          console.log('Site is supported, attempting to paste');
          const success = pasteIntoActiveTextbox(msg.text);
          console.log('Paste success:', success);
          sendResponse({ success });
        } else {
          console.log('Site not supported');
          sendResponse({ success: false, error: 'Site not supported' });
        }
      }
      
      return true; // Keep message channel open for async response
    });
  },
});
