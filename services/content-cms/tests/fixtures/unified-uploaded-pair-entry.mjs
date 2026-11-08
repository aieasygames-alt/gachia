import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { mock } from 'node:test';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';

const productionURL = new URL('../../src/unified-production.ts', import.meta.url).href;
const production = await import(productionURL);
let capture;
const sentinel = new Error('isolated production boundary');
mock.module(productionURL, { namedExports: { ...production, createUnifiedProductionVerifier: async (...args) => {
  capture = args; throw sentinel;
} } });
const { createUnifiedUploadedPairVerifier } = await import('../../src/unified-uploaded-pair-completion.ts');

for (const fault of ['none', 'changed-production', 'changed-old-handoff', 'missing-old-handoff']) {
  test(`uploaded pair fixed entry binds fresh observations without replacing original inputs: ${fault}`, async t => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'pair-entry-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const save = (name, value) => {
      const file = path.join(root, name), raw = JSON.stringify(value); writeFileSync(file, raw); return { path: file, pin: digest(raw) };
    };
    const old = save('old.json', { old: true }), fresh = save('fresh.json', { new: true });
    const original = { schemaVersion: 1, kind: 'unified_production_preview_request', repo: root,
      localPreview: old, editorial: old, selection: old, active: old, application: old, sourceHandoff: old,
      preservation: old, sourceRunID: 1, executorRunID: 2 };
    const selected = save('production.json', original), before = readFileSync(selected.path);
    const request = { schemaVersion: 1, kind: 'unified_uploaded_pair_completion_request', production: selected, sourceHandoff: fresh,
      network: old, originExecutorCommit: 'b'.repeat(40), executorRunID: 3,
      stopped: { journal: old, recovery: { http: old, module: old, version: old }, candidate: { http: old, module: old, version: old } } };
    if (fault === 'changed-production') writeFileSync(selected.path, '{}');
    if (fault === 'changed-old-handoff') writeFileSync(old.path, '{}');
    if (fault === 'missing-old-handoff') rmSync(old.path);
    capture = undefined;
    await assert.rejects(createUnifiedUploadedPairVerifier({ request, cmsToken: 'cms', cloudToken: 'cloud' }), error => {
      if (fault === 'none') assert.equal(error, sentinel);
      else assert.notEqual(error, sentinel);
      return true;
    });
    if (fault !== 'none') { assert.equal(capture, undefined); return; }
    assert.deepEqual(capture[0], { ...original, sourceHandoff: fresh, executorRunID: 3 });
    assert.deepEqual(capture[2], { originExecutor: { commit: request.originExecutorCommit, runID: 2 } });
    assert.deepEqual(readFileSync(selected.path), before);
    assert.deepEqual(request.production, selected); assert.equal(original.executorRunID, 2);
  });
}
