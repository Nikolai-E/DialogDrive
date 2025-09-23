import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const sourcePath = resolve(process.cwd(), 'lib/placeholders.ts');
const source = readFileSync(sourcePath, 'utf8');
const { outputText } = transpileModule(source, {
  compilerOptions: {
    target: ScriptTarget.ES2019,
    module: ModuleKind.CommonJS,
  },
  fileName: 'placeholders.ts',
});
const sandbox = { module: { exports: {} } };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(outputText, sandbox, { filename: 'placeholders.js' });
const { extractPlaceholders, replacePlaceholders } = sandbox.module.exports;

test('extractPlaceholders finds unique bracketed names in order', () => {
  const text = 'Prep [file] and [dir], then rename [file].';
  const result = extractPlaceholders(text);
  assert.deepEqual(result, ['file', 'dir', 'file']);
});

test('replacePlaceholders substitutes from map, defaulting to empty string', () => {
  const text = 'Deploy to [env] with tag [tag] and owner [owner].';
  const map = { env: 'prod', tag: 'v1.2.3' };
  const result = replacePlaceholders(text, map);
  assert.equal(result, 'Deploy to prod with tag v1.2.3 and owner .');
});
