import assert from 'node:assert/strict';
import test from 'node:test';
import { needsConsumerVerification } from './payload-verification-scope.mjs';

test('only bounded documentation changes skip heavy consumer checks; unknown changes fail closed', () => {
  assert.equal(needsConsumerVerification(['docs/runbook.md', 'plans/next.md', 'services/content-cms/README.md']), false);
  for (const paths of [[], ['scripts/a.mjs'], ['apps/web/app/page.tsx'], ['pnpm-lock.yaml'], ['.github/workflows/payload-verify.yml'], ['reports/input.json'], ['AGENTS.md']]) {
    assert.equal(needsConsumerVerification(paths), true);
  }
});
