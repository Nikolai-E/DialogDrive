# Changelog

All notable changes to this project will be documented in this file.

## [1.0.4] - 2025-09-23

### Changed

- Permissions: replaced broad `tabs` with `activeTab` to avoid “Read your browsing history” prompt; host permissions remain limited to ChatGPT domains.
- CSP: hardened extension pages policy (frame-ancestors 'none', object-src 'none', explicit base-uri, limited font/img sources).
- DOM safety: removed remaining innerHTML usage in dynamic paths (replaced with replaceChildren/DOM node swaps); kept only static SVG/HTML strings.

### Fixed

- Picker and floating save robustness: small stability and a11y cleanups while removing innerHTML toggles.
- Docs: updated technical notes to reflect no site localStorage fallback and extension-storage-only policy.

## [1.0.3] - 2025-09-23

### Fixed

- Privacy: removed site localStorage fallback in content script (content scripts no longer read page-local storage).
- Performance/Stability: added one-time init guard, cleanup hooks, and mutation observer throttling; scoped observation to stable container.
- Logging: replaced console logs with central logger; reduced noise on hot paths.

### Added

- Accessibility: dialog/listbox semantics, visible focus ring, and a basic focus trap in the in-page picker UI.
- Tests: unit tests for picker trigger detection and keybinding dispatch.

### Changed

- Types: shared picker trigger constants and tightened Settings preference typing.
- Repo hygiene: verified node_modules is ignored.

## [1.0.2] - 2025-08-25

### Added

- Text Cleaner: "Show invisibles" toggle with legend (· ⍽ → ⏎) in diff preview.
- Text Cleaner: AI phrase blacklist input (supports comma-separated strings and /regex/).
- Text Cleaner: Optional "Smooth" discourse style pass for rote lead-ins.
- Rule count chips surfaced in Cleaner panel.

### Improved

- Accessibility: aria-labels for icon-only buttons; search inputs labeled; proper aria-expanded/controls on menu triggers.
- Dialogs: role=dialog with aria-labelledby/aria-describedby; focus trap and Escape close; restores focus to trigger.
- Floating UI (content script): centralized listener management via AbortController, outside-click using composedPath, scoped to shadow DOM, focus trap in modal, teardown on SPA navigations.

### Changed

- Expanded AI-marker patterns (conservative and aggressive modes) for better disclaimer and template removal.

## [1.0.0] - 2025-08-08

### Added

- Initial public release candidate of DialogDrive.
- Prompt management: add, edit, delete, pin, usage tracking.
- Chat bookmark capture for ChatGPT (additional providers planned).
- Unified workspace & tagging system.
- Context menu actions (save selection, paste latest prompt, save chat, open DialogDrive).
- Keyboard shortcuts (paste prompt, save chat, open side panel, quick search).
- Side panel interface and popup UI with virtualized list.

### Security & Privacy

- 100% local storage usage (no external servers).
- Narrowed host permissions to only required AI domains.

### Housekeeping

- README converted to product documentation.
- Privacy policy aligned with actual permissions.
- Removed redundant background scripts.

[1.0.0]: https://github.com/Nikolai-E/DialogDrive/releases/tag/v1.0.0
[1.0.2]: https://github.com/Nikolai-E/DialogDrive/releases/tag/v1.0.2
[1.0.3]: https://github.com/Nikolai-E/DialogDrive/releases/tag/v1.0.3
[1.0.4]: https://github.com/Nikolai-E/DialogDrive/releases/tag/v1.0.4
