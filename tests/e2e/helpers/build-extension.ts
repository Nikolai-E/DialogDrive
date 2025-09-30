import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');

const CANDIDATE_OUTPUTS = [
  ['.output', 'chrome-mv3'],
  ['.output', 'chromium-mv3'],
  ['dist', 'chrome-mv3'],
  ['dist', 'chromium-mv3'],
  ['dist', 'chrome'],
];

async function runBuild(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const build = spawn(command, ['run', 'build'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    build.on('error', reject);
    build.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm run build exited with code ${code}`));
      }
    });
  });
}

function findExistingOutput(): string | null {
  for (const segments of CANDIDATE_OUTPUTS) {
    const candidate = path.join(ROOT_DIR, ...segments);
    const manifestPath = path.join(candidate, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      return candidate;
    }
  }
  return null;
}

export async function buildExtension(): Promise<string> {
  const cachedPath = process.env.DD_EXTENSION_PATH;
  if (cachedPath && fs.existsSync(path.join(cachedPath, 'manifest.json'))) {
    return cachedPath;
  }

  const existing = findExistingOutput();
  if (existing) {
    return existing;
  }

  if (!process.env.DD_SKIP_REBUILD) {
    await runBuild();
  }

  const output = findExistingOutput();
  if (!output) {
    throw new Error('Unable to locate built extension output after running npm run build.');
  }

  return output;
}
