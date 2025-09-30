This file has been deleted.
# Store Listing Draft

## Proposed Name
DialogDrive - AI Prompt & Chat Workspace

## Short Description (<=132 chars)
Capture, organize, search, and paste AI prompts & chat bookmarks for ChatGPT. 100% local. No tracking.

## Long Description
DialogDrive is a focused productivity extension that centralizes your AI prompt workflow and chat session bookmarks for ChatGPT. Stop hunting through scattered notes-capture, organize, and reuse everything instantly.

### Key Features
- Unified library for prompts & chat bookmarks
- Workspaces, tags, pinning, and fast search
- Keyboard shortcuts for paste & capture
- Context menu: save selection, paste latest prompt
- Side panel + popup views with dense, fast UI
- Usage tracking (local only) to surface your most valuable prompts
- Privacy-first design: no external servers, no analytics

### How It Works
1. Save prompts or capture chats from supported AI sites
2. Organize with workspaces and tags
3. Pin or search to retrieve instantly
4. Paste the latest or selected prompt directly into active chat inputs

### Privacy & Data
All data (prompts, bookmarks, usage counts, settings) stays on your device. No cloud sync, no tracking pixels, no third-party analytics. Host permissions are limited strictly to required AI domains to enable paste and capture actions.

## Privacy Practices Matrix

| Data type | Purpose | Retention | Shared outside user device | Storage location |
| --- | --- | --- | --- | --- |
| Prompts and chat bookmarks you add | Let you save, search, pin, and paste content | Until you delete it or clear local data | No | `chrome.storage.local` |
| Workspaces, tags, and pinned flags | Organise saved items | Until you delete it or clear local data | No | `chrome.storage.local` |
| Usage counters (local analytics) | Surface frequently used prompts | Until you delete it or clear local data | No | `chrome.storage.local` |
| Extension preferences (layout, cleaner defaults) | Remember UI and feature settings | Until you change them or clear local data | No (Chrome Sync may replicate copies if the user enables Sync) | `chrome.storage.sync` (managed by Chrome) |

**Delete control**: The Settings panel includes a "Clear Local Data" button that erases the local dataset and requests removal of any Chrome-synced preferences in one step.

### Permissions Justification
- storage: Persist your library
- tabs: Identify the active tab for messages
- clipboardWrite: Provide fallback paste behavior
- contextMenus: Right-click capture & paste
- notifications: Confirm save actions
- sidePanel: Persistent workspace view
- Specific host permissions: ChatGPT only

### Why DialogDrive?
- Minimal, fast, unobtrusive
- Designed for high-volume AI users
- Aggressive UI density for small popup footprint
- Open structure for future local-only enhancements

### Roadmap (Non-Intrusive)
- Import/export bundles
- Optional local analytics dashboards
- i18n and theme refinements

### Support
Issues & feature requests: https://github.com/Nikolai-E/DialogDrive/issues
Privacy Policy: https://github.com/Nikolai-E/DialogDrive/blob/main/PRIVACY_POLICY.md

## Category
Productivity (alt: Developer Tools)

## Languages
English (initial)

## Pricing
Free

---
Adjust during submission if character limits require trimming.
