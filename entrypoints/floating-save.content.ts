// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Floating save content script that injects the quick-save UI into chat pages.
import { logger } from '../lib/logger';
import { createTagChip, sanitizeTagLabel } from './floating-save/tagHelpers';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*'
  ],
  main() {
    logger.info('DialogDrive floating save button initialized');

    // Tracks DOM nodes and helpers created for the floating save button lifecycle.
    let host: HTMLDivElement | null = null;
    let shadow: ShadowRoot | null = null;
    let controller: AbortController | null = null;
    let mo: MutationObserver | null = null;
    let lastUrl = location.href;
    let restoreFocusEl: HTMLElement | null = null;

    // Figures out which AI platform we are on to tag saved chats sanely.
    const detectPlatform = (url: string): 'chatgpt' | 'gemini' | 'claude' | 'deepseek' => {
      try {
        const h = new URL(url).hostname;
        if (h.includes('chatgpt') || h.includes('openai')) return 'chatgpt';
        if (h.includes('gemini') || h.includes('google')) return 'gemini';
        if (h.includes('claude') || h.includes('anthropic')) return 'claude';
        if (h.includes('deepseek')) return 'deepseek';
      } catch {}
      return 'chatgpt';
    };

    // Cleans up the injected UI so we can rebuild it on navigation changes.
    const teardown = () => {
      try { controller?.abort(); } catch {}
      controller = null;
      try { mo?.disconnect(); } catch {}
      mo = null;
      if (host && host.parentNode) host.parentNode.removeChild(host);
      host = null;
      shadow = null;
    };

    // Builds the floating action button, modal markup, and related event wiring.
    const createFloatingButton = () => {
      teardown();
      controller = new AbortController();
      const signal = controller.signal;

      host = document.createElement('div');
      host.id = 'dialogdrive-floating-save';
      shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <style>
          :host { position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .dd-float-button { width:48px; height:48px; border-radius:12px; background:#e7e5e4; border:1px solid #d6d3d1; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; position:relative; }
          .dd-float-button:hover { background:#dad7d5; }
          .dd-float-button:active { background:#cecac7; }
          .dd-float-button svg { width:22px; height:22px; fill:#292524; }
          .dd-tooltip { position:absolute; bottom:100%; right:0; margin-bottom:6px; padding:6px 8px; background:#292524; color:#f5f5f4; font-size:11px; border-radius:4px; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity .15s; }
          .dd-float-button:hover .dd-tooltip { opacity: 1; }
          .dd-quick-save-modal { position:fixed; bottom:72px; right:24px; width:340px; max-height:480px; background:#f5f5f4; border:1px solid #d6d3d1; border-radius:10px; z-index:999998; display:none; flex-direction:column; }
          .dd-quick-save-modal.show { display: flex; }
          .dd-modal-header { padding:12px 16px; border-bottom:1px solid #d6d3d1; display:flex; align-items:center; justify-content:space-between; }
          .dd-modal-title { font-size:14px; font-weight:600; color:#111827; margin:0; }
          .dd-modal-close { width:22px; height:22px; border:none; background:transparent; cursor:pointer; color:#57534e; display:flex; align-items:center; justify-content:center; border-radius:4px; }
          .dd-modal-close:hover { background:#e7e5e4; }
          .dd-modal-body { padding:14px 16px; overflow-y:auto; flex:1; }
          .dd-form-group { margin-bottom: 16px; }
          .dd-form-label { display:block; font-size:12px; font-weight:500; color:#44403c; margin-bottom:4px; }
          .dd-form-input, .dd-form-textarea, .dd-form-select { width:100%; padding:6px 10px; border:1px solid #d6d3d1; border-radius:6px; font-size:13px; background:#fff; color:#111827; box-sizing:border-box; }
          .dd-form-input:focus, .dd-form-textarea:focus, .dd-form-select:focus { outline:none; border-color:#a8a29e; }
          .dd-select { position: relative; }
          .dd-select-trigger { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 10px; border:1px solid #d6d3d1; border-radius:6px; background:#fff; color:#111827; font-size:13px; cursor:pointer; }
          .dd-select-trigger:hover { background:#f9fafb; }
          .dd-select-content { position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:220px; overflow:auto; background:#fff; border:1px solid #d6d3d1; border-radius:8px; padding:6px; z-index:1000000; display:none; }
          .dd-select-item { display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:6px; cursor:pointer; }
          .dd-select-item:hover { background:#f4f4f5; }
          .dd-select-check { width:14px; height:14px; color:#16a34a; opacity:0.9; }
          .dd-select-spacer { width:14px; height:14px; }
          .dd-select-del { margin-left:auto; border:none; background:transparent; color:#dc2626; cursor:pointer; padding:2px; border-radius:4px; }
          .dd-select-del:hover { background:#fee2e2; }
          .dd-tag { display:inline-flex; align-items:center; gap:4px; padding:3px 7px; background:#e7e5e4; color:#292524; font-size:11px; border-radius:4px; }
          .dd-tag-remove { cursor: pointer; opacity: 0.7; transition: opacity 0.2s; width: 14px; height: 14px; }
          .dd-tag-remove:hover { opacity: 1; }
          .dd-form-actions { padding:12px 16px; border-top:1px solid #d6d3d1; display:flex; justify-content:flex-end; gap:8px; }
          .dd-btn { padding:6px 14px; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; transition:background .15s; border:1px solid #d6d3d1; background:#e7e5e4; color:#292524; }
          .dd-btn-primary { background:#292524; color:#f5f5f4; border-color:#292524; }
          .dd-btn-primary:hover { background:#3f3a36; }
          .dd-pin-toggle { display:flex; align-items:center; justify-content:space-between; }
          .dd-switch { position:relative; width:40px; height:22px; background:#d6d3d1; border-radius:11px; cursor:pointer; transition:background .2s; }
          .dd-switch.active { background:#292524; }
          .dd-switch-thumb { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:transform .2s; }
          .dd-switch.active .dd-switch-thumb { transform: translateX(20px); }
          @media (max-width: 640px) { .dd-quick-save-modal { right: 16px; left: 16px; width: auto; } :host { bottom: 16px; right: 16px; } }
        </style>
        <button class="dd-float-button" id="dd-save-btn" aria-label="Save to DialogDrive" aria-haspopup="dialog" aria-expanded="false" aria-controls="dd-save-modal">
          <span class="dd-tooltip">Save to DialogDrive</span>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </button>
        <div class="dd-quick-save-modal" id="dd-save-modal" role="dialog" aria-modal="true" aria-labelledby="dd-modal-title" aria-describedby="dd-modal-desc">
          <div class="dd-modal-header">
            <h3 class="dd-modal-title" id="dd-modal-title">Save to DialogDrive</h3>
            <button class="dd-modal-close" id="dd-close-modal" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12.854 4.854a.5.5 0 0 0 0-.708l-.708-.708a.5.5 0 0 0-.708 0L8 6.793 4.646 3.438a.5.5 0 0 0-.708 0l-.708.708a.5.5 0 0 0 0 .708L6.586 8l-3.354 3.354a.5.5 0 0 0 0 .708l.708.708a.5.5 0 0 0 .708 0L8 9.414l3.354 3.354a.5.5 0 0 0 .708 0l.708-.708a.5.5 0 0 0 0-.708L9.414 8l3.354-3.146z"/></svg>
            </button>
          </div>
          <div class="dd-modal-body" id="dd-modal-desc">
            <form id="dd-save-form">
              <div class="dd-form-group">
                <label class="dd-form-label" for="dd-title">Title *</label>
                <input type="text" class="dd-form-input" id="dd-title" placeholder="Enter a descriptive title..." required aria-required="true" />
              </div>
              <div class="dd-form-group">
                <label class="dd-form-label" for="dd-url">URL *</label>
                <input type="url" class="dd-form-input" id="dd-url" placeholder="https://example.com/..." required readonly aria-required="true" />
              </div>
              <div class="dd-form-group">
                <label class="dd-form-label">Workspace</label>
                <div id="dd-workspace-select" class="dd-select">
                  <button type="button" class="dd-select-trigger" id="dd-workspace-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="dd-workspace-content">
                    <span id="dd-workspace-label">General</span>
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.21z"/></svg>
                  </button>
                  <div class="dd-select-content" id="dd-workspace-content" role="listbox" style="display:none"></div>
                  <div class="dd-tag-input-container" style="margin-top:8px;">
                    <input type="text" id="dd-new-workspace" class="dd-form-input" placeholder="New workspace name" />
                    <button type="button" class="dd-btn" id="dd-add-workspace">Add</button>
                  </div>
                </div>
              </div>
              <div class="dd-form-group">
                <label class="dd-form-label">Tags</label>
                <div id="dd-tag-select" class="dd-select">
                  <button type="button" class="dd-select-trigger" id="dd-tag-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="dd-tag-content">
                    <span id="dd-tag-label">Select tags</span>
                  </button>
                  <div class="dd-select-content" id="dd-tag-content" role="listbox" style="display:none"></div>
                </div>
                <div class="dd-tag-input-container" style="margin-top:8px;">
                  <input type="text" id="dd-tag-input" class="dd-form-input" placeholder="Add a tag and press Enter" />
                  <button type="button" class="dd-btn" id="dd-add-tag">Add</button>
                </div>
                <div id="dd-tags" class="dd-tag-list"></div>
              </div>
              <div class="dd-form-group">
                <div class="dd-pin-toggle">
                  <label class="dd-form-label" style="margin: 0;">Pin this bookmark</label>
                  <div class="dd-switch" id="dd-pin-switch" role="switch" aria-checked="false">
                    <div class="dd-switch-thumb"></div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="dd-form-actions">
            <button class="dd-btn dd-btn-secondary" id="dd-cancel" type="button">Cancel</button>
            <button class="dd-btn dd-btn-primary" id="dd-save" type="button">Save Bookmark</button>
          </div>
        </div>
      `;

      document.body.appendChild(host);

      // Setup behavior in shadow DOM
      // Short-hand selectors stay inside the shadow root to avoid page collisions.
      const q = (sel: string) => shadow!.querySelector(sel) as HTMLElement | null;
      const byId = (id: string) => shadow!.getElementById(id) as HTMLElement | null;
      const saveBtn = q('#dd-save-btn') as HTMLButtonElement | null;
      const modal = q('#dd-save-modal') as HTMLDivElement | null;
      const closeBtn = q('#dd-close-modal') as HTMLButtonElement | null;
      const cancelBtn = byId('dd-cancel') as HTMLButtonElement | null;
      const saveBookmarkBtn = byId('dd-save') as HTMLButtonElement | null;
      const pinSwitch = byId('dd-pin-switch') as HTMLDivElement | null;
      const tagInput = byId('dd-tag-input') as HTMLInputElement | null;
      const addTagBtn = byId('dd-add-tag') as HTMLButtonElement | null;
      const tagsContainer = byId('dd-tags') as HTMLDivElement | null;
      const titleInput = byId('dd-title') as HTMLInputElement | null;
      const urlInput = byId('dd-url') as HTMLInputElement | null;
      const workspaceTrigger = byId('dd-workspace-trigger') as HTMLButtonElement | null;
      const workspaceContent = byId('dd-workspace-content') as HTMLDivElement | null;
      const workspaceLabel = byId('dd-workspace-label') as HTMLSpanElement | null;
      const newWorkspaceInput = byId('dd-new-workspace') as HTMLInputElement | null;
      const addWorkspaceBtn = byId('dd-add-workspace') as HTMLButtonElement | null;
      const tagTrigger = byId('dd-tag-trigger') as HTMLButtonElement | null;
      const tagContent = byId('dd-tag-content') as HTMLDivElement | null;
      const tagLabel = byId('dd-tag-label') as HTMLSpanElement | null;

      let tags: string[] = [];
      let isPinned = false;
      let currentWorkspace = 'General';

      // Keeps the custom dropdowns in sync with what the user is viewing.
      const toggleWorkspaceDropdown = (open?: boolean) => {
        if (!workspaceContent || !workspaceTrigger) return;
        const willOpen = open ?? workspaceContent.style.display === 'none';
        workspaceContent.style.display = willOpen ? 'block' : 'none';
        workspaceTrigger.setAttribute('aria-expanded', String(willOpen));
      };

      const toggleTagDropdown = (open?: boolean) => {
        if (!tagContent || !tagTrigger) return;
        const willOpen = open ?? tagContent.style.display === 'none';
        tagContent.style.display = willOpen ? 'block' : 'none';
        tagTrigger.setAttribute('aria-expanded', String(willOpen));
      };

      // Updates the lightweight inline pills so people can see chosen tags.
      const updateTagLabel = () => {
        if (!tagLabel) return;
        tagLabel.textContent = tags.length === 0 ? 'Select tags' : `${tags.length} selected`;
      };

      // Renders visual tag chips inside the modal, respecting sanitization.
      const renderTags = () => {
        if (!tagsContainer) return;
        tagsContainer.replaceChildren();
        // Iterate through the selected tags and draw a chip for each one.
        tags.forEach((tag) => {
          const safeTag = sanitizeTagLabel(tag);
          if (!safeTag) {
            return;
          }
          try {
            const chip = createTagChip({
              document,
              tag: safeTag,
              onRemove: () => {
                tags = tags.filter(t => t !== safeTag);
                renderTags();
                updateTagLabel();
              },
              signal,
            });
            tagsContainer.appendChild(chip);
          } catch (error) {
            logger.warn('Skipping invalid tag during render', error);
          }
        });
      };

      // Builds the tag picker menu with delete actions inside the shadow DOM.
      const buildTagList = (all: string[]) => {
        if (!tagContent) return;
        tagContent.replaceChildren();
        const seen = new Set<string>();
        // Walk the entire tag catalog so we can offer deduped suggestions.
        all.forEach((rawTag) => {
          const safeTag = sanitizeTagLabel(rawTag);
          if (!safeTag || seen.has(safeTag)) {
            return;
          }
          seen.add(safeTag);

          const row = document.createElement('div');
          row.className = 'dd-select-item';
          row.dataset.tag = safeTag;

          const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          check.setAttribute('viewBox', '0 0 16 16');
          check.setAttribute('fill', 'currentColor');
          check.setAttribute('class', 'dd-select-check');
          const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          checkPath.setAttribute('d', 'M13.485 1.929a1.5 1.5 0 0 1 0 2.121L6.75 10.786l-3.536-3.536a1.5 1.5 0 1 1 2.121-2.121l1.415 1.415 5.657-5.657a1.5 1.5 0 0 1 2.121 0z');
          check.appendChild(checkPath);

          const spacer = document.createElement('div');
          spacer.setAttribute('class', 'dd-select-spacer');
          row.appendChild(tags.includes(safeTag) ? check : spacer);

          const labelBtn = document.createElement('button');
          labelBtn.type = 'button';
          labelBtn.textContent = safeTag;
          labelBtn.style.cssText = 'flex:1; text-align:left; padding:2px 0; color:#292524; background:transparent; border:none;';
          labelBtn.addEventListener('click', () => {
            if (tags.includes(safeTag)) {
              tags = tags.filter(x => x !== safeTag);
            } else {
              tags = [...tags, safeTag];
            }
            renderTags();
            updateTagLabel();
            const first = row.firstChild as HTMLElement | null;
            if (first) {
              row.removeChild(first);
              row.insertBefore(tags.includes(safeTag) ? check : spacer, row.firstChild);
            }
          }, { signal });
          row.appendChild(labelBtn);

          const del = document.createElement('button');
          del.setAttribute('aria-label', `Delete tag ${safeTag}`);
          del.className = 'dd-select-del';
          del.textContent = String.fromCharCode(215);
          del.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ok = confirm(`Delete tag "${safeTag}" from all items?`);
            if (!ok) return;
            try {
              const resp = await browser.runtime.sendMessage({ type: 'DELETE_TAG', tag: safeTag });
              if (resp?.success) {
                tags = tags.filter(x => x !== safeTag);
                renderTags();
                updateTagLabel();
                await loadWorkspacesAndTags();
              } else {
                alert('Failed to delete tag');
              }
            } catch {
              alert('Failed to delete tag');
            }
          }, { signal });
          row.appendChild(del);
          tagContent.appendChild(row);
        });
      };

      // Draws the workspace dropdown and wires in delete/migrate shortcuts.
      const buildWorkspaceList = (workspaces: string[]) => {
        if (!workspaceContent) return;
        workspaceContent.innerHTML = '';
        // List each workspace as a selectable row in the dropdown.
        workspaces.forEach((ws) => {
          const row = document.createElement('div');
          row.className = 'dd-select-item';
          row.dataset.ws = ws;
          const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          check.setAttribute('viewBox', '0 0 16 16');
          check.setAttribute('fill', 'currentColor');
          check.setAttribute('class', 'dd-select-check');
          check.innerHTML = '<path d="M13.485 1.929a1.5 1.5 0 0 1 0 2.121L6.75 10.786l-3.536-3.536a1.5 1.5 0 1 1 2.121-2.121l1.415 1.415 5.657-5.657a1.5 1.5 0 0 1 2.121 0z" />';
          const spacer = document.createElement('div');
          spacer.setAttribute('class', 'dd-select-spacer');
          row.appendChild(ws === currentWorkspace ? check : spacer);
          const labelBtn = document.createElement('button');
          labelBtn.type = 'button'; labelBtn.textContent = ws; labelBtn.style.cssText = 'flex:1; text-align:left; padding:2px 0; color:#292524; background:transparent; border:none;';
          labelBtn.addEventListener('click', () => { setWorkspace(ws); toggleWorkspaceDropdown(false); }, { signal });
          row.appendChild(labelBtn);
          if (ws !== 'General') {
            const del = document.createElement('button'); del.setAttribute('aria-label', `Delete workspace ${ws}`); del.className = 'dd-select-del'; del.innerHTML = '&times;';
            del.addEventListener('click', async (e) => {
              e.stopPropagation();
              const ok = confirm(`Delete workspace "${ws}" and move its items to General?`);
              if (!ok) return;
              try {
                const resp = await browser.runtime.sendMessage({ type: 'DELETE_WORKSPACE', name: ws });
                if (resp?.success) { if (currentWorkspace === ws) setWorkspace('General'); await loadWorkspacesAndTags(); } else { alert('Failed to delete workspace'); }
              } catch { alert('Failed to delete workspace'); }
            }, { signal });
            row.appendChild(del);
          }
          workspaceContent.appendChild(row);
        });
      };

      // Persists which workspace the quick-save modal is targeting.
      const setWorkspace = (ws: string) => {
        currentWorkspace = ws;
        if (workspaceLabel) workspaceLabel.textContent = ws;
        // update checks
        const items = workspaceContent?.querySelectorAll('[data-ws]') || [];
        // Update every workspace row so only the active one shows the check icon.
        items.forEach((el) => {
          const row = el as HTMLElement;
          const first = row.firstElementChild as HTMLElement | null;
          if (!first) return;
          if (row.dataset.ws === ws) first.innerHTML = '<svg viewBox="0 0 16 16" fill="currentColor" class="dd-select-check"><path d="M13.485 1.929a1.5 1.5 0 0 1 0 2.121L6.75 10.786l-3.536-3.536a1.5 1.5 0 1 1 2.121-2.121l1.415 1.415 5.657-5.657a1.5 1.5 0 0 1 2.121 0z" /></svg>'; else first.innerHTML = '<div class="dd-select-spacer"></div>';
        });
      };

      // Refreshes the form fields whenever the modal opens or URL changes.
      const updateUrlTitle = () => {
        if (urlInput) urlInput.value = location.href;
        if (titleInput) titleInput.value = document.title || '';
      };

      // Pulls known workspaces and tags from the background for dropdowns.
      const loadWorkspacesAndTags = async () => {
        try {
          const response = await browser.runtime.sendMessage({ type: 'GET_WORKSPACES_AND_TAGS' });
          if (response.workspaces) buildWorkspaceList(response.workspaces);
          if (response.tags) buildTagList(response.tags);
        } catch (error) { logger.error('Failed to load workspaces and tags:', error); }
      };

      // Adds a new tag chip after sanitizing the input.
      const addTag = () => {
        const candidate = sanitizeTagLabel(tagInput?.value || '');
        if (!candidate) return;
        if (!tags.includes(candidate)) tags = [...tags, candidate];
        if (tagInput) tagInput.value = '';
        renderTags();
        updateTagLabel();
      };

      // Opens the modal and manages focus trapping for accessibility.
      const openModal = () => {
        if (!modal) return;
        restoreFocusEl = (shadow!.activeElement as HTMLElement) || (document.activeElement as HTMLElement);
        modal.classList.add('show');
        saveBtn?.setAttribute('aria-expanded', 'true');
        updateUrlTitle();
        loadWorkspacesAndTags();
        const focusables = Array.from(modal.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        // Run through the focusable nodes so we can park focus at the top.
        (focusables[0] || modal).focus();
      };

      // Closes the quick-save modal and restores focus to the trigger.
      const closeModal = () => {
        if (!modal) return;
        modal.classList.remove('show');
        const trigger = saveBtn || restoreFocusEl; trigger?.setAttribute?.('aria-expanded', 'false'); (trigger as any)?.focus?.();
      };

      // Gathers the form data and asks the background page to persist it.
      const saveBookmark = async () => {
        if (!titleInput?.value.trim() || !urlInput?.value.trim()) { alert('Please enter both title and URL'); return; }
        try {
          const bookmarkData = {
            title: titleInput.value.trim(),
            url: urlInput.value.trim(),
            platform: detectPlatform(urlInput.value),
            workspace: currentWorkspace,
            description: undefined,
            tags: tags,
            isPinned: isPinned,
          };
          const response = await browser.runtime.sendMessage({ type: 'SAVE_BOOKMARK', data: bookmarkData });
          if (response?.success) { showSuccess('Bookmark saved successfully!'); closeModal(); tags = []; isPinned = false; renderTags(); if (pinSwitch) pinSwitch.classList.remove('active'); }
          else throw new Error(response?.error || 'Failed to save bookmark');
        } catch (error) { logger.error('Failed to save bookmark:', error); alert('Failed to save bookmark. Please try again.'); }
      };

      // Pops a short-lived success toast inside the host page.
      const showSuccess = (message: string) => {
        const notification = document.createElement('div');
        notification.style.cssText = 'position:fixed; top:20px; right:20px; background:#10b981; color:white; padding:12px 16px; border-radius:8px; z-index:9999999; font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; font-size:14px;';
        notification.textContent = message; document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      };

      // Listeners
      // Button open/close wiring keeps the modal responsive to user actions.
      saveBtn?.addEventListener('click', openModal, { signal });
      closeBtn?.addEventListener('click', closeModal, { signal });
      cancelBtn?.addEventListener('click', closeModal, { signal });
      saveBookmarkBtn?.addEventListener('click', saveBookmark, { signal });
      addTagBtn?.addEventListener('click', addTag, { signal });
      tagInput?.addEventListener('keypress', (e) => { if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); addTag(); } }, { signal });
      pinSwitch?.addEventListener('click', () => { isPinned = !isPinned; pinSwitch.classList.toggle('active', isPinned); pinSwitch.setAttribute('aria-checked', String(isPinned)); }, { signal });
      modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); }, { signal });
      shadow!.addEventListener('keydown', (e: any) => {
        if (e.key === 'Escape' && modal?.classList.contains('show')) { e.stopPropagation(); closeModal(); return; }
        if (e.key === 'Tab' && modal?.classList.contains('show')) {
          const focusables = Array.from(modal.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
          if (!focusables.length) return;
          // Keep tabbing trapped inside the modal by looping focus manually.
          const first = focusables[0]; const last = focusables[focusables.length - 1];
          const active = (shadow!.activeElement as HTMLElement) || (document.activeElement as HTMLElement);
          const backwards = e.shiftKey;
          if (!backwards && active === last) { e.preventDefault(); first.focus(); }
          else if (backwards && active === first) { e.preventDefault(); last.focus(); }
        }
      }, { signal });

      // Dropdowns
      // Manage click toggles and add-new flows for tags/workspaces.
      tagTrigger?.addEventListener('click', (e) => { e.stopPropagation(); toggleTagDropdown(); }, { signal });
      workspaceTrigger?.addEventListener('click', (e) => { e.stopPropagation(); toggleWorkspaceDropdown(); }, { signal });
      addWorkspaceBtn?.addEventListener('click', () => {
        const value = (newWorkspaceInput?.value || '').trim(); if (!value) return;
        const items = Array.from(workspaceContent?.querySelectorAll('[data-ws]') || []);
        if (!items.some(el => (el as HTMLElement).dataset.ws?.toLowerCase() === value.toLowerCase())) {
          buildWorkspaceList([...(items.map(el => (el as HTMLElement).dataset.ws!)), value].filter(Boolean) as string[]);
        }
        setWorkspace(value); if (newWorkspaceInput) newWorkspaceInput.value = '';
      }, { signal });

      // Outside-click using composedPath relative to shadow host
      // Collapse menus and modals when the user clicks elsewhere.
      window.addEventListener('pointerdown', (ev) => {
        const path = ev.composedPath();
        const insideHost = !!(host && path.includes(host));
        if (!insideHost) {
          if (modal?.classList.contains('show')) closeModal();
          if (workspaceContent) { workspaceContent.style.display = 'none'; workspaceTrigger?.setAttribute('aria-expanded', 'false'); }
          if (tagContent) { tagContent.style.display = 'none'; tagTrigger?.setAttribute('aria-expanded', 'false'); }
        }
      }, { signal, capture: true });

      // Initial data
      // Pre-populate defaults and ensure the chip display stays in sync.
      updateUrlTitle();
      // Lazy load options on open
      updateTagLabel();
      renderTags();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createFloatingButton, { once: true });
    } else {
      createFloatingButton();
    }

    mo = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        teardown();
        setTimeout(createFloatingButton, 300);
      }
    });
    mo.observe(document, { subtree: true, childList: true });

    (globalThis as any).__DD_FLOAT_TEARDOWN__ = teardown;
  },
});

