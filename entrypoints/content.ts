// An extension by Nikolai Eidheim, built with WXT + TypeScript.

import { z } from 'zod';
import { logger } from '../lib/logger';
import { extractPlaceholders, replacePlaceholders } from '../lib/placeholders';
import { platformManager } from '../lib/platforms/manager';
import { usePrefsStore, waitForPrefsHydration } from '../lib/prefsStore';
import { secureStorage } from '../lib/secureStorageV2';

type PromptItem = {
  id: string;
  title: string;
  text: string;
  workspace?: string;
  tags?: string[];
};

export default defineContentScript({
  // Only run on the ChatGPT domains we support today.
  matches: ['*://chatgpt.com/*', '*://chat.openai.com/*'],
  world: 'ISOLATED',
  runAt: 'document_idle',
  main() {
    logger.info('DialogDrive: Content script started');

    // Relay popup actions into the active page via the platform manager.
    // Runtime message schema validation (mirror background safety)
    const PasteMsg = z.object({ type: z.literal('PASTE_PROMPT'), text: z.string().max(50000) });
    const CaptureMsg = z.object({ type: z.literal('CAPTURE_CHAT') });
    const PingMsg = z.object({ type: z.literal('PING') });
    const ContentMsg = z.union([PasteMsg, CaptureMsg, PingMsg]);

    browser.runtime.onMessage.addListener(
      (message: unknown, _sender: unknown, sendResponse: (response: unknown) => void) => {
        (async () => {
          const parsed = ContentMsg.safeParse(message);
          if (!parsed.success) {
            sendResponse({ success: false, error: 'Bad message' });
            return;
          }
          const msg = parsed.data as z.infer<typeof ContentMsg>;
          switch ((msg as any).type) {
            case 'PASTE_PROMPT': {
              // Drops the selected prompt straight into the chat input.
              const pasteSuccess = await platformManager.paste((msg as any).text);
              sendResponse({ success: pasteSuccess });
              break;
            }
            case 'CAPTURE_CHAT': {
              // Captures the latest conversation so it can be saved as a bookmark.
              const captureResult = await platformManager.capture();
              sendResponse(captureResult);
              break;
            }
            case 'PING': {
              // Gives the UI a quick heartbeat and the active adapter name.
              sendResponse({
                success: true,
                platform: platformManager.getCurrentAdapter()?.name || 'unknown',
              });
              break;
            }
            default:
              sendResponse({ success: false, error: 'Unknown message type' });
          }
        })();

        // Keep the channel open for the async response.
        return true;
      }
    );

    // Set up in-page prompt picker on ChatGPT when user types '\\' or '//'
    logger.info('DialogDrive: About to setup prompt picker');
    try {
      setupPromptPicker();
    } catch (err) {
      logger.warn('DialogDrive: Prompt picker setup failed', err as Error);
    }
  },
});

// --- Prompt Picker for ChatGPT ---
function setupPromptPicker() {
  // One-time init guard to prevent duplicate listeners across reinjections
  if ((window as any).__ddPickerInit) return;
  (window as any).__ddPickerInit = true;
  logger.debug('DialogDrive: setupPromptPicker initialized');
  if (!platformManager.getCurrentAdapter()?.name.includes('ChatGPT')) {
    logger.debug('DialogDrive: Not on ChatGPT, skipping picker setup');
    return;
  }

  logger.debug('DialogDrive: On ChatGPT, proceeding with picker setup');
  let input: HTMLElement | null = findChatGPTInput();

  // Debug logging
  logger.debug('DialogDrive: Setting up prompt picker', { inputFound: !!input });

  let cachedPrompts: PromptItem[] | null = null;
  let overlayEl: HTMLDivElement | null = null;
  let formEl: HTMLDivElement | null = null;
  let cleanupForm: (() => void) | null = null;
  let pickerTrigger: 'none' | 'doubleSlash' | 'backslash' = 'doubleSlash';

  // Load picker trigger preference and keep it in sync with persisted store
  (async () => {
    try {
      const hydrated = await waitForPrefsHydration();
      if (!hydrated) {
        logger.warn('DialogDrive: Prefs hydration timed out; using defaults for picker trigger');
      }
      const prefs = usePrefsStore.getState();
      if (
        prefs.pickerTrigger === 'none' ||
        prefs.pickerTrigger === 'backslash' ||
        prefs.pickerTrigger === 'doubleSlash'
      ) {
        pickerTrigger = prefs.pickerTrigger;
      }
    } catch (error) {
      logger.warn('DialogDrive: Failed to hydrate picker trigger prefs', error as Error);
    }
  })();

  const unsubscribePicker = usePrefsStore.subscribe((state, previousState) => {
    const trigger = state.pickerTrigger;
    if (previousState && previousState.pickerTrigger === trigger) return;
    if (trigger === 'none' || trigger === 'backslash' || trigger === 'doubleSlash') {
      pickerTrigger = trigger;
    }
  });

  window.addEventListener('beforeunload', unsubscribePicker);
  // caret tracking not needed yet; we'll derive value from DOM when needed

  // Safe extension API detection using globalThis to avoid TS errors in isolated context
  function getExtApi(): any | null {
    const g: any = globalThis as any;
    try {
      if (g?.browser?.runtime?.id) return g.browser;
    } catch {}
    try {
      if (g?.chrome?.runtime?.id) return g.chrome;
    } catch {}
    return null;
  }

  async function getPromptsSafe(): Promise<PromptItem[]> {
    // Prefer our secure storage helper first
    try {
      const viaSecure = await secureStorage.getPrompts<PromptItem[]>();
      if (Array.isArray(viaSecure)) return viaSecure as PromptItem[];
      if (viaSecure) return viaSecure as any;
    } catch (e) {
      logger.warn('DialogDrive: secureStorage.getPrompts failed, trying extension storage');
    }
    // Try extension storage directly
    try {
      const api = getExtApi();
      if (api?.storage?.local) {
        const result = await api.storage.local.get('dd_prompts');
        const dd_prompts = (result as any)?.dd_prompts;
        if (Array.isArray(dd_prompts)) return dd_prompts as PromptItem[];
      }
    } catch (e) {
      logger.warn('DialogDrive: storage.local.get failed');
    }
    // No site-local fallback from content scripts; preserve privacy by returning empty.
    return [];
  }

  const ensurePrompts = async (): Promise<PromptItem[]> => {
    if (cachedPrompts) return cachedPrompts;
    const prompts = await getPromptsSafe();
    cachedPrompts = prompts || [];
    return cachedPrompts;
  };

  const onKeyDown = async (e: KeyboardEvent) => {
    const key = e.key;
    const target = e.target as HTMLElement;
    logger.debug('DialogDrive: Key pressed', {
      key,
      target: target?.tagName,
      targetClass: (target as any)?.className,
    });

    // Re-resolve input in case ChatGPT re-rendered
    input = findChatGPTInput() || input;
    // If input not found via selectors, but target is editable, treat target as current input
    if (
      !input &&
      target &&
      (target.isContentEditable ||
        target instanceof HTMLTextAreaElement ||
        target.tagName?.toLowerCase() === 'input')
    ) {
      input = target;
      logger.debug('DialogDrive: Using target as input fallback', { target: target.tagName });
    }

    if (!target || !isChatInput(target)) {
      logger.debug('DialogDrive: Target not valid chat input', {
        target: target?.tagName,
        isChatInput: target ? isChatInput(target) : false,
      });
      return;
    }

    logger.debug('DialogDrive: Processing key in valid chat input', { key });

    // Detect backslash trigger if enabled
    if (pickerTrigger === 'backslash' && key === '\\') {
      logger.debug('DialogDrive: Backslash detected, opening overlay');
      e.preventDefault();
      e.stopPropagation();
      openOverlay();
      return;
    }

    // Detect '//' when typing the second '/'
    if (pickerTrigger !== 'none' && key === '/') {
      logger.debug('DialogDrive: Forward slash detected, checking for double slash');
      // Prefer textarea logic (ChatGPT uses #prompt-textarea)
      if (input instanceof HTMLTextAreaElement) {
        const ta = input as HTMLTextAreaElement;
        const start = ta.selectionStart ?? ta.value.length;
        const before = ta.value.slice(0, start);
        const charBefore = before.slice(-1);
        logger.debug('DialogDrive: Textarea check', { charBefore });
        if (pickerTrigger === 'doubleSlash' && charBefore === '/') {
          logger.info('DialogDrive: Double slash detected in textarea, opening overlay');
          e.preventDefault();
          e.stopPropagation();
          // Remove the prior '/': delete char at start-1, keep caret
          const after = ta.value.slice(start);
          const newVal = before.slice(0, -1) + after;
          const newCaret = start - 1;
          ta.value = newVal;
          ta.setSelectionRange(newCaret, newCaret);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          openOverlay();
          return;
        }
      } else if (input && input.isContentEditable) {
        logger.info('DialogDrive: Checking contenteditable for double slash');
        try {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            const offset = range.startOffset;
            const text = node.textContent || '';
            const charBefore = text.charAt(offset - 1);
            logger.info('DialogDrive: Contenteditable check', {
              charBefore,
              textBefore: text.slice(0, offset).slice(-5),
            });
            if (pickerTrigger === 'doubleSlash' && charBefore === '/') {
              logger.debug(
                'DialogDrive: Double slash detected in contenteditable, opening overlay'
              );
              e.preventDefault();
              e.stopPropagation();
              // Remove the prior '/'
              const newText = text.slice(0, offset - 1) + text.slice(offset);
              node.textContent = newText;
              const newRange = document.createRange();
              newRange.setStart(node, Math.max(0, offset - 1));
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              (input as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
              openOverlay();
              return;
            }
          }
        } catch (err) {
          logger.warn('DialogDrive: Error checking contenteditable', err as Error);
        }
      }
    }
  };

  const onInput = async (e: Event) => {
    const target = e.target as HTMLElement;
    input = findChatGPTInput() || input;
    if (
      !input &&
      target &&
      (target.isContentEditable ||
        target instanceof HTMLTextAreaElement ||
        target.tagName?.toLowerCase() === 'input')
    ) {
      input = target;
    }
    if (!target || !isChatInput(target) || !input) return;

    // Only examine when a trigger char was just typed
    const lastChar = (target as any).value?.slice?.(-1) ?? (target.textContent || '').slice(-1);
    if (lastChar !== '/' && lastChar !== '\\') return;

    // Fallback detection via input content: open on trailing \\ or //
    if (input instanceof HTMLTextAreaElement) {
      const ta = input as HTMLTextAreaElement;
      const start = ta.selectionStart ?? ta.value.length;
      const before = ta.value.slice(0, start);
      if (before.endsWith('\\')) {
        // Remove the trailing backslash and open
        const after = ta.value.slice(start);
        ta.value = before.slice(0, -1) + after;
        const newCaret = start - 1;
        ta.setSelectionRange(newCaret, newCaret);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        openOverlay();
        return;
      }
      if (before.endsWith('//')) {
        // Remove the trailing // and open
        const after = ta.value.slice(start);
        ta.value = before.slice(0, -2) + after;
        const newCaret = start - 2;
        ta.setSelectionRange(newCaret, newCaret);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        openOverlay();
        return;
      }
    } else if (input && input.isContentEditable) {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const node = range.startContainer;
          const offset = range.startOffset;
          const text = node.textContent || '';
          const lastTwo = text.slice(0, offset).slice(-2);
          const lastOne = text.slice(0, offset).slice(-1);
          if (pickerTrigger === 'doubleSlash' && lastTwo === '//') {
            node.textContent = text.slice(0, offset - 2) + text.slice(offset);
            const newRange = document.createRange();
            newRange.setStart(node, Math.max(0, offset - 2));
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            (input as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
            openOverlay();
            return;
          }
          if (pickerTrigger === 'backslash' && lastOne === '\\') {
            node.textContent = text.slice(0, offset - 1) + text.slice(offset);
            const newRange = document.createRange();
            newRange.setStart(node, Math.max(0, offset - 1));
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            (input as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
            openOverlay();
            return;
          }
        }
      } catch {
        // ignore
      }
    }
  };

  // Attach base listeners - always attach to document, even if input not found yet
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('input', onInput, true);

  // Also attach to specific input if found
  if (input) {
    logger.debug('DialogDrive: Attaching listeners to found input');
    input.addEventListener('keydown', onKeyDown, true);
    input.addEventListener('input', onInput, true);
  } else {
    logger.warn('DialogDrive: No input found initially, relying on document listeners');
  }

  // Observe DOM mutations to (re)discover ChatGPT input when SPA re-renders
  let moScheduled = false;
  const mo = new MutationObserver(() => {
    if (moScheduled) return;
    moScheduled = true;
    queueMicrotask(() => {
      moScheduled = false;
      const found = findChatGPTInput();
      if (found && found !== input) {
        logger.debug('DialogDrive: Found new input via mutation observer', {
          newInput: (found as any).tagName,
        });
        // Detach from old input
        try {
          input?.removeEventListener('keydown', onKeyDown, true);
          input?.removeEventListener('input', onInput, true);
        } catch {}
        input = found;
        // Attach to new input
        try {
          input.addEventListener('keydown', onKeyDown, true);
          input.addEventListener('input', onInput, true);
          logger.debug('DialogDrive: Attached listeners to new input');
        } catch {}
        // If we have a stable parent, scope observation to it
        try {
          const container = document.querySelector('#__next, main, body');
          if (container) {
            mo.disconnect();
            mo.observe(container, { childList: true, subtree: true });
          }
        } catch {}
      }
    });
  });
  try {
    const container = document.querySelector('#__next, main, body') || document.documentElement;
    mo.observe(container, { childList: true, subtree: true });
    logger.debug('DialogDrive: Mutation observer started');
  } catch {
    logger.warn('DialogDrive: Failed to start mutation observer');
  }

  // Helper functions for focus management - shared across overlay and form
  const getFocusableElements = (root: HTMLElement): HTMLElement[] => {
    const raw = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    return raw.filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      return rect.width > 0 || rect.height > 0 || el === document.activeElement;
    });
  };

  const setOverlayFocusState = (disable: boolean) => {
    if (!overlayEl) return;
    const overlay = overlayEl as HTMLDivElement & { inert?: boolean };
    if (disable) {
      overlay.setAttribute('aria-hidden', 'true');
      try {
        overlay.inert = true;
      } catch {
        // noop: inert not supported
      }
    } else {
      overlay.removeAttribute('aria-hidden');
      try {
        overlay.inert = false;
      } catch {
        // noop
      }
    }
  };

  function openOverlay() {
    logger.debug('DialogDrive: Opening overlay');
    if (overlayEl) closeOverlay();
    overlayEl = document.createElement('div');
    overlayEl.className = 'ddp-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.style.position = 'fixed';
    overlayEl.style.zIndex = '2147483647';
    overlayEl.style.inset = '0';
    overlayEl.style.background = 'rgba(0,0,0,0.1)';
    overlayEl.style.display = 'flex';
    overlayEl.style.alignItems = 'flex-end';
    overlayEl.style.justifyContent = 'center';
    overlayEl.style.pointerEvents = 'auto';

    // CSS custom properties for theming
    // Force light warm palette regardless of system theme
    // Warmer, greyer light palette
    overlayEl.style.setProperty('--dd-bg', '#f9f6f2');
    overlayEl.style.setProperty('--dd-surface', '#f4efe8');
    overlayEl.style.setProperty('--dd-header', '#ece7df');
    overlayEl.style.setProperty('--dd-border', '#ddd1c2');
    overlayEl.style.setProperty('--dd-text', '#141311');
    overlayEl.style.setProperty('--dd-muted', '#6b645c');
    overlayEl.style.setProperty('--dd-accent', '#111111');

    // Inject CSS for scrollbar styling and visible focus ring
    const overlayStyle = document.createElement('style');
    overlayStyle.textContent = `
    .ddp-overlay input:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
    .ddp-overlay .ddp-list { scrollbar-width: thin; scrollbar-color: #c5b9aa var(--dd-bg); }
    .ddp-overlay .ddp-list::-webkit-scrollbar { width: 10px; height: 10px; }
    .ddp-overlay .ddp-list::-webkit-scrollbar-track { background: var(--dd-bg); border-radius: 8px; }
    .ddp-overlay .ddp-list::-webkit-scrollbar-thumb { background-color: #c5b9aa; border-radius: 8px; border: 2px solid var(--dd-bg); }
    .ddp-overlay .ddp-list::-webkit-scrollbar-thumb:hover { background-color: #b4a894; }
  `;
    overlayEl.appendChild(overlayStyle);

    const panel = document.createElement('div');
    panel.className = 'ddp-panel';
    panel.setAttribute('role', 'document');
    panel.style.pointerEvents = 'auto';
    panel.style.background = 'var(--dd-bg)';
    panel.style.color = 'var(--dd-text)';
    panel.style.border = '1px solid var(--dd-border)';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 16px 48px rgba(20,19,17,0.18), 0 4px 16px rgba(20,19,17,0.08)';
    panel.style.width = 'min(680px, 96vw)';
    panel.style.height = '50vh';
    panel.style.overflow = 'hidden';
    panel.style.marginBottom = '25vh';

    // Top bar with search input and close X
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.borderBottom = '1px solid var(--dd-border)';
    header.style.background = 'var(--dd-header)';
    header.style.minHeight = '44px';

    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search prompts…';
    search.setAttribute('aria-label', 'Search prompts');
    search.style.flex = '1';
    search.style.padding = '12px 16px';
    search.style.border = '0';
    search.style.outline = 'none';
    search.style.fontSize = '14px';
    search.style.fontWeight = '500';
    search.style.background = 'transparent';
    search.style.color = 'var(--dd-text)';
    // Suppress default blue focus ring and appearance
    search.style.boxShadow = 'none';
    search.style.setProperty('appearance', 'none');
    search.style.setProperty('-webkit-appearance', 'none');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 12px';
    closeBtn.style.height = '44px';
    closeBtn.style.border = '0';
    closeBtn.style.color = 'var(--dd-text)';
    closeBtn.style.background = 'transparent';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onmouseenter = () => {
      closeBtn.style.background = 'rgba(17,17,17,0.06)';
    };
    closeBtn.onmouseleave = () => {
      closeBtn.style.background = 'transparent';
    };
    closeBtn.onclick = () => closeOverlay();

    const heading = document.createElement('h2');
    heading.id = 'ddp-heading';
    heading.textContent = 'Prompt picker';
    heading.style.position = 'absolute';
    heading.style.width = '1px';
    heading.style.height = '1px';
    heading.style.overflow = 'hidden';
    heading.style.clip = 'rect(1px, 1px, 1px, 1px)';
    heading.style.whiteSpace = 'nowrap';
    panel.setAttribute('aria-labelledby', 'ddp-heading');

    header.appendChild(heading);
    header.appendChild(search);
    header.appendChild(closeBtn);

    const list = document.createElement('div');
    list.className = 'ddp-list';
    list.setAttribute('role', 'listbox');
    list.style.maxHeight = 'calc(50vh - 44px)';
    list.style.overflow = 'auto';
    list.style.padding = '8px';
    list.style.display = 'grid';
    list.style.gap = '2px';

    const empty = document.createElement('div');
    empty.textContent = 'No prompts found';
    empty.style.color = 'var(--dd-muted)';
    empty.style.fontSize = '13px';
    empty.style.fontWeight = '500';
    empty.style.padding = '16px';
    empty.style.textAlign = 'center';
    empty.style.display = 'none';

    panel.appendChild(header);
    panel.appendChild(list);
    panel.appendChild(empty);
    overlayEl.appendChild(panel);
    document.body.appendChild(overlayEl);
    // Close when clicking backdrop (but ignore clicks inside panel)
    overlayEl.addEventListener(
      'click',
      (e) => {
        if (e.target === overlayEl) {
          closeOverlay();
        }
      },
      { capture: true, passive: true }
    );

    // Selection state
    let selectedIndex = -1;
    let currentItems: PromptItem[] = [];

    // Load and render
    (async () => {
      const prompts = await ensurePrompts();
      currentItems = prompts;
      selectedIndex = prompts.length ? 0 : -1;
      renderList();
      setTimeout(() => search.focus(), 0);
    })();

    const onSearch = async () => {
      const q = search.value.toLowerCase();
      const prompts = (await ensurePrompts()).filter(
        (p) => p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q)
      );
      currentItems = prompts;
      selectedIndex = prompts.length ? 0 : -1;
      renderList();
    };
    search.addEventListener('input', onSearch);

    function renderList() {
      logger.debug('DialogDrive: Rendering list', {
        itemCount: currentItems.length,
        selectedIndex,
      });
      // Clear previous items safely without using innerHTML.
      list.replaceChildren();
      if (!currentItems.length) {
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';
      currentItems.forEach((p, idx) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(idx === selectedIndex));
        item.style.textAlign = 'left';
        item.style.width = '100%';
        item.style.minHeight = '44px';
        item.style.padding = '12px 16px';
        item.style.borderRadius = '6px';
        item.style.border = '0';
        item.style.cursor = 'pointer';
        item.style.fontSize = '14px';
        item.style.fontWeight = '600';
        item.style.lineHeight = '1.2';
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'flex-start';
        item.style.gap = '2px';

        const isSelected = idx === selectedIndex;
        item.style.background = isSelected ? 'var(--dd-accent)' : 'transparent';
        item.style.color = isSelected ? '#fafafa' : 'var(--dd-text)';

        // Title
        const title = document.createElement('div');
        title.textContent = p.title;
        title.style.fontSize = '14px';
        title.style.fontWeight = '600';
        title.style.color = isSelected ? '#fafafa' : 'var(--dd-text)';

        // Meta info
        const meta = document.createElement('div');
        const hasPlaceholders = /\[[^\]]+\]/.test(p.text);
        const wordCount = p.text.split(/\s+/).length;
        meta.textContent = `${wordCount} words${hasPlaceholders ? ' • has placeholders' : ''}`;
        meta.style.fontSize = '12px';
        meta.style.fontWeight = '500';
        meta.style.color = isSelected ? 'rgba(250,250,250,0.8)' : 'var(--dd-muted)';

        item.appendChild(title);
        item.appendChild(meta);

        // Hover effects
        item.onmouseenter = () => {
          if (idx !== selectedIndex) {
            item.style.background = 'var(--dd-surface)';
          }
        };
        item.onmouseleave = () => {
          item.style.background = isSelected ? 'var(--dd-accent)' : 'transparent';
        };

        item.addEventListener('click', () => {
          logger.debug('DialogDrive: Item clicked', { title: p.title });
          handlePick(p);
        });
        list.appendChild(item);
      });
    }

    const onDocKey = (ev: KeyboardEvent) => {
      logger.debug('DialogDrive: Overlay key pressed', {
        key: ev.key,
        selectedIndex,
        currentItemsLength: currentItems.length,
      });

      // If Escape is pressed while the placeholder form is open, close ONLY the form
      if (ev.key === 'Escape') {
        if (formEl) {
          logger.debug('DialogDrive: Escape pressed while form open - closing form');
          ev.preventDefault();
          ev.stopPropagation();
          cleanupForm?.();
          return; // Keep the overlay open
        }
        logger.debug('DialogDrive: Escape pressed, closing overlay');
        ev.preventDefault();
        ev.stopPropagation();
        closeOverlay();
        return;
      }

      const target = ev.target as HTMLElement | null;

      if (ev.key === 'Tab') {
        if (formEl && target && formEl.contains(target)) {
          const focusable = getFocusableElements(formEl);
          ev.preventDefault();
          ev.stopPropagation();
          if (!focusable.length) return;
          const idx = focusable.indexOf(document.activeElement as HTMLElement);
          let next = idx;
          if (ev.shiftKey) {
            next = idx <= 0 ? focusable.length - 1 : idx - 1;
          } else {
            next = idx === -1 || idx >= focusable.length - 1 ? 0 : idx + 1;
          }
          focusable[next]?.focus();
          return;
        }
        if (overlayEl) {
          const focusable = getFocusableElements(overlayEl);
          if (focusable.length) {
            ev.preventDefault();
            ev.stopPropagation();
            const idx = focusable.indexOf(document.activeElement as HTMLElement);
            let next = idx;
            if (ev.shiftKey) {
              next = idx <= 0 ? focusable.length - 1 : idx - 1;
            } else {
              next = idx === -1 || idx >= focusable.length - 1 ? 0 : idx + 1;
            }
            focusable[next]?.focus();
          }
          return;
        }
      }

      if (formEl && target && formEl.contains(target)) {
        // Let the placeholder form manage non-escape key interactions.
        ev.stopPropagation();
        return;
      }

      // While overlay is open, steer selection
      if (['ArrowDown', 'ArrowUp'].includes(ev.key)) {
        logger.debug('DialogDrive: Arrow key pressed', {
          key: ev.key,
          currentSelectedIndex: selectedIndex,
        });
        ev.preventDefault();
        ev.stopPropagation();
        if (!currentItems.length) return;
        if (ev.key === 'ArrowDown')
          selectedIndex = Math.min(currentItems.length - 1, selectedIndex + 1);
        if (ev.key === 'ArrowUp') selectedIndex = Math.max(0, selectedIndex - 1);
        logger.debug('DialogDrive: Updated selectedIndex', { newSelectedIndex: selectedIndex });
        renderList();
        return;
      }

      if (ev.key === 'Enter') {
        logger.debug('DialogDrive: Enter pressed in overlay', {
          selectedIndex,
          itemsLength: currentItems.length,
          hasValidSelection: selectedIndex >= 0 && selectedIndex < currentItems.length,
        });
        ev.preventDefault();
        ev.stopPropagation();
        if (selectedIndex >= 0 && selectedIndex < currentItems.length) {
          logger.debug('DialogDrive: Selecting item', { title: currentItems[selectedIndex].title });
          handlePick(currentItems[selectedIndex]);
        } else {
          logger.debug('DialogDrive: Invalid selection index, cannot pick item');
        }
        return;
      }
    };
    document.addEventListener('keydown', onDocKey, true);

    // Let Enter choose the current selection when focused in search
    search.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        if (selectedIndex >= 0 && selectedIndex < currentItems.length) {
          handlePick(currentItems[selectedIndex]);
        }
      } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        // Already handled globally to allow arrow keys even if focus shifts
        ev.preventDefault();
      }
    });

    function closeOverlay() {
      cleanupForm?.();
      document.removeEventListener('keydown', onDocKey, true);
      overlayEl?.remove();
      overlayEl = null;
    }

    async function handlePick(p: PromptItem) {
      logger.debug('DialogDrive: handlePick called', {
        prompt: p.title,
        hasPlaceholders: extractPlaceholders(p.text).length > 0,
      });
      // Build placeholder form if needed
      const placeholders = Array.from(new Set(extractPlaceholders(p.text)));
      if (!placeholders.length) {
        logger.debug('DialogDrive: No placeholders, inserting directly');
        // Delegate insertion/paste to platform manager for consistency
        platformManager.paste(p.text);
        closeOverlay();
        return;
      }
      logger.debug('DialogDrive: Has placeholders, opening form', { placeholders });
      openFillForm(p, placeholders, closeOverlay);
    }
  }

  function openFillForm(prompt: PromptItem, placeholders: string[], onClose: () => void) {
    cleanupForm?.();

    formEl = document.createElement('div');
    const currentFormEl = formEl;
    currentFormEl.style.position = 'fixed';
    currentFormEl.style.zIndex = '2147483647';
    currentFormEl.style.inset = '0';
    currentFormEl.style.background = 'rgba(0,0,0,0.35)';
    currentFormEl.style.display = 'block';

    // Apply theme variables (match warm light palette)
    const isDark =
      window.matchMedia('(prefers-color-scheme: dark)').matches ||
      document.documentElement.classList.contains('dark');
    currentFormEl.style.setProperty('--dd-bg', '#f9f6f2');
    currentFormEl.style.setProperty('--dd-surface', '#f4efe8');
    currentFormEl.style.setProperty('--dd-header', '#ece7df');
    currentFormEl.style.setProperty('--dd-border', '#ddd1c2');
    currentFormEl.style.setProperty('--dd-text', '#141311');
    currentFormEl.style.setProperty('--dd-muted', '#6b645c');
    currentFormEl.style.setProperty('--dd-accent', '#111111');

    // Inject style for visible focus ring in form and style scrollbars inside card
    const formStyle = document.createElement('style');
    formStyle.textContent = `
      .ddp-form input:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
      .ddp-form { scrollbar-width: thin; scrollbar-color: #c5b9aa var(--dd-bg); }
      .ddp-form::-webkit-scrollbar { width: 10px; height: 10px; }
      .ddp-form::-webkit-scrollbar-track { background: var(--dd-bg); border-radius: 8px; }
      .ddp-form::-webkit-scrollbar-thumb { background-color: #c5b9aa; border-radius: 8px; border: 2px solid var(--dd-bg); }
      .ddp-form::-webkit-scrollbar-thumb:hover { background-color: #b4a894; }
    `;
    currentFormEl.appendChild(formStyle);

    const card = document.createElement('div');
    card.className = 'ddp-form';
    card.style.background = 'var(--dd-bg)';
    card.style.color = 'var(--dd-text)';
    card.style.border = '1px solid var(--dd-border)';
    card.style.borderRadius = '8px';
    card.style.boxShadow = isDark
      ? '0 10px 30px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.3)'
      : '0 10px 30px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)';
    card.style.width = 'min(680px, 96vw)';
    card.style.maxHeight = '45vh';
    card.style.overflow = 'auto';
    card.style.padding = '20px';
    // Position centered within the overlay panel
    card.style.position = 'fixed';

    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.alignItems = 'center';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.gap = '8px';

    const titleEl = document.createElement('div');
    titleEl.textContent = `Fill details for: ${prompt.title}`;
    titleEl.style.fontSize = '15px';
    titleEl.style.fontWeight = '600';
    titleEl.style.color = 'var(--dd-text)';

    const closeForm = () => {
      cleanupForm?.();
    };

    const xBtn = document.createElement('button');
    xBtn.type = 'button';
    xBtn.setAttribute('aria-label', 'Close');
    xBtn.textContent = '×';
    xBtn.style.fontSize = '18px';
    xBtn.style.lineHeight = '1';
    xBtn.style.padding = '0 6px';
    xBtn.style.height = '28px';
    xBtn.style.border = '0';
    xBtn.style.color = 'var(--dd-text)';
    xBtn.style.background = 'transparent';
    xBtn.style.cursor = 'pointer';
    xBtn.onmouseenter = () => {
      xBtn.style.background = 'rgba(17,17,17,0.06)';
    };
    xBtn.onmouseleave = () => {
      xBtn.style.background = 'transparent';
    };
    xBtn.onclick = () => {
      closeForm();
    };

    headerRow.appendChild(titleEl);
    headerRow.appendChild(xBtn);

    const hint = document.createElement('div');
    hint.textContent = 'Use Tab/Shift+Tab to move · Press Enter to insert · Esc to close';
    hint.style.fontSize = '12px';
    hint.style.fontWeight = '500';
    hint.style.color = 'var(--dd-muted)';
    hint.style.marginBottom = '16px';

    const form = document.createElement('form');
    form.style.display = 'grid';
    form.style.gap = '16px';
    const inputs: Record<string, HTMLInputElement> = {};
    for (const ph of placeholders) {
      const labelEl = document.createElement('label');
      labelEl.textContent = ph;
      labelEl.style.fontSize = '13px';
      labelEl.style.fontWeight = '500';
      labelEl.style.color = 'var(--dd-text)';
      labelEl.style.marginBottom = '4px';

      const inputField = document.createElement('input');
      inputField.type = 'text';
      inputField.placeholder = ph;
      inputField.style.padding = '12px 16px';
      inputField.style.borderRadius = '6px';
      inputField.style.border = '1px solid var(--dd-border)';
      inputField.style.background = 'var(--dd-surface)';
      inputField.style.color = 'var(--dd-text)';
      inputField.style.fontSize = '14px';
      inputField.style.fontWeight = '500';
      inputField.style.outline = 'none';
      inputField.style.transition = 'border-color 0.2s ease';

      // Handle Enter key in individual inputs
      inputField.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          ev.stopPropagation();
          if (typeof form.onsubmit === 'function') {
            const fakeEvent = {
              preventDefault: () => {},
              stopPropagation: () => {},
            } as unknown as SubmitEvent;
            form.onsubmit(fakeEvent);
          } else {
            // Fallback manual submission
            const replacements: Record<string, string> = {};
            for (const k of placeholders) {
              replacements[k] = inputs[k]?.value || '';
            }
            const manualFilledText = replacePlaceholders(prompt.text, replacements);
            try {
              // Use platform manager for insertion
              platformManager.paste(manualFilledText);
              closeForm();
              onClose();
            } catch (err) {
              logger.error('DialogDrive: Manual submission error', err);
            }
          }
        }
      });

      inputs[ph] = inputField;
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gap = '4px';
      row.appendChild(labelEl);
      row.appendChild(inputField);
      form.appendChild(row);
    }

    form.onsubmit = (ev: SubmitEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      const replacements: Record<string, string> = {};
      for (const ph of placeholders) {
        const value = inputs[ph]?.value || '';
        replacements[ph] = value;
      }

      const formFilledText = replacePlaceholders(prompt.text, replacements);
      try {
        // Use platform manager for insertion
        platformManager.paste(formFilledText);
        closeForm();
        onClose();
      } catch (err) {
        logger.error('DialogDrive: Error during form submission', err);
      }
    };

    const handleFormKeydown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Tab') return;
      const focusable = getFocusableElements(currentFormEl);
      ev.preventDefault();
      ev.stopPropagation();
      if (!focusable.length) return;
      const idx = focusable.indexOf(document.activeElement as HTMLElement);
      let next = idx;
      if (ev.shiftKey) {
        next = idx <= 0 ? focusable.length - 1 : idx - 1;
      } else {
        next = idx === -1 || idx >= focusable.length - 1 ? 0 : idx + 1;
      }
      focusable[next]?.focus();
    };
    currentFormEl.addEventListener('keydown', handleFormKeydown, true);

    card.appendChild(headerRow);
    card.appendChild(hint);
    card.appendChild(form);
    currentFormEl.appendChild(card);

    const positionCard = () => {
      try {
        const panelNode = overlayEl?.querySelector('.ddp-panel') as HTMLElement | null;
        const panelRect = panelNode?.getBoundingClientRect();
        const cw = card.offsetWidth;
        const ch = card.offsetHeight;
        if (panelRect && cw && ch) {
          const left = Math.max(8, Math.round(panelRect.left + (panelRect.width - cw) / 2));
          const top = Math.max(8, Math.round(panelRect.top + (panelRect.height - ch) / 2));
          card.style.left = left + 'px';
          card.style.top = top + 'px';
        } else {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const left = Math.max(8, Math.round((vw - cw) / 2));
          const top = Math.max(8, Math.round((vh - ch) / 2));
          card.style.left = left + 'px';
          card.style.top = top + 'px';
        }
      } catch {}
    };
    const onResize = () => positionCard();
    requestAnimationFrame(positionCard);
    window.addEventListener('resize', onResize, { passive: true });

    const onBackdropClick = (e: MouseEvent) => {
      if (e.target === currentFormEl) {
        closeForm();
      }
    };
    currentFormEl.addEventListener('click', onBackdropClick, { capture: true, passive: true });

    cleanupForm = () => {
      window.removeEventListener('resize', onResize);
      currentFormEl.removeEventListener('keydown', handleFormKeydown, true);
      currentFormEl.removeEventListener('click', onBackdropClick, true);
      setOverlayFocusState(false);
      currentFormEl.remove();
      if (formEl === currentFormEl) {
        formEl = null;
      }
      cleanupForm = null;
    };

    setOverlayFocusState(true);
    document.body.appendChild(currentFormEl);

    // Focus the first input after a short delay
    setTimeout(() => {
      const firstInput = Object.values(inputs)[0];
      firstInput?.focus();
    }, 100);
  }

  // Placeholder helpers now imported from '../lib/placeholders'

  // Direct insertion helpers removed; platformManager.paste is the single path

  function findChatGPTInput(): HTMLElement | null {
    const selectors = [
      '#prompt-textarea',
      'textarea#prompt-textarea',
      'textarea[placeholder*="Message" i]',
      'textarea[aria-label*="message" i]',
      'div[role="textbox"][contenteditable="true"]',
      '[contenteditable="true"][data-testid="textbox"]',
      'div[contenteditable="true"][data-lexical-editor]',
      '[contenteditable="true"][aria-label*="message" i]',
      'textarea[data-testid="textbox"]',
      'div[contenteditable="true"]', // More general fallback
      'textarea', // Most general fallback
      // Add some more specific ChatGPT patterns
      'div[data-testid="prosemirror-editor"]',
      '[data-slate-editor="true"]',
      'div[contenteditable][role="textbox"]',
    ];

    // Fast-path: try last successful selector first
    const g: any = globalThis as any;
    const lastSel: string | undefined = g.__ddLastSelector;
    if (lastSel) {
      const el = document.querySelector<HTMLElement>(lastSel);
      if (el && (el.offsetParent !== null || el === document.activeElement)) return el;
    }

    for (const s of selectors) {
      const el = document.querySelector<HTMLElement>(s);
      if (el && (el.offsetParent !== null || el === document.activeElement)) {
        // Must be visible or focused
        (globalThis as any).__ddLastSelector = s;
        return el;
      }
    }

    return null;
  }

  function isChatInput(el: HTMLElement): boolean {
    if (!el) return false;
    // Consider any editable element as valid chat input target
    if (el.isContentEditable) return true;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const t = (el as HTMLInputElement).type?.toLowerCase();
      if (['text', 'search', 'email', 'url', ''].includes(t || '')) return true;
    }
    return !!input && (el === input || input.contains(el));
  }

  // Removed redundant get/set helpers to reduce duplication

  // Removed caret helpers as unused
  // Cleanup on pagehide (avoid beforeunload to preserve BFCache)
  const cleanup = () => {
    try {
      document.removeEventListener('keydown', onKeyDown, true);
    } catch {}
    try {
      document.removeEventListener('input', onInput, true);
    } catch {}
    try {
      mo.disconnect();
    } catch {}
  };
  window.addEventListener('pagehide', cleanup, { once: true });
}
