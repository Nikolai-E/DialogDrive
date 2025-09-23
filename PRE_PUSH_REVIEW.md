# Pre‑push Review — DialogDrive (v1.0.3)

Date: 2025-09-23

This review summarizes correctness, performance, privacy, MV3 compliance, UX/A11y, code hygiene, security, structure, regression checks, and a commit/PR plan for the current working changes. It is grounded in the current diffs, manifest, and codebase.

Repository: `DialogDrive`
Branch: `main`

Key recent changes considered:
- New in‑page prompt picker ("//" or "\\")
- Broadened ChatGPT input detection
- UI microcopy and size tweaks in popup
- Picker trigger preference in Settings

---

## 1) Correctness & safety

- [Severity: must‑fix] File: `entrypoints/content.ts:118-138` → Problem: localStorage fallback in content script for prompt list reads/writes site‑origin storage. This breaks extension data boundaries, risks leakage, and violates local‑first (extension storage only).
  - Exact fix (remove site storage fallback):
    ```diff
    --- a/entrypoints/content.ts
    +++ b/entrypoints/content.ts
    @@ function getPromptsSafe()
    -    } catch (e) {
    -      console.warn('DialogDrive: chrome.storage.local.get failed', e);
    -    }
    -    // Last-ditch: localStorage fallback to avoid breaking UI
    -    try {
    -      const raw = localStorage.getItem('dd_prompts');
    -      if (raw) return JSON.parse(raw);
    -    } catch {}
    -    return [];
    +    } catch (e) {
    +      logger.warn('DialogDrive: storage.get failed', e);
    +    }
    +    // No site-local fallback from content scripts; preserve privacy by returning empty.
    +    return [];
    ```

- [Severity: must‑fix] File: `entrypoints/content.ts` → Problem: Global `keydown`/`input` listeners and a broad `MutationObserver` lack a one‑time init guard and robust cleanup, risking duplicate handlers and memory leaks across SPA rerenders or reinjection.
  - Exact fix (add init guard, throttle MO, and cleanup):
    ```diff
    --- a/entrypoints/content.ts
    +++ b/entrypoints/content.ts
    @@ function setupPromptPicker()
    -  console.log('DialogDrive: setupPromptPicker called');
    +  if ((window as any).__ddPickerInit) return;
    +  (window as any).__ddPickerInit = true;
    +  logger.debug('DialogDrive: setupPromptPicker initialized');
      ...
    -  const mo = new MutationObserver(() => {
    +  let moScheduled = false;
    +  const mo = new MutationObserver(() => {
    +    if (moScheduled) return;
    +    moScheduled = true;
    +    queueMicrotask(() => {
    +      moScheduled = false;
           const found = findChatGPTInput();
           if (found && found !== input) {
             ...
           }
    +    });
      });
      ...
    +  const cleanup = () => {
    +    document.removeEventListener('keydown', onKeyDown, true);
    +    document.removeEventListener('input', onInput, true);
    +    try { input?.removeEventListener('keydown', onKeyDown, true); } catch {}
    +    try { input?.removeEventListener('input', onInput, true); } catch {}
    +    try { mo.disconnect(); } catch {}
    +  };
      try {
        mo.observe(document.documentElement, { childList: true, subtree: true });
        logger.info('DialogDrive: Mutation observer started');
      } catch {
        logger.warn('DialogDrive: Failed to start mutation observer');
      }
    +  window.addEventListener('pagehide', cleanup, { once: true });
    +  window.addEventListener('beforeunload', cleanup, { once: true });
    ```

- [Severity: should‑fix] File: `lib/platforms/chatgpt-adapter.ts` → Problem: For contenteditable editors (ProseMirror/Lexical), setting `textContent` + simple `input` event may not fully trigger the editor’s update path.
  - Exact fix (add composition/insert event as fallback):
    ```diff
    --- a/lib/platforms/chatgpt-adapter.ts
    +++ b/lib/platforms/chatgpt-adapter.ts
    @@ if (input.isContentEditable)
          input.textContent = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
    +     try {
    +       input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertFromPaste', data: text }));
    +     } catch {}
          // Place caret at end
          const range = document.createRange();
    ```

- [Severity: should‑fix] File: `entrypoints/content.ts` → Problem: `onInput` path does work on every keystroke.
  - Exact fix (early gate by last char):
    ```diff
    --- a/entrypoints/content.ts
    +++ b/entrypoints/content.ts
    @@ const onInput = async (e: Event) => {
    -  // Fallback detection via input content: open on trailing \\\\ or //
    +  // Only examine when a trigger char was just typed
       const target = e.target as HTMLElement;
       input = findChatGPTInput() || input;
       ...
    +  const lastChar = (target as any).value?.slice?.(-1) ?? (target.textContent || '').slice(-1);
    +  if (lastChar !== '/' && lastChar !== '\\\\') return;
    ```

- [Severity: should‑fix] Files: popup components/hooks → Problem: Confirm all added `addEventListener` have matching cleanups and use `{ passive: true }` for non‑keyboard events where possible.
  - Action: Audit and add cleanup/passive flags for resize/mousedown listeners in `Header.tsx`, etc.

---

## 2) Performance

- [Severity: must‑fix] File: `entrypoints/content.ts` → Problem: Very verbose `console.log` in hot paths (keydown/input/overlay nav). Use `logger.debug/info/warn` which are silent in prod.
  - Exact fix (representative):
    ```diff
    - console.log('DialogDrive: Content script started');
    + logger.info('DialogDrive: Content script started');
    - console.log('DialogDrive: Key pressed', { key, ... });
    + logger.debug('DialogDrive: Key pressed', { key, ... });
    - console.log('DialogDrive: Available inputs', { bigDump });
    + logger.debug('DialogDrive: Available inputs (counts only)', { textareas, contenteditables });
    ```

- [Severity: should‑fix] File: `entrypoints/content.ts` → Problem: MO watches entire document subtree aggressively. After finding the input, scope observation to a stable parent container if possible.
  - Action: Re‑observe on nearest stable container to reduce work.

- [Severity: nice‑to‑have] File: `entrypoints/content.ts` → Cache last successful selector in `findChatGPTInput()` for a fast path before scanning all selectors.

---

## 3) Privacy & permissions (must‑fix)

- [Severity: must‑fix] File: `entrypoints/content.ts` → Eliminate site‑origin `localStorage` fallback in content script (see 1). Keep extension data in `browser.storage` only.

- Manifest (`wxt.config.ts`) minimalism check:
  - permissions: `storage`, `tabs`, `clipboardWrite`, `contextMenus`, `notifications`, `sidePanel` → justified by code usage.
  - host_permissions: `https://chatgpt.com/*`, `https://chat.openai.com/*` → minimal and appropriate.
  - No third‑party analytics found; `lib/constants.ts` shows `ENABLE_ANALYTICS: false`.
  - Optional improvement: consider `optional_permissions` for `notifications`/`contextMenus` later.

- [Severity: must‑fix] Repo hygiene: `node_modules/.bin/browserslist` modified in diff. Ensure `node_modules` is not checked into VCS.
  - Action: Ensure `.gitignore` includes `node_modules/`. Remove from repo if tracked.

---

## 4) MV3 specifics

- Background SW: no long loops; uses onInstalled/handlers; safe.
- CSP: No `eval`; inline styles confined to extension pages; content scripts inject style nodes (allowed); avoid dynamic code.
- Messaging: Background validates messages (zod). Content script lacks schema validation; add (see Section 7).
- Access only declared matches; OK.

---

## 5) UX & accessibility

- [Severity: must‑fix] File: `entrypoints/content.ts` (overlay) → You suppress focus rings:
  ```css
  .ddp-overlay input:focus, .ddp-overlay input:focus-visible { outline: none !important; box-shadow: none !important; }
  ```
  Replace with visible focus indication:
  ```diff
  - .ddp-overlay input:focus, .ddp-overlay input:focus-visible { outline: none !important; box-shadow: none !important; }
  + .ddp-overlay input:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
  ```

- [Severity: should‑fix] Add dialog semantics and listbox/option roles:
  - Panel: `role="dialog"` + `aria-modal="true"` + `aria-labelledby="ddp-heading"`
  - Search input: `aria-label="Search prompts"`
  - List: `role="listbox"`, items: `role="option"` + `aria-selected="true|false"`, keyboard nav updates selection and announcement.
  - Basic focus trap: confine Tab to overlay while open.

- Copy consistency: Shortcuts unified to Ctrl/Cmd+S and Ctrl/Cmd+P (no F/N). Confirmed in Onboarding/Settings/hooks.

- Contrast: Warm palette—ensure text vs background meets WCAG AA. Adjust muted tones if needed.

---

## 6) Code hygiene

* Replace direct `console.*` with `logger.*` in content script; keep noise out of prod.
* Add runtime schema validation for content‑script messages (mirror background):
  ```ts
  import { z } from 'zod';
  const PasteMsg = z.object({ type: z.literal('PASTE_PROMPT'), text: z.string().max(50000) });
  const CaptureMsg = z.object({ type: z.literal('CAPTURE_CHAT') });
  const PingMsg = z.object({ type: z.literal('PING') });
  const ContentMsg = z.union([PasteMsg, CaptureMsg, PingMsg]);
  // inside onMessage:
  const parsed = ContentMsg.safeParse(message);
  if (!parsed.success) { sendResponse({ success: false, error: 'Bad message' }); return true; }
  const msg = parsed.data;
  ```

* Types: In `Settings.tsx`, prefer a typed preferences object instead of `any`:
  ```ts
  type Preferences = { pickerTrigger?: 'none'|'doubleSlash'|'backslash' };
  const prefs = (await secureStorage.getPreferences<Preferences>()) || {};
  ```

* Tests: You added `tests/unit/placeholders.test.js`. Add:
  - `tests/unit/pickerTrigger.test.js` — simple string‑based detection for `//` and `\\` logic.
  - `tests/unit/keybindings.test.js` — pure function that maps a KeyboardEvent‑like object to actions.

---

## 7) Security

- [must‑fix] Remove site `localStorage` fallback (Section 1).
- Keep using `textContent`/`value` for paste (no `innerHTML`), which is safe against injection.
- Validate content‑script message schemas (see Section 6) to avoid malformed messages.
- In floating save: tag labels are sanitized (`sanitizeTagLabel`); maintain rule “never put user strings into `innerHTML`”. The template literals used are static.

---

## 8) Structure & refactor

- Extract overlay/picker DOM building into `entrypoints/content-picker-ui.ts` to shorten `content.ts`.
- Share input detection utilities via `lib/platforms/input-detect.ts` so `content.ts` and `chatgpt-adapter.ts` don’t drift.
- Add a debug preference flag in `secureStorageV2` to toggle verbose logs at runtime.

Small refactor examples:
```ts
// lib/constants.ts
export const PICKER_TRIGGERS = ['none','doubleSlash','backslash'] as const;
export type PickerTrigger = typeof PICKER_TRIGGERS[number];
```

```diff
// Settings.tsx
- const [pickerTrigger, setPickerTrigger] = React.useState<'none' | 'doubleSlash' | 'backslash'>('doubleSlash');
+ import type { PickerTrigger } from '../../../lib/constants';
+ const [pickerTrigger, setPickerTrigger] = React.useState<PickerTrigger>('doubleSlash');
```

---

## 9) Regression checks (manual)

- ChatGPT editor:
  - Type `//` → picker opens; previous `/` removed; ESC closes; arrows move selection; Enter inserts; placeholder dialog appears when needed; Enter submits; caret ends at text end.
  - Change setting to backslash; type `\\` → opens; no double open; normal typing unaffected otherwise.
  - Ensure site shortcuts unaffected when picker is closed.
- Popup/Shortcuts:
  - Ctrl/Cmd+S focuses search; Ctrl/Cmd+P opens New Prompt; only intercept when popup has focus.
  - Settings: change picker trigger; reload ChatGPT; verify behavior.
  - Clear Local Data: DELETE confirmation; verify storage wiped.
- Background:
  - Context menu & commands present; side panel opens; notifications appear when expected.
- Accessibility:
  - Tab cycles within overlay; focus rings visible; dialog headings announced; listbox/option semantics read by screen readers.
- Performance:
  - No observable lag in typing; observer doesn’t churn; logs quiet in production.

---

## 10) Commit/PR plan

Recommended Conventional Commits:

1. fix(privacy): remove site localStorage fallback in content script
2. fix(perf): add one‑time init guard + MO throttling + cleanup in picker
3. refactor(logging): replace console logs with logger and reduce hot‑path logs
4. feat(a11y): add dialog/listbox semantics, visible focus ring, basic focus trap
5. chore(permissions): confirm minimal manifest; document rationale
6. refactor(types): tighten prefs types; share constants
7. test: add picker trigger and keybinding unit tests
8. chore(repo): ensure node_modules ignored and not tracked

Follow‑ups (separate PRs): input‑detect module, Export data action in Settings, optional permissions split.

---

## GO/NO‑GO

- GO once the localStorage fallback is removed and picker listeners/observer/logging/a11y are corrected.
- NO‑GO if localStorage fallback remains or overlay still suppresses visible focus without proper dialog semantics.

---

## Pre‑push checklist

- [x] Remove site `localStorage` fallback in `entrypoints/content.ts` (privacy)
- [x] Add init guard, cleanup, and MO throttling in `setupPromptPicker()` (stability/perf)
- [x] Replace `console.*` with `logger.*` in content script; tune down noisy logs
- [x] Add dialog/listbox roles and visible focus ring; basic focus trap
- [x] Ensure all listeners have cleanups; use passive where sensible
- [x] Keep manifest minimal (no wildcard hosts; only required permissions)
- [ ] Verify build + typecheck + smoke test on ChatGPT trigger/overlay/paste
- [x] Make sure `node_modules/` is ignored and not tracked
- [x] Add unit tests for picker triggers and keybinding dispatch
- [x] Update CHANGELOG for v1.0.3
