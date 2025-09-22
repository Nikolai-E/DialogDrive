import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.eventListeners = new Map();
    this.className = '';
    this.textContent = '';
    this.ownerDocument = null;
    this.parentNode = null;
    this.innerHTMLAssigned = false;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
    if (name === 'class') this.className = value;
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  addEventListener(type, listener) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(listener);
  }

  dispatchEvent(event) {
    event.target = this;
    const listeners = this.eventListeners.get(event.type) ?? [];
    for (const listener of listeners) {
      listener(event);
    }
    return true;
  }

  set innerHTML(value) {
    this.innerHTMLAssigned = true;
    this._innerHTML = value;
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

class MockDocument {
  constructor() {
    this.createdElements = [];
  }

  createElement(tagName) {
    const el = new MockElement(tagName);
    el.ownerDocument = this;
    this.createdElements.push(el);
    return el;
  }

  createElementNS(_ns, tagName) {
    return this.createElement(tagName);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sourcePath = resolve(__dirname, '../../entrypoints/floating-save/tagHelpers.ts');
const source = readFileSync(sourcePath, 'utf8');
const { outputText } = transpileModule(source, {
  compilerOptions: {
    target: ScriptTarget.ES2019,
    module: ModuleKind.CommonJS,
  },
  fileName: 'tagHelpers.ts',
});
const sandbox = { module: { exports: {} } };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(outputText, sandbox, { filename: 'tagHelpers.js' });
const { createTagChip, sanitizeTagLabel } = sandbox.module.exports;

test('createTagChip renders text safely and wires removal handlers', () => {
  const doc = new MockDocument();
  let removedCount = 0;
  const chip = createTagChip({
    document: doc,
    tag: '<img src=x onerror=alert(1)>',
    onRemove: () => { removedCount += 1; },
  });

  assert.equal(chip.className, 'dd-tag');
  assert.equal(chip.innerHTMLAssigned, false);
  assert.equal(chip.children.length, 2);

  const [label, removeIcon] = chip.children;
  assert.equal(label.textContent, '<img src=x onerror=alert(1)>');
  assert.equal(removeIcon.getAttribute('aria-label'), 'Remove tag <img src=x onerror=alert(1)>');

  removeIcon.dispatchEvent({ type: 'click' });
  assert.equal(removedCount, 1);

  let prevented = false;
  removeIcon.dispatchEvent({
    type: 'keydown',
    key: 'Enter',
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(removedCount, 2);
});

test('sanitizeTagLabel removes control characters and trims whitespace', () => {
  const label = '\u0000  spaced\u000Btag  \u0008';
  assert.equal(sanitizeTagLabel(label), 'spacedtag');
});
