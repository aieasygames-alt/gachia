import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { verifyWorkerArtifact } from '../../../scripts/verify-worker-artifact.mjs';

test('artifact portability accepts relative internal links and rejects external, absolute and broken links', () => {
  const root = mkdtempSync(join(tmpdir(), 'worker-portability-'));
  try {
    const artifact = join(root, 'artifact');
    mkdirSync(join(artifact, '.build'), { recursive: true }); mkdirSync(join(artifact, 'assets'));
    for (const file of ['worker.js', '.build/open-next.config.edge.mjs', 'assets/BUILD_ID']) writeFileSync(join(artifact, file), 'fixture');
    symlinkSync('worker.js', join(artifact, 'internal'));
    assert.deepEqual(verifyWorkerArtifact(artifact), { files: 3, links: 1, portable: true, scope: 'filesystem_portability_not_runtime_or_platform_acceptance' });
    writeFileSync(join(root, 'outside'), 'fixture');
    for (const target of ['../outside', join(artifact, 'worker.js'), 'missing', 'loop']) {
      symlinkSync(target, join(artifact, 'loop'));
      assert.throws(() => verifyWorkerArtifact(artifact));
      rmSync(join(artifact, 'loop'));
    }
    symlinkSync(artifact, join(root, 'root-link'));
    assert.throws(() => verifyWorkerArtifact(join(root, 'root-link')), /root must not be a link/);
    writeFileSync(join(artifact, 'assets/BUILD_ID'), '');
    assert.throws(() => verifyWorkerArtifact(artifact), /Required artifact file/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('CI checks actual artifact portability after browser checks and before sealing', () => {
  const require = createRequire(import.meta.url);
  const config = require('yaml').parse(readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
  const steps = config.jobs.build.steps;
  const gate = steps.findIndex(s => s.run === 'node scripts/verify-worker-artifact.mjs apps/web/.open-next');
  assert.ok(gate > steps.findIndex(s => s.name === 'Browser navigation smoke tests'));
  assert.ok(gate < steps.findIndex(s => s.id === 'seal-web'));
});
