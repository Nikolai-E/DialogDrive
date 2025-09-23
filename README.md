<p align="center">
  <img width="128" height="128" alt="icon-256" src="https://github.com/user-attachments/assets/85d4c29f-d78e-443c-baf1-2b3fc0a0afde" />
</p>
<h1 align="center">DialogDrive - AI Prompt & Chat Workspace Extension</h1>

DialogDrive helps you capture, organize, search, and reuse AI prompts and chat bookmarks for ChatGPT directly from a compact, fast browser extension interface. Support for additional providers is on the roadmap but not available yet.

## Key Features

* Unified prompt & chat bookmark library (workspaces, tags, pinning)
* Instant search, filtering, sorting (recent, usage, alphabetical, pinned)
* One-click or shortcut capture of current chat context
* Global commands & configurable keyboard shortcuts
* Smart paste of most recent prompt (with usage tracking)
* Side panel & popup UI (space-efficient, virtualized lists)
* 100% local storage - no cloud, no tracking, no analytics


<table>
  <tr>
    <td align="center" width="50%">
      <img width="683" height="957" alt="image" src="https://github.com/user-attachments/assets/31906a60-a3bb-47a7-b68d-e7d00d53dba6" />
    </td>
    <td align="center" width="50%">
      <img alt="image" src="https://github.com/user-attachments/assets/ada94d43-6239-4c78-9551-bd56fa721d05" width="100%" />
    </td>
  </tr>
</table>

## Privacy & Data

All data (prompts, bookmarks, settings, usage counts) is stored locally using browser extension storage. Content scripts do not access site `localStorage` and never inject unsafe HTML. No external servers or analytics are contacted. See `PRIVACY_POLICY.md` for details.

## Permissions Justification

| Permission                         | Reason                                             |
| ---------------------------------- | -------------------------------------------------- |
| `storage`                          | Persist prompts, bookmarks, settings               |
| `tabs`                             | Query active tab for paste/capture workflows        |
| `clipboardWrite`                   | Copy/paste prompt fallback                         |
| `contextMenus`                     | Quick save selection, paste latest prompt          |
| `notifications`                    | User feedback after save actions                   |
| `sidePanel`                        | Provide persistent workspace panel                 |
| host permissions (`chatgpt.com`)   | Inject minimal content scripts for capture & paste |

No broad `<all_urls>` access. No network requests to third-party APIs.
Note: Today DialogDrive works with ChatGPT. Future releases may add optional support for other providers (e.g., Gemini, Claude) once they are implemented and their host permissions are added.

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
3. Load Unpacked -> select `dist/` (after build)

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
3. Run pre-push checks (see `PRE_PUSH_REVIEW.md`), then `npm run build && npm run zip`
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
