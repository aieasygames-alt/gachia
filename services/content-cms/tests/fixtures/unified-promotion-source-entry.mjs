import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { mock } from 'node:test';
import { digest } from '../../../../scripts/desktop-release-assets.mjs';

const productionURL = new URL('../../src/unified-production.ts', import.meta.url).href;
const production = await import(productionURL);
let capture, boundary;
mock.module(productionURL, { namedExports: { ...production, createUnifiedProductionVerifier: async (...args) => {
  capture = structuredClone(args); return boundary();
} } });
const { openUnifiedPromotion } = await import('../../src/unified-promotion.ts');

for (const fault of ['none', 'caller-mutation', 'changed-proof', 'changed-production']) test(`promotion entry captures explicit fresh source: ${fault}`, async t => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'promotion-source-entry-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const save = (name, value) => { const file = path.join(root, name), raw = JSON.stringify(value); writeFileSync(file, raw); return { path: file, pin: digest(raw) }; };
  const active = save('active.json', []), previous = save('previous.json', {});
  const original = { schemaVersion: 1, kind: 'unified_next_batch_baseline', status: 'published_A_freshly_observed',
    active, previous, publication: active, sourceIndex: previous, releaseKey: 'a'.repeat(64), planSHA256: 'b'.repeat(64) };
  const old = save('old.json', original), fresh = save('fresh.json', { ...original, observation: { startedAt: Date.now() } });
  const selected = { schemaVersion: 1, kind: 'unified_production_preview_request', repo: root,
    localPreview: active, editorial: active, selection: active, active, application: active, sourceHandoff: old, sourceRunID: 1, executorRunID: 2 };
  const proof = save('production.json', selected), before = readFileSync(proof.path);
  const audit = save('audit.json', { requestPin: proof.pin, status: 'production_preview_preflight_passed_no_upload',
    scopeClosureRequired: false, productionPromoted: false, ownerOrder: ['main'], executorCI: { runID: 2, commit: 'b'.repeat(40), status: 'full_exact_ci_passed' } });
  const request = { schemaVersion: 1, kind: 'unified_main_promotion_request', production: proof, audit,
    previews: active, network: active, executorRunID: 3, sourceHandoff: structuredClone(fresh) };
  const sentinel = Error('verified fixed source boundary');
  capture = undefined;
  boundary = () => {
    if (fault === 'caller-mutation') request.sourceHandoff.pin = '0'.repeat(64);
    if (fault === 'changed-proof') { writeFileSync(fresh.path, '{}'); return {}; }
    if (fault === 'changed-production') { writeFileSync(proof.path, '{}'); return {}; }
    throw sentinel;
  };
  await assert.rejects(openUnifiedPromotion({ request, cmsToken: 'cms', cloudToken: 'cloud' }), error => {
    if (['none', 'caller-mutation'].includes(fault)) assert.equal(error, sentinel);
    else assert.notEqual(error, sentinel);
    return true;
  });
  assert.deepEqual(capture[0], { ...selected, executorRunID: 3, sourceHandoff: fresh });
  assert.deepEqual(capture[2], { originExecutor: { runID: 2, commit: 'b'.repeat(40) } });
  if (fault !== 'changed-production') assert.deepEqual(readFileSync(proof.path), before);
});
