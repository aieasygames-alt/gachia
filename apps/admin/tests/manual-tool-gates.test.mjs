import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';

test('default unit command excludes all ten historical manual workflow tools', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.test, 'node --import tsx --test tests/*.test.mjs');
  const files = readdirSync(new URL('.', import.meta.url));
  const manual = files.filter((name) => /^(real-announcement-|next-).*\.mjs$/.test(name));
  assert.equal(manual.length, 10);
  assert.ok(manual.every((name) => !name.endsWith('.test.mjs')));
});

test('manual Next checks reject missing confirmation before browser or snapshot access', () => {
  for (const name of ['next-search-loading', 'next-search-integration', 'next-weapon-scope']) {
    const env = { ...process.env, WORKBENCH_NEXT_ORIGIN: 'http://127.0.0.1:1' };
    delete env.WORKBENCH_CONFIRM_EXISTING_NEXT_CHECK;
    const result = spawnSync(process.execPath, [fileURLToPath(new URL(`./${name}.mjs`, import.meta.url))],
      { env, encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Explicit existing non-sandbox Next browser-check confirmation required/);
  }
});

test('retired snapshot launcher always rejects, including with legacy arguments', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./next-snapshot-smoke.mjs', import.meta.url)),
    '/private/tmp/gachia-next-smoke.synthetic', 'legacy-baseline'],
  { encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Retired snapshot launcher/);
});
