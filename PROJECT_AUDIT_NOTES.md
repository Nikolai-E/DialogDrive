# Project Audit Notes

## Overview
- Extension built with WXT (manifest v3) using React for popup/side panel.
- Key entrypoints in `entrypoints/` (background, content scripts, popup, side panel).
- Shared utilities in `lib/`, React UI in `components/`, types in `types/`, static assets in `assets/` and `public/`.
- Supporting docs under `docs/` and root-level release policies.

## Review Tracker
| Status | Path | Purpose / Notes |
| ------ | ---- | ---------------- |
| [x] | `entrypoints/background.ts` | Background SW handles storage/bookmark CRUD, context menu + shortcuts init, validates messages |
| [x] | `entrypoints/content.ts` | Content script listens for paste/capture commands; scoped to chatgpt hosts |
| [x] | `entrypoints/floating-save.content.ts` | Injects floating capture UI on ChatGPT pages; handles modal, workspace/tag selection, SAVE_BOOKMARK messaging |
| [x] | `entrypoints/popup` | React UI for prompts/chats; uses unified store, clipboard, lazy forms; removed unused BookmarkForm/HeaderSimple |
| [x] | `entrypoints/sidepanel` | Standalone React panel, loads prompts, uses tabs API for paste; exports JSON via Blob |
| [x] | `components/` | Shared React UI + Radix wrappers, Virtualized lists; removed unused inline select/pin toggle artifacts; fix glyphs |
| [x] | `lib/` | Storage layer, chat manager, context menu + shortcuts, platform adapters; removed legacy zero-byte stubs |
| [x] | `types/` | Prompt/chat/app type definitions align with storage usage; includeTimestamp required |
| [x] | `assets/` | Removed during cleanup; previously contained unused react.svg |
| [x] | `public/` | Holds icon set referenced by manifest; removed unused wxt.svg placeholder |
| [x] | `docs/` & policies | ChromePolicy + privacy docs align with local-only data; contains extra research/backups not needed for runtime |
| [x] | Root configs (`package.json`, `wxt.config.ts`, tooling) | WXT config defines MV3 manifest; scripts run lint/build; tsconfig/tailwind scope extension only |

## Next Steps
- Verify store submission docs (privacy, listing, permissions) remain in sync with manifest.
- Run smoke tests for capture/paste, context menus, side panel before packaging.
- QA chat bookmark flows (popup + context menu) after validation changes.
