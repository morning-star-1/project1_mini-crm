import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

test('required files exist', () => {
  const required = ['package.json', 'server.js'];
  const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
  assert.equal(missing.length, 0, 'Missing: ' + missing.join(', '));
});
