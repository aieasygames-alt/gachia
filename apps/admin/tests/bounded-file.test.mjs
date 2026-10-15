import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, writeFileSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readBoundedFile } from '../src/bounded-file.mjs';

test('bounded reader handles empty/exact/chunked input and rejects oversized or unsafe files', (t) => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-bounded-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'input');
  writeFileSync(path, '');
  assert.equal(readBoundedFile(path, 0).length, 0);
  const content = Buffer.alloc(65537, 97); writeFileSync(path, content);
  assert.deepEqual(readBoundedFile(path, content.length), content);
  assert.throws(() => readBoundedFile(path, content.length - 1));
  for (const budget of [NaN, Infinity, -1, '1', 1.5, 256 * 1024 * 1024 + 1]) assert.throws(() => readBoundedFile(path, budget));
  mkdirSync(join(root, 'directory'));
  assert.throws(() => readBoundedFile(join(root, 'directory'), 100));
  symlinkSync(path, join(root, 'link'));
  assert.throws(() => readBoundedFile(join(root, 'link'), content.length));
});
