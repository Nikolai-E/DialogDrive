This file has been deleted.
# Store Listing Copy Draft

**Title:** DialogDrive Prompt Hub
**Tagline:** Save and reuse ChatGPT prompts without leaving your tab.

**Long Description:**
DialogDrive centralizes the prompts and chat bookmarks you hand off to ChatGPT so you can capture, organize, and reuse them in seconds. Everything stays local on your device for privacy-first productivity.
- Capture prompts or current ChatGPT chats from the toolbar, floating save button, or context menu.
- Workspaces, tags, pinning, and fast search keep high-signal prompts at the top of your list.
- Paste the latest prompt or open saved chats with keyboard shortcuts and side panel access.
- Built-in text cleaner and usage stats help you polish prompts before sending them.
- 100% local storage (with optional Chrome Sync for preferences) and no analytics or trackers.

**Screenshot Storyboard (1280x800, landscape unless noted):**
1. Popup home: unified list with search, workspace quick filters, and tagged prompt rows (overlay: "Find any prompt in seconds").
2. Prompt form: editing workflow showing workspaces, tags, tone generator, and timestamp toggle (overlay: "Organize by workspace & tags").
3. Floating save modal on chatgpt.com capturing a conversation with tags and workspace picker (overlay: "Save chats without leaving the page").
4. Keyboard shortcut toast: quick paste confirmation in ChatGPT plus side panel overview (overlay: "Paste your go-to prompt instantly").
5. Settings view: quick stats, workspace/tag management, expanded privacy copy, and the new Clear local data control (overlay: "Privacy controls in one click").

## Asset Production Checklist
| Asset | Owner | Due date | Output path | Notes |
| --- | --- | --- | --- | --- |
| Extension icon set (16/32/48/128/256 PNG) | Design lead | Aug 12 | `/docs/assets/final/icons/` | Export from master vector; ensure crisp edges + favicon variant |
| Promo tile (1280x800) | Design lead | Aug 14 | `/docs/assets/final/promo/` | Text inside 80px safe area; deliver light + dark variants |
| Screenshot 1 – Popup search view | PM + QA capture | Aug 15 | `/docs/assets/final/screenshots/01-popup.png` | Overlay: “Find any prompt in seconds”; add subtle text shadow for contrast |
| Screenshot 2 – Prompt editor | PM + QA capture | Aug 15 | `/docs/assets/final/screenshots/02-editor.png` | Cursor visible in title field; tags + tone generator expanded |
| Screenshot 3 – Floating save modal | PM + QA capture | Aug 15 | `/docs/assets/final/screenshots/03-floating.png` | Must show sanitized `<img onerror>` tag rendered as plain text |
| Screenshot 4 – Paste toast + side panel | PM + QA capture | Aug 16 | `/docs/assets/final/screenshots/04-paste.png` | Include keyboard shortcut hint bubble and side panel list |
| Screenshot 5 – Settings privacy + Clear data | PM + QA capture | Aug 16 | `/docs/assets/final/screenshots/05-settings.png` | Capture last-cleared timestamp + info callout |
| Chrome Web Store preview tile (440x280, optional) | Design lead | Aug 18 | `/docs/assets/final/promo/preview-440x280.png` | Adapt promo tile; confirm legibility at small size |
| Promo video (30–45s, 1920x1080 MP4/WebM) | Motion design | Aug 22 | `/docs/assets/final/video/` | Follow outline below; include CTA end card + burned-in captions |
| Store listing copy QA | PM/editor | Aug 19 | `/docs/assets/final/copy/` | Review short/long descriptions, matrix, permissions text |

Before hand-off, run a manual contrast check on every overlay/text element (WCAG AA) and drop raw design files plus exported assets into the `/docs/assets/final/` directory alongside a short README summarizing capture context.

Designers should confirm assets meet [Chrome Web Store asset guidelines](https://developer.chrome.com/docs/webstore/brand-store-assets/) and export both raw (Figma/Sketch) and optimized delivery files into `/docs/assets/`.

**Icon Notes:**
- Keep existing beige-on-black logo, ensure exports at 16, 32, 48, 128, 256 px PNG with transparent background.
- Prepare a 1280x800 promotional tile re-using the icon with "Organize ChatGPT prompts" headline for Chrome Web Store feature slot.

**Promo Video (30–45s) Outline:**
- 0–5s: Hook – overlay text "Tired of hunting for your best ChatGPT prompts?" with icon animation.
- 5–15s: Show popup list filtering and pinning; callout "Find your go-to prompt in two keystrokes".
- 15–25s: Demonstrate floating save button capturing a chat and syncing into the library; highlight keyboard shortcut overlay.
- 25–35s: Walk through prompt editing with tags, workspaces, and tone generator; emphasize local storage badge.
- 35–45s: Close on side panel + privacy message "Everything stays on your device" with CTA "Install DialogDrive".

**Privacy & Permissions Explainer:**
- Data stays in browser storage; prompts, chat URLs, snippets, and usage counts are local only.
- Preferences (e.g., cleaner options) sync via Chrome Sync but never touch DialogDrive servers.
- Permissions: storage (save data), tabs (talk to the active ChatGPT tab), clipboardWrite (fallback copying), contextMenus (right-click actions), notifications (success toasts), sidePanel (persistent workspace). Host access is limited to chatgpt.com domains.

**Premium Upsell Ideas:**
- Power History: unlimited version history per prompt with diffing and rollback.
- Team Spaces: shared prompt libraries synced through customer storage (Google Drive, Notion, etc.).
- AI Refiner: local or API-assisted prompt rewrite suggestions with customizable tone presets.
- Workflow Automations: trigger sequences that paste prompts and capture responses on schedule.
- Priority Support & roadmap votes for pro subscribers.

**Growth Loops (3):**
- Shareable prompt bundles via export/import files with one-click import links.
- Referral credits when users invite teammates into shared workspaces.
- Integrations to import prompts from popular docs (e.g., Notion, Google Docs) with attribution badges.

**Virality Hooks (2):**
- One-click "Share this workspace" flow that generates a read-only public gallery link.
- Weekly leaderboard email featuring top community prompt bundles (opt-in, hosted on marketing site).
