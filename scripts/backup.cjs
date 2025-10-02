#!/usr/bin/env node
/**
 * Safe local backups without writing to Git state.
 * Creates unified diff + archives changed files for quick restore.
 * Rotates old backups (keeps last 20).
 */

const { execSync } = require('node:child_process');
const { mkdirSync, writeFileSync, existsSync, readdirSync, unlinkSync, readFileSync } = require('node:fs');
const path = require('node:path');

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return '';
  }
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

const dir = '.safety';
if (!existsSync(dir)) {
  mkdirSync(dir);
  console.log(`Created backup directory: ${dir}/`);
}

// 1) Unified diff (read-only)
console.log('Creating unified diff...');
let diff = '';
try {
  diff = sh('git diff HEAD');
} catch {}

const diffPath = `${dir}/patch-${ts()}.diff`;
writeFileSync(diffPath, diff || '# No changes in working tree.\n');
console.log(`  ✓ Diff saved: ${diffPath}`);

// 2) List changed/untracked files (skip binary extensions)
let files = [];
try {
  const modified = sh('git ls-files -m');
  const untracked = sh('git ls-files -o --exclude-standard');
  const combined = (modified + '\n' + untracked).split('\n').filter(Boolean);
  
  const binaryExts = /\.(png|jpg|jpeg|gif|webp|svg|ico|mp4|mov|avi|mkv|zip|tar|gz|7z|rar|exe|dll|bin|wasm|pdf|woff|woff2|ttf|otf|eot)$/i;
  files = combined.filter(f => !binaryExts.test(f));
} catch {}

// 3) Create tar.gz of changed files (if any)
let archivePath = null;
if (files.length > 0) {
  archivePath = `${dir}/files-${ts()}.tar.gz`;
  console.log(`Archiving ${files.length} changed file(s)...`);
  
  // Create file list for tar (escape spaces)
  const fileList = files.map(f => `"${f}"`).join(' ');
  
  // Use tar command (works on WSL, Git Bash, macOS, Linux)
  // On Windows without tar: fall back to copying files
  try {
    sh(`tar -czf "${archivePath}" ${fileList}`);
    console.log(`  ✓ Archive created: ${archivePath}`);
  } catch {
    console.log('  ⚠ tar command not available (install Git Bash or WSL for archive support)');
    archivePath = null;
  }
} else {
  console.log('No modified/untracked files to archive.');
}

// 4) Append entry to BACKUP.md
const backupLog = 'BACKUP.md';
const timestamp = new Date().toISOString();
const entry = `
---

## Backup @ ${timestamp}

- **Diff:** \`${diffPath}\`
- **Files:** ${files.length > 0 ? `${files.length} file(s)` + (archivePath ? ` → \`${archivePath}\`` : ' (not archived)') : 'none'}
- **Changed files:**
${files.length > 0 ? files.map(f => `  - ${f}`).join('\n') : '  - (none)'}

`;

if (!existsSync(backupLog)) {
  writeFileSync(backupLog, '# Safety Backups\n\nLocal backup history before risky operations.\n');
}

writeFileSync(backupLog, entry, { flag: 'a' });
console.log(`  ✓ Entry appended to ${backupLog}`);

// 5) Rotate old backups (keep last 20)
function rotate(pattern) {
  const allFiles = readdirSync(dir)
    .filter(f => f.startsWith(pattern))
    .sort();
  
  while (allFiles.length > 20) {
    const toDelete = path.join(dir, allFiles.shift());
    unlinkSync(toDelete);
    console.log(`  🗑 Rotated old backup: ${toDelete}`);
  }
}

rotate('patch-');
rotate('files-');

console.log('\n✓ Backup complete!');
console.log(`  Total backups: ${readdirSync(dir).filter(f => f.startsWith('patch-')).length} diffs, ${readdirSync(dir).filter(f => f.startsWith('files-')).length} archives`);
