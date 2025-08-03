import { logger } from '../lib/logger';
import { ChatStorage } from '../lib/chatStorage';
import { AI_PLATFORM_SELECTORS } from '../lib/constants';

const SUPPORTED_SITES = [
  /chat\.openai\.com/,
  /chatgpt\.com/,
  /claude\.ai/,
  /gemini\.google\.com/
];

function isSupportedSite() {
  return SUPPORTED_SITES.some((re) => re.test(window.location.hostname));
}

// Enhanced content capture functionality
async function captureCurrentChat() {
  try {
    const currentUrl = window.location.href;
    logger.info('Capturing chat from URL:', currentUrl);
    
    let platform: 'chatgpt' | 'gemini' | 'claude' | null = null;
    let title = '';
    let scrapedContent: any = {};

    // Detect platform and extract content
    if (currentUrl.includes('chatgpt.com') || currentUrl.includes('chat.openai.com')) {
      platform = 'chatgpt';
      title = await extractChatGPTTitle();
      scrapedContent = await extractChatGPTContent();
    } else if (currentUrl.includes('gemini.google.com')) {
      platform = 'gemini';
      title = await extractGeminiTitle();
      scrapedContent = await extractGeminiContent();
    } else if (currentUrl.includes('claude.ai')) {
      platform = 'claude';
      title = await extractClaudeTitle();
      scrapedContent = await extractClaudeContent();
    }

    if (!platform) {
      return {
        success: false,
        message: 'Current page is not a supported chat platform'
      };
    }

    const chatData = {
      title: title || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Chat - ${new Date().toLocaleDateString()}`,
      url: currentUrl,
      platform: platform,
      scrapedContent: {
        ...scrapedContent,
        scrapedAt: new Date().toISOString()
      }
    };

    logger.info('Successfully captured chat data:', chatData);
    return {
      success: true,
      data: chatData,
      message: `Successfully captured ${platform} chat`
    };

  } catch (error) {
    console.error('Failed to capture current chat:', error);
    return {
      success: false,
      message: `Failed to capture chat: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ChatGPT-specific content extraction
async function extractChatGPTTitle(): Promise<string> {
  logger.info('Extracting ChatGPT title...');
  
  // Wait a bit for dynamic content to load
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try multiple strategies for getting the conversation title
  const strategies = [
    // Strategy 1: Target the active/current conversation in sidebar
    () => {
      const currentUrl = window.location.href;
      const conversationMatch = currentUrl.match(/\/c\/([a-f0-9-]+)/);
      
      if (conversationMatch) {
        const conversationId = conversationMatch[1];
        logger.info('Looking for conversation ID:', conversationId);
        
        // Look for active conversation link that matches current URL
        const activeLinks = document.querySelectorAll(`nav a[href*="${conversationId}"], aside a[href*="${conversationId}"]`);
        for (const link of activeLinks) {
          const span = link.querySelector('span[dir="auto"]');
          const text = span?.textContent?.trim();
          if (text && text.length > 3 && text.length < 200 && 
              !text.includes('Search chats') && !text.includes('New chat') && 
              !text.includes('ChatGPT') && text !== 'Search') {
            logger.info('Found title via active conversation ID match:', text);
            return text;
          }
        }
      }
      
      // Fallback: look for aria-current or visual active indicators
      const activeSelectors = [
        '[aria-current="page"] span[dir="auto"]',
        '.bg-token-sidebar-surface-secondary span[dir="auto"]', 
        '.active span[dir="auto"]',
        'a[data-testid*="active"] span[dir="auto"]'
      ];
      
      for (const selector of activeSelectors) {
        const activeSpan = document.querySelector(selector);
        const text = activeSpan?.textContent?.trim();
        if (text && text.length > 3 && text.length < 200 && 
            !text.includes('Search chats') && !text.includes('New chat') && 
            !text.includes('ChatGPT') && text !== 'Search') {
          logger.info('Found title via active indicator:', text);
          return text;
        }
      }
      return null;
    },
    
    // Strategy 2: Extract from page title (reliable fallback)
    () => {
      const pageTitle = document.title;
      if (pageTitle && pageTitle !== 'ChatGPT' && !pageTitle.includes('New chat')) {
        const cleaned = pageTitle.replace(' | ChatGPT', '').replace(' - ChatGPT', '').trim();
        if (cleaned && cleaned !== 'ChatGPT' && cleaned.length > 3) {
          logger.info('Found title via page title:', cleaned);
          return cleaned;
        }
      }
      return null;
    },
    
    // Strategy 3: Look for any active/highlighted conversation in sidebar (broader search)
    () => {
      const activeItems = document.querySelectorAll('[aria-current="page"] span, .bg-token-sidebar-surface-secondary span, .active span');
      for (const el of activeItems) {
        const text = el.textContent?.trim();
        if (text && text.length > 5 && text.length < 100 && 
            !text.includes('New chat') && !text.includes('Search chats')) {
          logger.info('Found title via active item strategy:', text);
          return text;
        }
      }
      return null;
    },
    
    // Strategy 4: Get from first user message
    () => {
      const firstUserMessage = document.querySelector('[data-message-author-role="user"]');
      if (firstUserMessage?.textContent) {
        const text = firstUserMessage.textContent.trim().slice(0, 60);
        if (text.length > 10) {
          logger.info('Found title via first message:', text + '...');
          return text + '...';
        }
      }
      return null;
    },
    
    // Strategy 5: Look for any heading or prominent text (fallback)
    () => {
      const headings = document.querySelectorAll('h1, h2, h3, .text-lg, .font-semibold');
      for (const heading of headings) {
        const text = heading.textContent?.trim();
        if (text && text.length > 5 && text.length < 100 && 
            !text.includes('ChatGPT') && !text.includes('New chat') && 
            !text.includes('Search chats')) {
          logger.info('Found title via heading strategy:', text);
          return text;
        }
      }
      return null;
    }
  ];

  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      return result;
    }
  }
  
  logger.info('No title found, using date-based fallback');
  // Generate a meaningful fallback title with current date/time
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const dateStr = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  return `ChatGPT Chat - ${dateStr} ${timeStr}`;
}

async function extractChatGPTContent() {
  logger.info('Extracting ChatGPT content...');
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const messages = document.querySelectorAll('[data-message-author-role]');
  const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
  
  let lastMessage = '';
  if (messages.length > 0) {
    const lastEl = messages[messages.length - 1];
    lastMessage = lastEl.textContent?.slice(0, 150) || '';
  }
  
  logger.info(`Found ${messages.length} total messages (${userMessages.length} user, ${assistantMessages.length} assistant)`);
  
  return {
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length,
    lastMessage: lastMessage,
    summary: `ChatGPT conversation with ${messages.length} messages`
  };
}

// Gemini-specific content extraction
async function extractGeminiTitle(): Promise<string> {
  logger.info('Extracting Gemini title...');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try page title first
  const pageTitle = document.title;
  if (pageTitle && pageTitle !== 'Gemini' && !pageTitle.includes('New conversation')) {
    const cleaned = pageTitle.replace(' - Gemini', '').replace(' | Gemini', '').trim();
    if (cleaned && cleaned !== 'Gemini') {
      logger.info('Found Gemini title via page title:', cleaned);
      return cleaned;
    }
  }
  
  // Try to find conversation title in UI
  const possibleTitles = document.querySelectorAll('.conversation-title, [data-test-id="conversation-title"], h1, h2');
  for (const el of possibleTitles) {
    const text = el.textContent?.trim();
    if (text && text.length > 5 && text.length < 100 && !text.includes('Gemini')) {
      logger.info('Found Gemini title via UI:', text);
      return text;
    }
  }
  
  // Fallback to first message
  const firstMessage = document.querySelector('[data-message-id], .message, .chat-message');
  if (firstMessage?.textContent) {
    const text = firstMessage.textContent.trim().slice(0, 60);
    if (text.length > 10) {
      logger.info('Found Gemini title via first message:', text + '...');
      return text + '...';
    }
  }
  
  logger.info('No Gemini title found, using fallback');
  return '';
}

async function extractGeminiContent() {
  logger.info('Extracting Gemini content...');
  
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const messages = document.querySelectorAll('[data-message-id], .message, .chat-message');
  
  let lastMessage = '';
  if (messages.length > 0) {
    const lastEl = messages[messages.length - 1];
    lastMessage = lastEl.textContent?.slice(0, 150) || '';
  }
  
  logger.info(`Found ${messages.length} Gemini messages`);
  
  return {
    messageCount: messages.length,
    lastMessage: lastMessage,
    summary: `Gemini conversation with ${messages.length} messages`
  };
}

// Claude-specific content extraction
async function extractClaudeTitle(): Promise<string> {
  logger.info('Extracting Claude title...');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const pageTitle = document.title;
  if (pageTitle && pageTitle !== 'Claude' && !pageTitle.includes('New conversation')) {
    const cleaned = pageTitle.replace(' - Claude', '').replace(' | Claude', '').trim();
    if (cleaned && cleaned !== 'Claude') {
      logger.info('Found Claude title via page title:', cleaned);
      return cleaned;
    }
  }
  
  return '';
}

async function extractClaudeContent() {
  logger.info('Extracting Claude content...');
  
  const messages = document.querySelectorAll('.message, [data-testid="message"]');
  
  let lastMessage = '';
  if (messages.length > 0) {
    const lastEl = messages[messages.length - 1];
    lastMessage = lastEl.textContent?.slice(0, 150) || '';
  }
  
  logger.info(`Found ${messages.length} Claude messages`);
  
  return {
    messageCount: messages.length,
    lastMessage: lastMessage,
    summary: `Claude conversation with ${messages.length} messages`
  };
}

function pasteIntoActiveTextbox(text: string) {
  logger.info('Attempting to paste text:', text);
  
  // ChatGPT specific handling
  if (window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('chat.openai.com')) {
    logger.info('ChatGPT detected, looking for contenteditable');
    
    // Look for ChatGPT's input area (contenteditable div)
    const chatInput = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (chatInput) {
      logger.info('Found contenteditable element:', chatInput);
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
      logger.info('Found textarea fallback:', textarea);
      textarea.focus();
      textarea.value = text;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  }
  
  // Try to find the active/focused textbox or textarea
  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && (active.type === 'text' || active.type === 'search')))) {
    logger.info('Found active input element:', active);
    active.value = text;
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.focus();
    return true;
  }
  
  // Try contenteditable elements (for other sites)
  const contentEditable = document.querySelector('[contenteditable="true"]') as HTMLElement;
  if (contentEditable) {
    logger.info('Found contenteditable element:', contentEditable);
    contentEditable.focus();
    contentEditable.innerText = text;
    contentEditable.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  
  // Try to find a visible textarea or input
  const el = document.querySelector('textarea, input[type="text"], input[type="search"]') as HTMLInputElement | HTMLTextAreaElement | null;
  if (el) {
    logger.info('Found generic input element:', el);
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    return true;
  }
  
  logger.info('No suitable input element found');
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
    logger.info('DialogDrive content script loaded on:', window.location.hostname);
    
    // Add floating bookmark button for ChatGPT
    if (window.location.hostname.includes('chatgpt.com')) {
      addFloatingBookmarkButton();
      
      // Re-add button when navigating between conversations (SPA)
      let currentUrl = window.location.href;
      const urlObserver = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          logger.info('URL changed, re-adding bookmark button...');
          setTimeout(() => addFloatingBookmarkButton(), 1000); // Delay to let page load
        }
      });
      
      urlObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    
    browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      logger.info('Content script received message:', msg);
      
      if (msg && msg.type === 'PASTE_PROMPT') {
        if (isSupportedSite()) {
          logger.info('Site is supported, attempting to paste');
          const success = pasteIntoActiveTextbox(msg.text);
          logger.info('Paste success:', success);
          sendResponse({ success });
        } else {
          logger.info('Site not supported');
          sendResponse({ success: false, error: 'Site not supported' });
        }
      }
      
      if (msg && msg.type === 'CAPTURE_CURRENT_CHAT') {
        logger.info('Capture request received');
        if (isSupportedSite()) {
          captureCurrentChat().then(result => {
            logger.info('Capture result:', result);
            sendResponse(result);
          }).catch(error => {
            console.error('Capture error:', error);
            sendResponse({ success: false, message: 'Capture failed: ' + error.message });
          });
        } else {
          logger.info('Site not supported for capture');
          sendResponse({ success: false, message: 'Current site not supported for chat capture' });
        }
      }
      
      if (msg && msg.type === 'GET_CURRENT_URL') {
        sendResponse({ url: window.location.href });
      }
      
      return true; // Keep message channel open for async response
    });
  },
});

// Add floating bookmark button to ChatGPT interface
function addFloatingBookmarkButton() {
  // Remove existing button if present
  const existingButton = document.getElementById('dialogdrive-bookmark-btn');
  if (existingButton) {
    existingButton.remove();
  }
  
  logger.info('Adding DialogDrive bookmark button...');
  
  // Create the bookmark button
  const bookmarkButton = document.createElement('button');
  bookmarkButton.id = 'dialogdrive-bookmark-btn';
  bookmarkButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  `;
  
  // Style the button to match ChatGPT's interface
  bookmarkButton.style.cssText = `
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    transition: all 0.15s ease;
    margin-left: 4px;
    padding: 6px;
    font-size: 0;
  `;
  
  // Add hover effects
  bookmarkButton.addEventListener('mouseenter', () => {
    bookmarkButton.style.background = 'var(--surface-secondary, rgba(0,0,0,0.05))';
    bookmarkButton.style.color = 'var(--text-primary, #374151)';
  });
  
  bookmarkButton.addEventListener('mouseleave', () => {
    bookmarkButton.style.background = 'transparent';
    bookmarkButton.style.color = 'var(--text-secondary, #6b7280)';
  });
  
  // Add tooltip
  bookmarkButton.title = 'Bookmark this chat with DialogDrive';
  
  // Add click handler for bookmarking
  bookmarkButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    logger.info('DialogDrive bookmark button clicked');
    
    // Check if quick form is already open
    const existingForm = document.getElementById('dialogdrive-quick-form');
    if (existingForm) {
      existingForm.remove();
      return;
    }
    
    // Show quick bookmark form instead of immediate save
    showQuickBookmarkForm(bookmarkButton);
  });
  
  // Function to insert the button into the header
  const insertBookmarkButton = () => {
    // Try to find the header actions area using the share button as reference
    const shareButton = document.querySelector('header button[aria-label*="share" i], header button[title*="share" i]');
    if (shareButton) {
      const headerContainer = shareButton.parentElement;
      if (headerContainer) {
        logger.info('Found share button, inserting bookmark button nearby');
        headerContainer.insertBefore(bookmarkButton, shareButton.nextSibling);
        return true;
      }
    }
    
    // Fallback: look for the header actions container by structure
    const headerActions = document.querySelector('header div:last-child, main header div:last-child');
    if (headerActions) {
      logger.info('Found header actions container, appending bookmark button');
      headerActions.appendChild(bookmarkButton);
      return true;
    }
    
    // Another fallback: look for any header with buttons
    const headerWithButtons = document.querySelector('header:has(button)');
    if (headerWithButtons) {
      logger.info('Found header with buttons, appending bookmark button');
      headerWithButtons.appendChild(bookmarkButton);
      return true;
    }
    
    return false;
  };
  
  // Try to insert immediately
  if (!insertBookmarkButton()) {
    // If not found, wait for page load and try again
    logger.info('Header not found, waiting for page load...');
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          if (insertBookmarkButton()) {
            logger.info('Bookmark button inserted after DOM change');
            observer.disconnect();
            break;
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Stop trying after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      logger.info('Stopped looking for header insertion point');
    }, 10000);
  }
}

// Show quick bookmark form near the button
async function showQuickBookmarkForm(triggerButton: HTMLElement) {
  // Remove any existing form
  const existingForm = document.getElementById('dialogdrive-quick-form');
  if (existingForm) {
    existingForm.remove();
  }
  
  logger.info('Showing quick bookmark form...');
  
  // Get available workspaces and tags from storage
  let workspaces: string[] = ['General'];
  let allTags: string[] = [];
  
  try {
    // Get existing data to populate workspace/tag options
    const response = await browser.runtime.sendMessage({ type: 'GET_WORKSPACES_AND_TAGS' });
    if (response?.success) {
      workspaces = response.workspaces || ['General'];
      allTags = response.tags || [];
    }
  } catch (error) {
    logger.info('Could not fetch workspaces/tags, using defaults');
  }
  
  // Create the quick form
  const quickForm = document.createElement('div');
  quickForm.id = 'dialogdrive-quick-form';
  quickForm.innerHTML = `
    <div style="
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 16px;
      width: 280px;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #374151;
    ">
      <div style="font-weight: 600; margin-bottom: 12px; color: #111827;">
        📚 Save to DialogDrive
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 12px; color: #6b7280;">
          WORKSPACE
        </label>
        <select id="dd-workspace-select" style="
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          font-size: 13px;
          color: #374151;
        ">
          ${workspaces.map(ws => `<option value="${ws}">${ws}</option>`).join('')}
        </select>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-weight: 500; margin-bottom: 4px; font-size: 12px; color: #6b7280;">
          TAGS (optional)
        </label>
        <input 
          type="text" 
          id="dd-tags-input" 
          placeholder="ai, research, important..."
          style="
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 13px;
            color: #374151;
          "
        />
        ${allTags.length > 0 ? `
          <div style="margin-top: 4px; font-size: 11px; color: #6b7280;">
            Suggestions: ${allTags.slice(0, 5).join(', ')}
          </div>
        ` : ''}
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="dd-save-btn" style="
          flex: 1;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.15s;
        ">
          Save Chat
        </button>
        <button id="dd-cancel-btn" style="
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.15s;
        ">
          Cancel
        </button>
      </div>
    </div>
  `;
  
  // Position the form relative to the trigger button
  quickForm.style.cssText = `
    position: relative;
    display: inline-block;
  `;
  
  // Insert form after the button
  triggerButton.parentNode?.insertBefore(quickForm, triggerButton.nextSibling);
  
  // Add hover effects
  const saveBtn = quickForm.querySelector('#dd-save-btn') as HTMLElement;
  const cancelBtn = quickForm.querySelector('#dd-cancel-btn') as HTMLElement;
  
  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.background = '#2563eb';
  });
  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.background = '#3b82f6';
  });
  
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#e5e7eb';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#f3f4f6';
  });
  
  // Handle save button click
  saveBtn.addEventListener('click', async () => {
    const workspaceSelect = quickForm.querySelector('#dd-workspace-select') as HTMLSelectElement;
    const tagsInput = quickForm.querySelector('#dd-tags-input') as HTMLInputElement;
    
    const selectedWorkspace = workspaceSelect.value || 'General';
    const tagsText = tagsInput.value.trim();
    const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(Boolean) : [];
    
    logger.info('Saving chat with:', { workspace: selectedWorkspace, tags });
    
    // Show loading state
    saveBtn.innerHTML = 'Saving...';
    saveBtn.style.background = '#6b7280';
    (saveBtn as HTMLButtonElement).disabled = true;
    
    try {
      // Capture the current chat
      const result = await captureCurrentChat();
      
      if (result.success) {
        // Send to background script with workspace and tags
        await browser.runtime.sendMessage({
          type: 'SAVE_CHAT_BOOKMARK',
          data: {
            ...result.data,
            workspace: selectedWorkspace,
            tags: tags
          }
        });
        
        logger.info('Chat bookmarked successfully with workspace/tags');
        
        // Show success
        showBookmarkToast(`Chat saved to "${selectedWorkspace}"${tags.length ? ` with tags: ${tags.join(', ')}` : ''}!`, 'success');
        
        // Remove form
        quickForm.remove();
        
      } else {
        throw new Error(result.message || 'Failed to capture chat');
      }
      
    } catch (error) {
      console.error('Failed to bookmark chat:', error);
      
      // Reset button
      saveBtn.innerHTML = 'Save Chat';
      saveBtn.style.background = '#3b82f6';
      (saveBtn as HTMLButtonElement).disabled = false;
      
      showBookmarkToast('Failed to bookmark chat', 'error');
    }
  });
  
  // Handle cancel button click
  cancelBtn.addEventListener('click', () => {
    quickForm.remove();
  });
  
  // Close form when clicking outside
  setTimeout(() => {
    const handleClickOutside = (event: Event) => {
      if (!quickForm.contains(event.target as Node) && !triggerButton.contains(event.target as Node)) {
        quickForm.remove();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    document.addEventListener('click', handleClickOutside);
  }, 100);
  
  // Focus the workspace select
  const workspaceSelect = quickForm.querySelector('#dd-workspace-select') as HTMLSelectElement;
  workspaceSelect.focus();
}
function showBookmarkToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Remove existing toast
  const existingToast = document.getElementById('dialogdrive-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.id = 'dialogdrive-toast';
  toast.textContent = message;
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  };
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  // Add animation styles
  if (!document.getElementById('dialogdrive-toast-styles')) {
    const styles = document.createElement('style');
    styles.id = 'dialogdrive-toast-styles';
    styles.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
