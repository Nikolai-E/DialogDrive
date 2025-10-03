# Safety Backups

Local backup history before risky operations.

## How to Restore

### Option 1: Apply diff patch

```bash
git apply .safety/patch-YYYY-MM-DD....diff
```

### Option 2: Extract archived files

```bash
tar -xzf .safety/files-YYYY-MM-DD....tar.gz
```

## Backup History

Entries are appended automatically by `npm run backup`.

---

---

## Backup @ 2025-10-02T16:25:08.081Z

- **Diff:** `.safety/patch-2025-10-02T16-25-07.diff`
- **Files:** 5 file(s) → `.safety/files-2025-10-02T16-25-08.tar.gz`
- **Changed files:**
  - .gitignore
  - package.json
  - AGENT_GUIDE.md
  - BACKUP.md
  - scripts/backup.cjs
