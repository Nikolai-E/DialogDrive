This file has been deleted.
# DialogDrive Release Plan (v1.0.x)

This plan finalizes DialogDrive for Chrome Web Store submission. It focuses on accessibility (focus management and control labeling), cleanup of remaining global event listeners in the floating UI, and improving the Text Cleaner to better remove AI markers and visualize whitespace changes. It also consolidates general pre‑submission checks.

Status sources to cross‑reference: STORE_CHECKLIST.md, QA_TEST_PLAN.md, CLEANUP_VERIFICATION.md, CHANGELOG.md.


## 1) Accessibility: Focus Trap + Labels

Goal: Ensure dialogs trap focus and every interactive control has an accessible name (label, aria‑label, or aria‑labelledby).

- Scope
  - components/ui/dialog.tsx
  - Popup components using icon‑only buttons and inputs (Header, Settings, SearchControls, PromptForm, ChatForm, TextCleanerPanel, etc.)
  - components/ui/* primitives (Switch, Select, Popover/Command/Combobox, Tooltip)

- Tasks
  1. Dialog focus trap
     - Add Tab/Shift+Tab cycling within `[data-dd-dialog-content]`.
     - Restore focus to trigger on close (already partially present via previouslyFocused ref) and ensure close on Escape.
     - Link `role="dialog"` with `aria-labelledby` to `DialogTitle` and optional `aria-describedby`.
  2. Interactive control labeling
     - Add visible labels or `aria-label` for:
       - Icon‑only buttons (e.g., back, clear, close, settings, plus, etc.).
       - Search inputs that currently rely on placeholder text.
       - Select/Combobox triggers where there is no adjacent visible label.
     - Ensure `Label htmlFor` matches control `id`.
  3. State semantics and keyboard
     - Ensure toggles announce state with `aria-pressed` or switch role semantics (Radix Switch already OK; ensure `id` + external Label pairing in use sites).
     - Ensure `aria-expanded` is applied on triggers for menus/popovers along with `aria-controls` when content is mounted.

- Acceptance Criteria
  - While a dialog is open, Tab/Shift+Tab cycles within dialog content; focus never leaves the dialog.
  - Closing the dialog returns focus to the element that opened it.
  - Axe DevTools (or Lighthouse A11y) reports zero critical violations in popup and dialog flows.
  - All icon-only buttons have programmatic names; all inputs are labeled (screen reader reads a clear name).


## 2) Floating UI: Remove Global Event Listeners

Goal: Eliminate lingering global listeners in the content script floating UI and scope events to the Shadow DOM where possible. Ensure reliable cleanup to prevent memory leaks and double handlers after SPA navigations.

- Scope
  - entrypoints/floating-save.content.ts

- Issues Observed
  - Multiple `document.addEventListener` calls are registered (mousedown, keydown, DOMContentLoaded), with no corresponding `removeEventListener` or abort handling.

- Tasks
  1. Centralize listener management
     - Use a single `AbortController` (per modal instance) to register document/window listeners (`{ signal: controller.signal }`), aborting on teardown.
     - Prefer scoping to `shadowRoot` and the created container where feasible.
  2. Outside‑click handling in Shadow DOM
     - Use `event.composedPath()` for reliable outside‑click detection relative to the shadow host.
  3. Lifecycle cleanup
     - Provide a `teardown()` that removes the injected container and aborts all listeners.
     - Hook into WXT’s content‑script invalidation (if available) and/or observe page route changes to ensure cleanup on SPA navigations.
  4. Keyboard and focus
     - Confine Escape handling to the modal context; do not intercept page‑level keys if modal is closed.

- Acceptance Criteria
  - No global listeners remain active after closing the modal or navigating; re‑opening modal does not accumulate handlers.
  - Leak check: opening/closing the modal 10x does not increase event listener counts in DevTools (Event Listeners panel).
  - Outside‑click close works in both light DOM and Shadow DOM contexts.


## 3) Text Cleaner: Remove AI Markers, Improve “Smell,” and Visualize Whitespace

Goal: Improve AI‑marker removal, tighten discourse filler reduction, and make whitespace/invisible changes visible with clear, color‑coded diff tokens and code points.

- Scope
  - lib/textCleaner.ts
  - entrypoints/popup/components/TextCleanerPanel.tsx (DiffView and UI toggles)

- Tasks
  1. AI marker removal
     - Expand conservative patterns with additional common disclaimers (e.g., “as an AI developed by…”, “I cannot provide legal/medical advice…”, “I don’t have real‑time data…”, “here’s a step‑by‑step…”, “key takeaways”).
     - Broaden aggressive mode for templated sections and discourse lead‑ins (e.g., “Additionally,” “Furthermore,” “In conclusion,” at line starts).
     - Add `aiPhraseBlacklist` preference surface in UI (comma‑separated) to allow user‑defined phrases.
  2. “Smell” improvements (style smoothing)
     - Add optional rule that trims rote rhetorical padding at paragraph boundaries while preserving substance (gated under a new `style:smooth-discourse` option, opt‑in).
     - Ensure safety by disabling within code‑protected segments and by conservative thresholds.
  3. Visualize whitespace/invisibles in DiffView
     - Add “Show invisibles” toggle; render spaces as `·`, NBSP as `⍽`/`␠` with tooltip `U+00A0`, tab as `→`, newline as `⏎` (only in diff preview layer).
     - Highlight removed or mapped spaces in blue (e.g., NBSP→space, collapsed multiple spaces), with an inline token showing the code point, e.g., a small pill “U+00A0”.
     - Add a small legend above the diff pane explaining symbols and colors.
  4. Reporting
     - Surface per‑rule counts (from `report.ruleCounts`) in the UI as small chips (e.g., “Whitespace: 12”, “AI: 3”).

- Acceptance Criteria
  - Typical AI disclaimers are removed with conservative mode ON by default in Cleaner panel (current default is conservative:true; verify effect).
  - Toggling aggressive mode increases removal of templated sections without harming legitimate prose in test samples.
  - DiffView clearly shows whitespace transformations with blue highlights and code point pills; “Show invisibles” reveals spaces/tabs/newlines.
  - Rule count chips reflect operations performed; elapsed time remains responsive for ~5–10k char inputs.


## 4) A11y & QA Audit (Pre‑Submission)

- Run axe (or Lighthouse A11y) on popup, dialogs, and Cleaner panel; fix all critical issues.
- Keyboard audit
  - Tab order follows visual order; skip links not needed; focus outlines visible at 200% zoom.
  - All menus/popovers are dismissible with Escape and return focus to trigger.
- Color/contrast
  - Verify contrast ratios of text and interactive states against WCAG AA in light/dark.
- Follow QA_TEST_PLAN.md end‑to‑end; add scenarios for Cleaner panel and floating save modal interactions.

Acceptance: Zero critical a11y violations; QA P1–P13 pass plus added Cleaner/floating UI cases.


## 5) Chrome Web Store Readiness

Augment existing STORE_CHECKLIST.md with the following confirmations:

- Manifest & permissions
  - Re‑validate minimal permissions in `wxt.config.ts` (no <all_urls>).
  - Confirm host permissions restricted to ChatGPT domains only.
- CSP & assets
  - Confirm CSP does not require ‘unsafe‑eval’; inline styles limited to extension pages only (current config OK).
  - Verify icon set and provide at least 3 high‑quality screenshots (popup, side panel, floating modal capture).
- Shortcuts
  - Verify all default commands work after install (Windows + macOS).
- Privacy & support
  - Ensure production support contact is set (STORE_CHECKLIST.md notes placeholder replacement).
- Store listing copy
  - Finalize short/long descriptions, category, and privacy link.

Acceptance: STORE_CHECKLIST.md fully checked; assets zipped via `npm run zip` and uploaded; CHANGELOG updated with focus/a11y/cleanup changes.


## 6) Engineering Hygiene

- Error handling
  - Ensure robust try/catch in background message handlers (content.ts and adapters) with typed responses.
- Logging
  - Keep `logger` usage at info/warn; avoid noisy console in production.
- Performance sanity
  - Validate virtualization still active; check popup initial render subjective <200ms.
- Versioning
  - Bump version in `wxt.config.ts`; update CHANGELOG.md.


## 7) Implementation Notes (Pointers)

- Dialog focus trap
  - Add a keydown handler on the dialog content that cycles focus among focusable elements; hide inert background to screen readers via overlay + containment.
- Floating UI teardown
  - Use `AbortController` to register document/window listeners and call `abort()` on teardown. Prefer shadowRoot‑scoped listeners and composedPath() for outside‑click.
- DiffView whitespace visualization
  - Tokenize by characters with classification (space, tab, NBSP, newline). Build a minimal diff (e.g., Myers or LCS) and render deletions as inline blue tokens with code points.


## 8) Deliverables

- Focus-trapped dialog with labeled controls.
- Floating UI with leak-free listener management and teardown.
- Cleaner panel with improved AI removal and whitespace visualization, plus rule count chips and legend.
- Updated STORE_CHECKLIST.md boxes ticked; CHANGELOG.md entry for release.


## 9) Publisher Account Security

- **2FA / Security Keys**: Chrome Web Store owner account and collaborators must use security keys or, at minimum, TOTP-based two-factor authentication. Verify enrollment before each release cycle.
- **Access Review Cadence**: Review Chrome Web Store, Google Cloud, and GitHub collaborator lists quarterly. Remove dormant access and document the review date in the internal security log (stored in the private shared drive).
- **Release Approval**: Before uploading a package, confirm the release checklist (STORE_CHECKLIST + QA_TEST_PLAN) is signed off by an approver other than the packager. Record approver initials in the release journal (private).
- **Incident Response Ready**: Keep the security playbook (link in private drive) handy for account compromise procedures; ensure contact details remain current.


## 10) Out-of-Scope (Consider Post-1.0)

- i18n for UI labels.
- Import/export flows.
- Additional provider adapters.
- Automated e2e tests (Playwright) for popup focus management.


## 11) Verification Checklist

- [x] Dialog focus trap passes manual Tab/Shift+Tab tests.
- [x] All icon‑only buttons have aria‑labels; inputs are labeled.
- [x] Floating UI cleans up all global listeners on close/navigation.
- [x] Cleaner removes AI markers as expected; whitespace viz shows code points.
- [ ] Axe/Lighthouse: 0 critical violations; QA plan P1–P13 + added cases pass.
- [ ] STORE_CHECKLIST.md fully completed; package uploaded.
