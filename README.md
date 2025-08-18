<p align="center">
  <img width="128" height="128" alt="icon-256" src="https://github.com/user-attachments/assets/85d4c29f-d78e-443c-baf1-2b3fc0a0afde" />
</p>
<h1 align="center">DialogDrive – AI Prompt & Chat Workspace Extension</h1>

DialogDrive helps you capture, organize, search, and reuse AI prompts and chat bookmarks across leading AI chat platforms (ChatGPT, Claude, Gemini) directly from a compact, fast browser extension interface.

## Key Features

* Unified prompt & chat bookmark library (workspaces, tags, pinning)
* Instant search, filtering, sorting (recent, usage, alphabetical, pinned)
* One‑click or shortcut capture of current chat context
* Global commands & configurable keyboard shortcuts
* Smart paste of most recent prompt (with usage tracking)
* Side panel & popup UI (space‑efficient, virtualized lists)
* 100% local storage – no cloud, no tracking, no analytics

<table>
  <tr>
    <td align="center" width="50%">
      <img alt="image" src="https://github.com/user-attachments/assets/ff87a19a-a69d-4dc4-a9c0-ffbc52003a2f" width="100%" />
    </td>
    <td align="center" width="50%">
      <img alt="image" src="https://github.com/user-attachments/assets/ada94d43-6239-4c78-9551-bd56fa721d05" width="100%" />
    </td>
  </tr>
</table>

## Privacy & Data

All data (prompts, bookmarks, settings, usage counts) is stored locally using browser extension storage. No external servers or analytics are contacted. See `PRIVACY_POLICY.md` for details.

## Permissions Justification

| Permission                                                   | Reason                                             |
| ------------------------------------------------------------ | -------------------------------------------------- |
| storage                                                      | Persist prompts, bookmarks, settings               |
| clipboardWrite                                               | Copy/paste prompt fallback                         |
| contextMenus                                                 | Quick save selection, paste latest prompt          |
| notifications                                                | User feedback after save actions                   |
| sidePanel                                                    | Provide persistent workspace panel                 |
| host permissions (chatgpt.com, claude.ai, gemini.google.com) | Inject minimal content scripts for capture & paste |

No broad `<all_urls>` access. No network requests to third-party APIs.

## Development

Requires Node 18+.

Install dependencies:

```
npm install
```

Start in dev mode (Chrome):

```
npm run dev
```

Build production bundle:

```
npm run build
```

Generate store zip:

```
npm run zip
```

Load Unpacked (Chrome):

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load Unpacked → select `dist/` (after build)

## Keyboard Shortcuts (Default)

| Action              | Windows / Linux | macOS       |
| ------------------- | --------------- | ----------- |
| Paste latest prompt | Ctrl+Shift+P    | Cmd+Shift+P |
| Save current chat   | Ctrl+Shift+B    | Cmd+Shift+B |
| Open side panel     | Ctrl+Shift+D    | Cmd+Shift+D |
| Quick search popup  | Ctrl+Shift+F    | Cmd+Shift+F |

## Project Structure

```
entrypoints/      # background, content, popup, side panel
lib/              # storage, adapters, utilities
components/       # UI components (React + Radix + Tailwind utilities)
types/            # Type definitions
```

## Release Process

1. Update version in `wxt.config.ts`
2. Update `CHANGELOG.md`
3. `npm run build && npm run zip`
4. Upload zip to Chrome Web Store Developer Dashboard
5. Fill listing metadata (description, screenshots, privacy URL)
6. Submit for review

## Contributing

PRs and issues welcome. Please open an issue for feature proposals before large changes.

## Roadmap (High-Level)

* Bulk import/export
* Optional advanced analytics (local only)
* i18n support

## License

MIT (include license file if added).

---

For support or questions, open a GitHub issue.
