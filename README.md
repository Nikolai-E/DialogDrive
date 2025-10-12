<p align="center">
  <img width="128" height="128" alt="icon-256" src="https://github.com/user-attachments/assets/85d4c29f-d78e-443c-baf1-2b3fc0a0afde" />
</p>
<h1 align="center">DialogDrive - AI Prompt & Chat Workspace Extension</h1>

<p align="center">
  Built to save time and streamline workflows when using various AI chats like ChatGPT, Claude, and others. Allows for fast prompt interations and easy chat saving. Ensure easy access to your best prompts and past conversations, with keyboard shortcuts and a lightweight UI.
</p>
<p align="center">
  <a href="https://dialogdrive.eidheim.com">dialogdrive.eidheim.com</a>
</p>

## Why DialogDrive

- Group prompts, chats, and snippets for quick access.
- Save any chat with one shortcut; find it instantly.
- Runs fully local, no cloud, no data sharing.
- Fast, minimal UI in popup or side panel.
- Automated tests prevent regressions.

<table>
  <tr>
    <td align="center" width="50%">
      <video width="100%" controls poster="https://github.com/Nikolai-E/DialogDrive/raw/Website/website/assets/screenshot-popup.png">
        <source src="https://github.com/Nikolai-E/DialogDrive/raw/Website/website/assets/Dd-Demo-Clipchamp.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <p><em>Quick tour of the DialogDrive workspace</em></p>
    </td>
    <td align="center" width="50%">
      <video width="100%" controls poster="https://github.com/Nikolai-E/DialogDrive/raw/Website/website/assets/screenshot-popup2.png">
        <source src="https://github.com/Nikolai-E/DialogDrive/raw/Website/website/assets/Make%20a%20prompt.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <p><em>Create and save a prompt in seconds</em></p>
    </td>
  </tr>
</table>

## How It Works

- Unified prompt & chat bookmark library with workspaces, tags, pinning, usage counts.
- Search, filter, and sort across everything in milliseconds.
- Capture the current chat context with one click or shortcut, no copy/paste gymnastics.
- `wxt`-powered extension with React, Radix UI, Tailwind, and local-first storage.
- Smart paste drops your latest prompt straight into ChatGPT and tracks reuse.
- Works today with ChatGPT, Claude, Gemini, DeepSeek, AI Studio, and more. Additional providers will be added as they become relevant.

## Privacy First

DialogDrive stores all data locally in your browser extension. No cloud sync, no analytics, and no `<all_urls>` permission. Content scripts do not access site `localStorage` or inject HTML. For more details, see `PRIVACY_POLICY.md`.

## Permission Checklist

| Permission                       | Why it exists today                                            |
| -------------------------------- | -------------------------------------------------------------- |
| `storage`                        | Persist prompts, chats, tags, prefs                            |
| `activeTab`                      | Capture and paste in the active ChatGPT tab                    |
| `clipboardWrite`                 | Fallback when the site blocks programmatic paste               |
| `contextMenus`                   | Right-click save selection and quick paste                     |
| `notifications`                  | Confirm saves without clogging the UI                          |
| `sidePanel`                      | Keep the workspace open next to the chat window                |
| host permissions (`chatgpt.com`) | Minimal content scripts for capture/paste workflows only       |

No background telemetry and no third-party calls. Future optional providers will request their host permission explicitly when shipped.

## Playwright Safety Net
Automated end-to-end tests validate all core workflows—capture, paste, search, and more—across supported providers.

```bash
npm run test:e2e         # Run the full Playwright suite (headless)
npm run test:e2e:headed  # Watch tests in the browser (headed mode)
```

## Dev Setup

- Requires Node 18+.
- `npm install`
- `npm run dev` to build and watch (Chrome recommended).
- Load `dist/` via `chrome://extensions` > Developer Mode > Load unpacked.
- `npm run build` for production bundle, `npm run zip` for store upload.

### UI Notes (Oct 2025)

- Tabs: All, Prompts, Chats, Library. Library seeds reusable prompts.
- Tools: Text Cleaner lives under the Tools dropdown as “Text Tools”.
- Fresh installs start blank; use the Library tab to preload examples.

## Default Keyboard Shortcuts

| Action              | Windows / Linux | macOS       |
| ------------------- | --------------- | ----------- |
| Paste latest prompt | Ctrl+Shift+P    | Cmd+Shift+P |
| Save current chat   | Ctrl+Shift+B    | Cmd+Shift+B |
| Open side panel     | Ctrl+Shift+D    | Cmd+Shift+D |
| Quick search popup  | Ctrl+Shift+F    | Cmd+Shift+F |

## Project Structure

```
entrypoints/      # background, content, popup, side panel
lib/              # storage adapters, data utilities
components/       # React + Radix UI pieces styled with Tailwind
types/            # Shared TypeScript definitions
tests/            # Playwright suites
playwright-report # HTML reports after a run
```

## Release Checklist

1. Bump version in `wxt.config.ts`.
2. Update `CHANGELOG.md`.
3. `npm run build && npm run zip`.
4. Upload zip to the Chrome Web Store dashboard.
5. Refresh listing copy, screenshots, privacy URL, then submit for review.

## Roadmap (Top of Stack)

- Bulk import/export so teams can share prompt packs.
- Optional local-only analytics (usage trends without leaking data).
- i18n once the UI copy settles.

## License

DialogDrive is distributed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Required attributions for bundled dependencies live in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), with additional compliance details in `reports/LICENSES-REPORT.md`.

---

Questions or bug reports? Issues tab is open.
