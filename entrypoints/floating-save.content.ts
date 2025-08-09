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
                <select class="dd-form-select" id="dd-workspace">
                  <option value="General">General</option>
                </select>
                <div style="display:flex; gap:6px; margin-top:6px;">
                  <input type="text" id="dd-new-workspace" class="dd-form-input" placeholder="New workspace" style="flex:1;" />
                  <button type="button" id="dd-add-workspace" class="dd-btn dd-btn-secondary" style="padding:0 10px;">Add</button>
                </div>
              </div>
              
              <!-- Description removed (optional) -->
              
              <div class="dd-form-group">
                <label class="dd-form-label">Tags</label>
                <div class="dd-tag-input-container">
                  <input type="text" class="dd-form-input" id="dd-tag-input" placeholder="Add a tag...">
                  <button type="button" class="dd-btn dd-btn-secondary" id="dd-add-tag">Add</button>
                </div>
                <div id="dd-existing-tags" style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;"></div>
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
  const workspaceSelect = document.getElementById('dd-workspace') as HTMLSelectElement;
  const newWorkspaceInput = document.getElementById('dd-new-workspace') as HTMLInputElement;
  const addWorkspaceBtn = document.getElementById('dd-add-workspace') as HTMLButtonElement;
      // Add workspace handler
      addWorkspaceBtn.addEventListener('click', () => {
        const value = newWorkspaceInput.value.trim();
        if (!value) return;
        // Avoid duplicates
        if (![...workspaceSelect.options].some(o => o.value.toLowerCase() === value.toLowerCase())) {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = value;
          workspaceSelect.appendChild(opt);
        }
        workspaceSelect.value = value;
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
            workspaceSelect.innerHTML = '';
            response.workspaces.forEach((workspace: string) => {
              const option = document.createElement('option');
              option.value = workspace;
              option.textContent = workspace;
              workspaceSelect.appendChild(option);
            });
          }
          if (response.tags) {
            const existingTagsContainer = document.getElementById('dd-existing-tags');
            if (existingTagsContainer) {
              existingTagsContainer.innerHTML = '';
              response.tags.forEach((tag: string) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = tag;
                btn.style.cssText = 'background:#e7e5e4;border:1px solid #d6d3d1;border-radius:4px;padding:2px 6px;font-size:11px;cursor:pointer;';
                btn.addEventListener('click', () => {
                  if (!tags.includes(tag)) { tags.push(tag); renderTags(); }
                });
                // Alt-click to delete tag globally
                btn.addEventListener('auxclick', (e) => { e.preventDefault(); });
                btn.addEventListener('contextmenu', (e) => { e.preventDefault(); });
                btn.addEventListener('mousedown', async (e) => {
                  if (e.altKey) {
                    const confirmDelete = confirm(`Delete tag "${tag}" from all items?`);
                    if (confirmDelete) {
                      try {
                        const resp = await browser.runtime.sendMessage({ type: 'DELETE_TAG', tag });
                        if (resp?.success) {
                          // Refresh tags
                          await loadWorkspacesAndTags();
                        } else {
                          alert('Failed to delete tag');
                        }
                      } catch {
                        alert('Failed to delete tag');
                      }
                    }
                  }
                });
                existingTagsContainer.appendChild(btn);
              });
            }
          }
        } catch (error) {
          logger.error('Failed to load workspaces and tags:', error);
        }
      };

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
          tagInput.value = '';
        }
      };

      // Remove tag functionality
      const removeTag = (tagToRemove: string) => {
        tags = tags.filter(tag => tag !== tagToRemove);
        renderTags();
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
            workspace: workspaceSelect.value,
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
        workspaceSelect.value = 'General';
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
