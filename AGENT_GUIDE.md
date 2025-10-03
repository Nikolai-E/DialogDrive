# Agent Guide: DialogDrive Repository Rules

## Prime Directives

1. **Run `npm run backup` before risky operations**
2. **Keep repository clean** via `.gitignore` patterns
3. **Finish with `npm run check:all`** before commits

---

## What Are "Risky Operations"?

Operations that warrant a local backup:

- **Bulk renames or code-mods** (>5 files changed at once)
- **Dependency upgrades** (package.json changes, especially major versions)
- **Config rewrites** (tsconfig, playwright, wxt, tailwind, postcss)
- **CI/hooks changes** (GitHub Actions, husky, pre-commit)
- **>3 file deletes or moves** (restructuring)
- **Automated refactoring tools** (codemods, AST transforms)

---

## Standard Working Steps

```
1. Understand the change request
2. If risky → npm run backup
3. Make code changes
4. npm run check:fast (or npm run lint)
5. If UI flow changed → add/adjust Playwright tests
6. npm run check:all
7. Commit with conventional commit message
```

---

## Testing Guidance

### When to Add Playwright Tests

Use Playwright tests **when suitable**, not for every tiny change:

- ✅ **Add e2e tests when:**
  - New user-facing flows (popup navigation, sidepanel actions)
  - UI state changes (form submissions, button behaviors)
  - Cross-component interactions (storage + UI sync)
  - Critical user journeys (save chat, create prompt, library search)

- ❌ **Skip e2e tests for:**
  - Pure CSS/styling tweaks
  - Internal refactors with no UI impact
  - Simple type fixes or renames
  - Documentation updates

### Playwright Test Structure

- **Location:** `tests/e2e/specs/*.spec.ts`
- **Use `data-testid`** for stable selectors
- **Focus on happy paths** first, edge cases second
- **Keep tests fast** (<5s each when possible)

Example:

```typescript
test('creates a new prompt draft', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.getByTestId('new-prompt-button').click();
  await page.getByTestId('prompt-title-input').fill('Test Prompt');
  await page.getByTestId('save-button').click();
  await expect(page.getByText('Prompt saved')).toBeVisible();
});
```

---

## Available Commands

| Command              | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `npm run backup`     | Create local safety backup (diffs + files)         |
| `npm run check:all`  | Full quality gate (typecheck + lint + build + e2e) |
| `npm run check:fast` | Quick validation (typecheck only)                  |
| `npm run lint`       | TypeScript check                                   |
| `npm run format`     | Prettier formatting                                |
| `npm run build`      | Production build                                   |
| `npm run test:e2e`   | Run Playwright tests                               |
| `npm run dev`        | Development mode                                   |

---

## Conventional Commit Format

Use these prefixes for commits:

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructure (no behavior change)
- `test:` Add/update tests
- `docs:` Documentation only
- `chore:` Maintenance (deps, configs)
- `style:` Formatting, whitespace
- `perf:` Performance improvements

Examples:

```
feat: add prompt filtering in library
fix: resolve draft persistence bug in sidepanel
refactor: extract chat storage logic to unified store
test: add e2e coverage for bookmark creation
chore: update playwright to v1.55
```

---

## Backup & Recovery

### Creating a Backup

```bash
npm run backup
```

This creates:

- `.safety/patch-YYYY-MM-DD....diff` (Git diff)
- `.safety/files-YYYY-MM-DD....tar.gz` (Changed/untracked files)
- Appends entry to `BACKUP.md`

### Restoring from Backup

**Option 1: Apply diff patch**

```bash
git apply .safety/patch-2025-10-02....diff
```

**Option 2: Extract files**

```bash
tar -xzf .safety/files-2025-10-02....tar.gz
```

### Backup Rotation

- Keeps last **20 backups** automatically
- Skips binary/large files (images, videos, archives)
- Never overwrites existing backups

---

## Git-Blind Mode (for AI Agents)

AI agents should:

- ❌ **Never commit, stash, push, or modify Git state**
- ✅ **Use `npm run backup` for safety** (read-only Git operations)
- ✅ **Read `git diff` and `git status`** (safe)
- ✅ **Let humans handle commits and PRs**

---

## Project Structure Notes

- **Entry points:** `entrypoints/` (popup, sidepanel, background, content scripts)
- **Shared logic:** `lib/` (storage, state, utilities)
- **UI components:** `entrypoints/*/components/` + `components/ui/`
- **Tests:** `tests/e2e/specs/`
- **Build output:** `.wxt/` (dev), `dist/` (prod), ignored by Git

---

## Additional Resources

- [Technical Overview](./docs/TECH_OVERVIEW.md)
- [Design Research](./docs/DesignResearch.md)
- [Playwright Config](./playwright.config.ts)
- [TypeScript Config](./tsconfig.json)
