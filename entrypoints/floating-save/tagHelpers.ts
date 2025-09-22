// An extension by Nikolai Eidheim, built with WXT + TypeScript.
// Helper utilities for tags inside the floating save quick modal.

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;

export const sanitizeTagLabel = (tag: string): string => {
  // Strips control characters and whitespace so tags stay user friendly.
  if (typeof tag !== 'string') {
    return '';
  }
  return tag.replace(CONTROL_CHARS, '').trim();
};

export interface CreateTagChipParams {
  document: Document;
  tag: string;
  onRemove: () => void;
  signal?: AbortSignal;
}

const REMOVE_ICON_PATH = 'M12.854 4.854a.5.5 0 0 0 0-.708l-.708-.708a.5.5 0 0 0-.708 0L8 6.793 4.646 3.438a.5.5 0 0 0-.708 0l-.708.708a.5.5 0 0 0 0 .708L6.586 8l-3.354 3.354a.5.5 0 0 0 0 .708l.708.708a.5.5 0 0 0 .708 0L8 9.414l3.354 3.354a.5.5 0 0 0 .708 0l.708-.708a.5.5 0 0 0 0-.708L9.414 8l3.354-3.146z';

export const createTagChip = ({ document, tag, onRemove, signal }: CreateTagChipParams): HTMLDivElement => {
  // Crafts a removable tag chip element within the shadow DOM modal.
  const safeTag = sanitizeTagLabel(tag);
  if (!safeTag) {
    throw new Error('Tag label cannot be empty after sanitization');
  }
  const container = document.createElement('div');
  container.className = 'dd-tag';

  const label = document.createElement('span');
  label.textContent = safeTag;
  container.appendChild(label);

  const removeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  removeIcon.setAttribute('class', 'dd-tag-remove');
  removeIcon.setAttribute('viewBox', '0 0 16 16');
  removeIcon.setAttribute('fill', 'currentColor');
  removeIcon.setAttribute('role', 'button');
  removeIcon.setAttribute('tabindex', '0');
  removeIcon.setAttribute('focusable', 'true');
  removeIcon.setAttribute('aria-label', `Remove tag ${safeTag}`);

  const removePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  removePath.setAttribute('d', REMOVE_ICON_PATH);
  removeIcon.appendChild(removePath);

  const handleRemove = () => { onRemove(); };

  removeIcon.addEventListener('click', handleRemove, { signal });
  removeIcon.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRemove();
    }
  }, { signal });

  container.appendChild(removeIcon);
  return container;
};
