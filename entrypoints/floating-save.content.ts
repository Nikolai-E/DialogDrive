// entrypoints/floating-save.content.ts
import { logger } from '../lib/logger';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*',
    '*://deepseek.com/*',
    '*://*.deepseek.com/*',
    '*://perplexity.ai/*',
    '*://poe.com/*'
  ],
  main() {
    logger.info('DialogDrive floating save button initialized');
    
    // Create and inject floating button
    const createFloatingButton = () => {
      // Check if button already exists
      if (document.getElementById('dialogdrive-floating-save')) {
        return;
      }

      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.id = 'dialogdrive-floating-save';
      buttonContainer.innerHTML = `
        <style>
          #dialogdrive-floating-save {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .dd-float-button { width:48px; height:48px; border-radius:12px; background:#e7e5e4; border:1px solid #d6d3d1; box-shadow:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; position:relative; }
          .dd-float-button:hover { background:#dad7d5; }
          .dd-float-button:active { background:#cecac7; }
          
          .dd-float-button svg { width:22px; height:22px; fill:#292524; }
          
          .dd-tooltip { position:absolute; bottom:100%; right:0; margin-bottom:6px; padding:6px 8px; background:#292524; color:#f5f5f4; font-size:11px; border-radius:4px; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity .15s; }
          
          .dd-float-button:hover .dd-tooltip {
            opacity: 1;
          }
          
          .dd-quick-save-modal { position:fixed; bottom:72px; right:24px; width:340px; max-height:480px; background:#f5f5f4; border:1px solid #d6d3d1; border-radius:10px; box-shadow:none; z-index:999998; display:none; flex-direction:column; }
          
          .dd-quick-save-modal.show {
            display: flex;
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .dd-modal-header { padding:12px 16px; border-bottom:1px solid #d6d3d1; display:flex; align-items:center; justify-content:space-between; }
          
          .dd-modal-title { font-size:14px; font-weight:600; color:#111827; margin:0; }
          
          .dd-modal-close { width:22px; height:22px; border:none; background:transparent; cursor:pointer; color:#57534e; display:flex; align-items:center; justify-content:center; border-radius:4px; }
          .dd-modal-close:hover { background:#e7e5e4; }
          
          .dd-modal-body { padding:14px 16px; overflow-y:auto; flex:1; }
          
          .dd-form-group {
            margin-bottom: 16px;
          }
          
          .dd-form-label { display:block; font-size:12px; font-weight:500; color:#44403c; margin-bottom:4px; }
          
          .dd-form-input,
          .dd-form-textarea,
          .dd-form-select { width:100%; padding:6px 10px; border:1px solid #d6d3d1; border-radius:6px; font-size:13px; background:#fff; color:#111827; box-sizing:border-box; }
          
          .dd-form-input:focus,
          .dd-form-textarea:focus,
          .dd-form-select:focus { outline:none; border-color:#a8a29e; box-shadow:none; }
          
          .dd-form-textarea {
            resize: vertical;
            min-height: 60px;
          }
          
          .dd-tag-input-container {
            display: flex;
            gap: 8px;
          }
          
          .dd-tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
          }
          
          .dd-tag { display:inline-flex; align-items:center; gap:4px; padding:3px 7px; background:#e7e5e4; color:#292524; font-size:11px; border-radius:4px; }
          
          .dd-tag-remove {
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
            width: 14px;
            height: 14px;
          }
          
          .dd-tag-remove:hover {
            opacity: 1;
          }
          
          .dd-form-actions { padding:12px 16px; border-top:1px solid #d6d3d1; display:flex; justify-content:flex-end; gap:8px; }
          /* Custom select for workspace with inline delete */
          .dd-select { position: relative; }
          .dd-select-trigger { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 10px; border:1px solid #d6d3d1; border-radius:6px; background:#fff; color:#111827; font-size:13px; cursor:pointer; }
          .dd-select-trigger:hover { background:#f9fafb; }
          .dd-select-content { position:absolute; top:calc(100% + 4px); left:0; right:0; max-height:220px; overflow:auto; background:#fff; border:1px solid #d6d3d1; border-radius:8px; padding:6px; box-shadow:none; z-index:1000000; }
          .dd-select-item { display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:6px; cursor:pointer; }
          .dd-select-item:hover { background:#f4f4f5; }
          .dd-select-check { width:14px; height:14px; color:#16a34a; opacity:0.9; }
          .dd-select-spacer { width:14px; height:14px; }
          .dd-select-del { margin-left:auto; border:none; background:transparent; color:#dc2626; cursor:pointer; padding:2px; border-radius:4px; }
          .dd-select-del:hover { background:#fee2e2; }
          /* Tag select uses same styles */
          /* Deprecated workspace browse dropdown (replaced by dd-select) */

          
          .dd-btn { padding:6px 14px; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; transition:background .15s; border:1px solid #d6d3d1; background:#e7e5e4; color:#292524; }
          
          .dd-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          .dd-btn-primary { background:#292524; color:#f5f5f4; border-color:#292524; }
          .dd-btn-primary:hover:not(:disabled) { background:#3f3a36; }
          .dd-btn-secondary { background:#e7e5e4; color:#292524; }
          .dd-btn-secondary:hover { background:#dad7d5; }
          
          .dd-pin-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          
          .dd-switch { position:relative; width:40px; height:22px; background:#d6d3d1; border-radius:11px; cursor:pointer; transition:background .2s; }
          
          .dd-switch.active { background:#292524; }
          
          .dd-switch-thumb { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:transform .2s; box-shadow:none; }
          
          .dd-switch.active .dd-switch-thumb {
            transform: translateX(20px);
          }

          /* Tag browse items with inline delete */
          .dd-tag-browse-item { display:flex; align-items:center; gap:6px; padding:4px 6px; border:1px solid #e7e5e4; background:#fff; border-radius:6px; font-size:11px; }
          .dd-tag-browse-item button { border:none; background:transparent; color:#dc2626; cursor:pointer; padding:2px; border-radius:4px; }
          .dd-tag-browse-item button:hover { background:#fee2e2; }

          @media (max-width: 640px) {
            .dd-quick-save-modal {
              right: 16px;
              left: 16px;
              width: auto;
            }
            
            #dialogdrive-floating-save {
              bottom: 16px;
              right: 16px;
            }
          }
        </style>
        
        <button class="dd-float-button" id="dd-save-btn">
          <span class="dd-tooltip">Save to DialogDrive</span>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
        
        <div class="dd-quick-save-modal" id="dd-save-modal">
          <div class="dd-modal-header">
            <h3 class="dd-modal-title">Save to DialogDrive</h3>
            <button class="dd-modal-close" id="dd-close-modal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.854 4.854a.5.5 0 0 0 0-.708l-.708-.708a.5.5 0 0 0-.708 0L8 6.793 4.646 3.438a.5.5 0 0 0-.708 0l-.708.708a.5.5 0 0 0 0 .708L6.586 8l-3.354 3.354a.5.5 0 0 0 0 .708l.708.708a.5.5 0 0 0 .708 0L8 9.414l3.354 3.354a.5.5 0 0 0 .708 0l.708-.708a.5.5 0 0 0 0-.708L9.414 8l3.354-3.146z"/>
              </svg>
            </button>
          </div>
          
          <div class="dd-modal-body">
            <form id="dd-save-form">
              <div class="dd-form-group">
                <label class="dd-form-label">Title *</label>
                <input type="text" class="dd-form-input" id="dd-title" placeholder="Enter a descriptive title..." required>
              </div>
              
              <div class="dd-form-group">
                <label class="dd-form-label">URL *</label>
                <input type="url" class="dd-form-input" id="dd-url" placeholder="https://example.com/..." required readonly>
              </div>
              
              <div class="dd-form-group">
                <label class="dd-form-label">Workspace</label>
                <div id="dd-workspace-select" class="dd-select">
                  <button type="button" class="dd-select-trigger" id="dd-workspace-trigger">
                    <span id="dd-workspace-label">General</span>
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clip-rule="evenodd"/></svg>
                  </button>
                  <div class="dd-select-content" id="dd-workspace-content" style="display:none;"></div>
                </div>
                <div style="display:flex; gap:6px; margin-top:6px;">
                  <input type="text" id="dd-new-workspace" class="dd-form-input" placeholder="New workspace" style="flex:1;" />
                  <button type="button" id="dd-add-workspace" class="dd-btn dd-btn-secondary" style="padding:0 10px;">Add</button>
                </div>
              </div>
              
              <!-- Description removed (optional) -->
              
              <div class="dd-form-group">
                <label class="dd-form-label">Tags</label>
                <div id="dd-tag-select" class="dd-select">
                  <button type="button" class="dd-select-trigger" id="dd-tag-trigger">
                    <span id="dd-tag-label">Select tags</span>
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" clip-rule="evenodd"/></svg>
                  </button>
                  <div class="dd-select-content" id="dd-tag-content" style="display:none;"></div>
                </div>
                <div class="dd-tag-input-container" style="margin-top:6px;">
                  <input type="text" class="dd-form-input" id="dd-tag-input" placeholder="Add a tag...">
                  <button type="button" class="dd-btn dd-btn-secondary" id="dd-add-tag">Add</button>
                </div>
                <div class="dd-tag-list" id="dd-tags"></div>
              </div>
              
              <div class="dd-form-group">
                <div class="dd-pin-toggle">
                  <label class="dd-form-label" style="margin: 0;">Pin this bookmark</label>
                  <div class="dd-switch" id="dd-pin-switch">
                    <div class="dd-switch-thumb"></div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          
          <div class="dd-form-actions">
            <button class="dd-btn dd-btn-secondary" id="dd-cancel">Cancel</button>
            <button class="dd-btn dd-btn-primary" id="dd-save">Save Bookmark</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(buttonContainer);
      
      // Initialize the form
      initializeQuickSaveForm();
    };

    const initializeQuickSaveForm = () => {
      const saveBtn = document.getElementById('dd-save-btn');
      const modal = document.getElementById('dd-save-modal');
      const closeBtn = document.getElementById('dd-close-modal');
      const cancelBtn = document.getElementById('dd-cancel');
      const saveBookmarkBtn = document.getElementById('dd-save');
      const pinSwitch = document.getElementById('dd-pin-switch');
  const tagInput = document.getElementById('dd-tag-input') as HTMLInputElement;
      const addTagBtn = document.getElementById('dd-add-tag');
      const tagsContainer = document.getElementById('dd-tags');
      const titleInput = document.getElementById('dd-title') as HTMLInputElement;
      const urlInput = document.getElementById('dd-url') as HTMLInputElement;
  // Custom workspace select elements
  const workspaceTrigger = document.getElementById('dd-workspace-trigger') as HTMLButtonElement;
  const workspaceContent = document.getElementById('dd-workspace-content') as HTMLDivElement;
  const workspaceLabel = document.getElementById('dd-workspace-label') as HTMLSpanElement;
  const newWorkspaceInput = document.getElementById('dd-new-workspace') as HTMLInputElement;
  const addWorkspaceBtn = document.getElementById('dd-add-workspace') as HTMLButtonElement;
  // Current selected workspace value
  let currentWorkspace = 'General';
      // Add workspace handler
      addWorkspaceBtn.addEventListener('click', () => {
        const value = newWorkspaceInput.value.trim();
        if (!value) return;
        // Avoid duplicates
        const items = Array.from(workspaceContent?.querySelectorAll('[data-ws]') || []);
        if (!items.some(el => (el as HTMLElement).dataset.ws?.toLowerCase() === value.toLowerCase())) {
          // Optimistically add to list
          buildWorkspaceList([...(items.map(el => (el as HTMLElement).dataset.ws!) ), value].filter(Boolean) as string[]);
        }
        setWorkspace(value);
        newWorkspaceInput.value = '';
      });
  // Description removed
      
      let tags: string[] = [];
      let isPinned = false;

      // Load workspaces and tags from storage
  const loadWorkspacesAndTags = async () => {
        try {
          const response = await browser.runtime.sendMessage({
            type: 'GET_WORKSPACES_AND_TAGS'
          });
          
          if (response.workspaces) {
            buildWorkspaceList(response.workspaces);
          }
          if (response.tags) {
            buildTagList(response.tags);
          }
        } catch (error) {
          logger.error('Failed to load workspaces and tags:', error);
        }
      };

      // Tag select elements/state
      const tagTrigger = document.getElementById('dd-tag-trigger') as HTMLButtonElement;
      const tagContent = document.getElementById('dd-tag-content') as HTMLDivElement;
      const tagLabel = document.getElementById('dd-tag-label') as HTMLSpanElement;

      const toggleTagDropdown = (open?: boolean) => {
        if (!tagContent) return;
        const willOpen = open ?? tagContent.style.display === 'none';
        tagContent.style.display = willOpen ? 'block' : 'none';
      };

      const updateTagLabel = () => {
        if (!tagLabel) return;
        tagLabel.textContent = tags.length === 0 ? 'Select tags' : `${tags.length} selected`;
      };

      const buildTagList = (all: string[]) => {
        if (!tagContent) return;
        tagContent.innerHTML = '';
        all.forEach((t) => {
          const row = document.createElement('div');
          row.className = 'dd-select-item';
          row.dataset.tag = t;

          const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          check.setAttribute('viewBox', '0 0 16 16');
          check.setAttribute('fill', 'currentColor');
          check.setAttribute('class', 'dd-select-check');
          check.innerHTML = '<path d="M13.485 1.929a1.5 1.5 0 0 1 0 2.121L6.75 10.786l-3.536-3.536a1.5 1.5 0 1 1 2.121-2.121l1.415 1.415 5.657-5.657a1.5 1.5 0 0 1 2.121 0z" />';
          const spacer = document.createElement('div');
          spacer.setAttribute('class', 'dd-select-spacer');
          row.appendChild(tags.includes(t) ? check : spacer);

          const labelBtn = document.createElement('button');
          labelBtn.type = 'button';
          labelBtn.textContent = t;
          labelBtn.style.cssText = 'flex:1; text-align:left; padding:2px 0; color:#292524; background:transparent; border:none;';
          labelBtn.addEventListener('click', () => {
            if (tags.includes(t)) {
              tags = tags.filter(x => x !== t);
            } else {
              tags = [...tags, t];
            }
            renderTags();
            updateTagLabel();
            // update checkmark
            const first = row.firstChild as HTMLElement | null;
            if (first) {
              row.removeChild(first);
              if (tags.includes(t)) row.insertBefore(check, row.firstChild); else row.insertBefore(spacer, row.firstChild);
            }
          });
          row.appendChild(labelBtn);

          const del = document.createElement('button');
          del.setAttribute('aria-label', `Delete tag ${t}`);
          del.className = 'dd-select-del';
          del.innerHTML = '&times;';
          del.addEventListener('click', async (e) => {
            e.stopPropagation();
            const ok = confirm(`Delete tag "${t}" from all items?`);
            if (!ok) return;
            try {
              const resp = await browser.runtime.sendMessage({ type: 'DELETE_TAG', tag: t });
              if (resp?.success) {
                tags = tags.filter(x => x !== t);
                renderTags();
                updateTagLabel();
                await loadWorkspacesAndTags();
              } else {
                alert('Failed to delete tag');
              }
            } catch {
              alert('Failed to delete tag');
            }
          });
          row.appendChild(del);

          tagContent.appendChild(row);
        });
      };

      tagTrigger?.addEventListener('click', (e) => { e.stopPropagation(); toggleTagDropdown(); });
      document.addEventListener('mousedown', (ev) => {
        if (!tagContent?.contains(ev.target as Node) && (ev.target as HTMLElement)?.id !== 'dd-tag-trigger') {
          toggleTagDropdown(false);
        }
      });
      updateTagLabel();

      // Build custom workspace list with inline delete inside the select dropdown
      const buildWorkspaceList = (workspaces: string[]) => {
        if (!workspaceContent) return;
        workspaceContent.innerHTML = '';
        workspaces.forEach((ws) => {
          const row = document.createElement('div');
          row.className = 'dd-select-item';
          row.dataset.ws = ws;

          // checkmark or spacer
          const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          check.setAttribute('viewBox', '0 0 16 16');
          check.setAttribute('fill', 'currentColor');
          check.setAttribute('class', 'dd-select-check');
          check.innerHTML = '<path d="M13.485 1.929a1.5 1.5 0 0 1 0 2.121L6.75 10.786l-3.536-3.536a1.5 1.5 0 1 1 2.121-2.121l1.415 1.415 5.657-5.657a1.5 1.5 0 0 1 2.121 0z" />';
          const spacer = document.createElement('div');
          spacer.setAttribute('class', 'dd-select-spacer');
          row.appendChild(ws === currentWorkspace ? check : spacer);

          const labelBtn = document.createElement('button');
          labelBtn.type = 'button';
          labelBtn.textContent = ws;
          labelBtn.style.cssText = 'flex:1; text-align:left; padding:2px 0; color:#292524; background:transparent; border:none;';
          labelBtn.addEventListener('click', () => {
            setWorkspace(ws);
            toggleWorkspaceDropdown(false);
          });
          row.appendChild(labelBtn);

          if (ws !== 'General') {
            const del = document.createElement('button');
            del.setAttribute('aria-label', `Delete workspace ${ws}`);
            del.className = 'dd-select-del';
            del.innerHTML = '&times;';
            del.addEventListener('click', async (e) => {
              e.stopPropagation();
              const ok = confirm(`Delete workspace "${ws}" and move its items to General?`);
              if (!ok) return;
              try {
                const resp = await browser.runtime.sendMessage({ type: 'DELETE_WORKSPACE', name: ws });
                if (resp?.success) {
                  if (currentWorkspace === ws) setWorkspace('General');
                  await loadWorkspacesAndTags();
                } else {
                  alert('Failed to delete workspace');
                }
              } catch {
                alert('Failed to delete workspace');
              }
            });
            row.appendChild(del);
          }
          workspaceContent.appendChild(row);
        });
      };

      const toggleWorkspaceDropdown = (open?: boolean) => {
        if (!workspaceContent) return;
        const willOpen = open ?? workspaceContent.style.display === 'none';
        workspaceContent.style.display = willOpen ? 'block' : 'none';
      };

      const setWorkspace = (ws: string) => {
        currentWorkspace = ws;
        if (workspaceLabel) workspaceLabel.textContent = ws;
        // update checkmarks
        const items = workspaceContent?.querySelectorAll('.dd-select-item');
        items?.forEach((item) => {
          const el = item as HTMLElement;
          const isSel = el.dataset.ws === ws;
          const firstChild = el.firstChild as HTMLElement | null;
          if (firstChild) {
            el.removeChild(firstChild);
            if (isSel) {
              const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              check.setAttribute('viewBox', '0 0 16 16');
              check.setAttribute('fill', 'currentColor');
              check.setAttribute('class', 'dd-select-check');
              check.innerHTML = '<path d="M13.485 1.929a1.5 1.5 0 0 1 0 2.121L6.75 10.786l-3.536-3.536a1.5 1.5 0 1 1 2.121-2.121l1.415 1.415 5.657-5.657a1.5 1.5 0 0 1 2.121 0z" />';
              el.insertBefore(check, el.firstChild);
            } else {
              const spacer = document.createElement('div');
              spacer.setAttribute('class', 'dd-select-spacer');
              el.insertBefore(spacer, el.firstChild);
            }
          }
        });
      };

      // Trigger and outside click handling
      workspaceTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWorkspaceDropdown();
      });
      document.addEventListener('mousedown', (ev) => {
        if (!workspaceContent?.contains(ev.target as Node) && (ev.target as HTMLElement)?.id !== 'dd-workspace-trigger') {
          toggleWorkspaceDropdown(false);
        }
      });

      // Detect platform from URL
      const detectPlatform = (url: string): string => {
        if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
        if (url.includes('gemini.google.com')) return 'gemini';
        if (url.includes('claude.ai')) return 'claude';
        if (url.includes('perplexity.ai')) return 'perplexity';
        if (url.includes('bard.google.com')) return 'bard';
        if (url.includes('poe.com')) return 'poe';
        return 'web';
      };

      // Initialize form with current page data
      const initializeFormData = () => {
        const currentUrl = window.location.href;
        const currentTitle = document.title;
        
        urlInput.value = currentUrl;
        titleInput.value = currentTitle;
        
        // Try to get page meta description
  // description auto-fill removed
      };

      // Add tag functionality
    const addTag = () => {
        const tagValue = tagInput.value.trim().toLowerCase();
        if (tagValue && !tags.includes(tagValue)) {
          tags.push(tagValue);
          renderTags();
      // update dropdown label
      const lbl = document.getElementById('dd-tag-label') as HTMLSpanElement | null;
      if (lbl) lbl.textContent = tags.length === 0 ? 'Select tags' : `${tags.length} selected`;
          tagInput.value = '';
        }
      };

      // Remove tag functionality
      const removeTag = (tagToRemove: string) => {
        tags = tags.filter(tag => tag !== tagToRemove);
        renderTags();
        const lbl = document.getElementById('dd-tag-label') as HTMLSpanElement | null;
        if (lbl) lbl.textContent = tags.length === 0 ? 'Select tags' : `${tags.length} selected`;
      };

      // Render tags
      const renderTags = () => {
        if (!tagsContainer) return;
        
        tagsContainer.innerHTML = '';
        tags.forEach(tag => {
          const tagElement = document.createElement('div');
          tagElement.className = 'dd-tag';
          tagElement.innerHTML = `
            ${tag}
            <svg class="dd-tag-remove" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.854 4.854a.5.5 0 0 0 0-.708l-.708-.708a.5.5 0 0 0-.708 0L8 6.793 4.646 3.438a.5.5 0 0 0-.708 0l-.708.708a.5.5 0 0 0 0 .708L6.586 8l-3.354 3.354a.5.5 0 0 0 0 .708l.708.708a.5.5 0 0 0 .708 0L8 9.414l3.354 3.354a.5.5 0 0 0 .708 0l.708-.708a.5.5 0 0 0 0-.708L9.414 8l3.354-3.146z"/>
            </svg>
          `;
          
          const removeBtn = tagElement.querySelector('.dd-tag-remove');
          removeBtn?.addEventListener('click', () => removeTag(tag));
          
          tagsContainer.appendChild(tagElement);
        });
      };

      // Save bookmark
      const saveBookmark = async () => {
        if (!titleInput.value.trim() || !urlInput.value.trim()) {
          alert('Please enter both title and URL');
          return;
        }

    try {
          const bookmarkData = {
            title: titleInput.value.trim(),
            url: urlInput.value.trim(),
            platform: detectPlatform(urlInput.value),
      workspace: currentWorkspace,
            description: undefined,
            tags: tags,
            isPinned: isPinned
          };

          const response = await browser.runtime.sendMessage({
            type: 'SAVE_BOOKMARK',
            data: bookmarkData
          });

          if (response.success) {
            showSuccess('Bookmark saved successfully!');
            closeModal();
            resetForm();
          } else {
            throw new Error(response.error || 'Failed to save bookmark');
          }
        } catch (error) {
          logger.error('Failed to save bookmark:', error);
          alert('Failed to save bookmark. Please try again.');
        }
      };

      // Show success notification
      const showSuccess = (message: string) => {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 9999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
          style.remove();
        }, 3000);
      };

      // Close modal
      const closeModal = () => {
        modal?.classList.remove('show');
      };

      // Reset form
      const resetForm = () => {
  titleInput.value = '';
  urlInput.value = '';
  setWorkspace('General');
  // description reset removed
        tagInput.value = '';
        tags = [];
        isPinned = false;
        renderTags();
        pinSwitch?.classList.remove('active');
      };

      // Event listeners
      saveBtn?.addEventListener('click', () => {
        modal?.classList.add('show');
        initializeFormData();
        loadWorkspacesAndTags();
      });

      closeBtn?.addEventListener('click', closeModal);
      cancelBtn?.addEventListener('click', closeModal);
      
      saveBookmarkBtn?.addEventListener('click', saveBookmark);
      
      addTagBtn?.addEventListener('click', addTag);
      
      tagInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTag();
        }
      });

      pinSwitch?.addEventListener('click', () => {
        isPinned = !isPinned;
        pinSwitch.classList.toggle('active', isPinned);
      });

      // Close modal on outside click
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      // Close modal on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('show')) {
          closeModal();
        }
      });
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createFloatingButton);
    } else {
      createFloatingButton();
    }

    // Re-initialize if page content changes (for SPAs)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(createFloatingButton, 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  },
});
