import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificationScope, changedFiles } from './ci-verification-scope.mjs';

test('lightweight scope requires explicit enablement and strict allowlist', () => {
  const input = { enabled: 'true', event: 'pull_request', files: ['apps/admin/src/store.mjs', 'docs/workbench-no-update-closeout.md'] };
  assert.equal(verificationScope(input), 'admin');
  for (const patch of [{ enabled: undefined }, { enabled: 'false' }, { event: 'workflow_dispatch' }, { files: [] }, { files: null }]) assert.equal(verificationScope({ ...input, ...patch }), 'full');
  for (const file of ['apps/web/app/page.tsx', 'apps/admin/package.json', 'apps/admin/README.md',
    'packages/core/index.ts', 'pnpm-lock.yaml', '.github/workflows/deploy.yml', 'scripts/ci-verification-scope.mjs',
    'docs/unknown.md', 'apps/router/src/index.ts', 'apps/game-genshin/src/index.ts', 'apps/admin/src/../package.json',
    'apps/admin/src//a.js', 'apps/admin/src/.env', 'apps/admin/src/unknown.ts']) {
    assert.equal(verificationScope({ ...input, files: [...input.files, file] }), 'full', file);
  }
  assert.equal(verificationScope({ ...input, event: 'push', files: ['apps/admin/public/app.js', 'apps/admin/tests/batch-lifecycle.test.mjs'] }), 'admin');
});

test('diff is NUL-safe, includes both sides of moves and fails closed', () => {
  const base = 'a'.repeat(40); const head = 'b'.repeat(40); const calls = [];
  const git = (...args) => { calls.push(args); return args[0] === 'merge-base' ? base + '\n' : 'apps/admin/src/a.mjs\0apps/web/a.mjs\0'; };
  const files = changedFiles('pull_request', { pull_request: { base: { sha: base }, head: { sha: head } } }, git);
  assert.deepEqual(files, ['apps/admin/src/a.mjs', 'apps/web/a.mjs']);
  assert.ok(calls[1].includes('--no-renames'));
  assert.equal(verificationScope({ enabled: 'true', event: 'pull_request', files }), 'full');
  assert.equal(changedFiles('push', { before: '0'.repeat(40), after: head }, git), null);
  assert.equal(changedFiles('push', { before: base, after: head }, () => { throw new Error('Missing commit'); }), null);
  assert.equal(changedFiles('push', { before: base, after: head }, () => 'truncated'), null);
  assert.equal(changedFiles('workflow_dispatch', {}, git), null);
});
