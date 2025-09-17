# DialogDrive – Improvement Plan

Status: living document. Tracks immediate fixes, quick wins, and roadmap.

## Priorities

1) Biggest fixes (now)
- Fix README merge conflict
- Sync versions between `package.json` and manifest (WXT)
- Deterministic paste flow from popup: send to active tab first, fallback to clipboard
- Remove dead/unused files
- Make lint step not require missing dev deps

2) Quick wins (next)
- Command palette (Ctrl/Cmd+K) using existing `components/ui/command.tsx`
- Add chats export/import UI in Settings
- Omnibox keyword (`dd`) for quick search

3) Platform coverage
- Add Gemini/Claude host permissions + content matches (optional)
- Implement `GeminiAdapter` and `ClaudeAdapter`; register in `platforms/manager`

4) MV3 reliability
- Offscreen document for background clipboard writes; remove SW clipboard usage
- Tighten CSP by moving inline Shadow DOM CSS to Constructable Stylesheet (optional)

5) UX polish
- First‑run onboarding: short tip sheet (Search, Save, Paste)
- Defaults: auto‑title from page, last workspace, auto `#today` on floating save

## Task Board

- [x] Add plan file and start execution
- [ ] Resolve README conflict markers
- [ ] Align `package.json` version with `wxt.config.ts`
- [ ] Remove unused files (`lib/unifiedStoreSimplified.ts`, `SettingsSimple.tsx`, UI `WorkspaceSelect` variant)
- [ ] Deterministic paste from popup item click and prompt list
- [ ] Make `lint` script TS‑only (no eslint dependency)
- [ ] Command palette wiring (Ctrl/Cmd+K)
- [ ] Chats export/import in Settings
- [ ] Omnibox keyword integration
- [ ] Offscreen clipboard utility
- [ ] Gemini/Claude adapters + permissions

## Notes

- Keep scope tight and avoid unrelated refactors.
- Ensure store listing compliance (permissions table matches manifest).

