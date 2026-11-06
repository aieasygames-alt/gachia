import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { digest } from '../../src/legacy-intake.ts';
import { readPinnedUnifiedInput } from '../../src/unified-desktop.ts';
import { readUnifiedHistoricalPublication, unifiedHistoricalPublicationRequest } from '../../src/unified-historical-publication.ts';
import { readUnifiedHistoricalMain, unifiedHistoricalMainRequest } from '../../src/unified-published-main.ts';

// Opt-in local qualification against retained real evidence, not a CI fixture.
// Only small faulty requests are written; the original evidence is never edited.
const requestPath = process.env.UNIFIED_SEALED_HISTORY_REQUEST;
const requestPin = process.env.UNIFIED_SEALED_HISTORY_PIN;
assert(requestPath && path.isAbsolute(requestPath) && /^[a-f0-9]{64}$/.test(requestPin ?? ''),
  'Require UNIFIED_SEALED_HISTORY_REQUEST (absolute path) and UNIFIED_SEALED_HISTORY_PIN');
const request = unifiedHistoricalMainRequest(readPinnedUnifiedInput(requestPath, requestPin));
const history = unifiedHistoricalPublicationRequest(readPinnedUnifiedInput(request.history.path, request.history.pin));
const audit = readPinnedUnifiedInput(history.audit.path, history.audit.pin);
const production = readPinnedUnifiedInput(history.production.path, history.production.pin);

test('real sealed publication and exact previews reopen without replacement readers or network', async t => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'unified-sealed-history-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let networkAttempts = 0;
  t.mock.method(globalThis, 'fetch', () => {
    networkAttempts++;
    throw Error('Sealed historical qualification forbids network access');
  });
  const originals = [requestPath, request.history.path, request.previews.path, request.previewExecution.path,
    history.production.path, history.audit.path];
  const pins = originals.map(file => digest(readFileSync(file)));
  const save = (name, value) => {
    const file = path.join(root, name), raw = JSON.stringify(value, null, 2) + '\n';
    writeFileSync(file, raw, { flag: 'wx', mode: 0o600 });
    return { path: file, pin: digest(raw) };
  };
  const rejectAudit = async (name, mutate, message) => {
    const value = structuredClone(audit); mutate(value);
    await assert.rejects(readUnifiedHistoricalPublication({ ...history, audit: save(`${name}.json`, value) }), error => {
      assert.equal(error.code, 'ERR_ASSERTION');
      if (message) assert.match(error.message, message);
      return true;
    });
  };

  await t.test('complete real root and both exact previews preserve historical identities', async () => {
    const opened = await readUnifiedHistoricalMain(request);
    assert.equal(opened.historical.sealedSources.length, opened.historical.plan.sources.length);
    assert.deepEqual(Object.keys(opened.historical.sources.owners).sort(), ['azur-promilia', 'genshin', 'lvmeng', 'main', 'nte']);
    assert.equal(opened.historical.value.releaseKey, audit.releaseKey);
    assert.equal(opened.historical.review.records.length, 1);
    for (const field of ['currentCMSRead', 'currentCloudRead', 'freshnessRenewed', 'ciVerified']) assert.equal(opened[field], false);
    assert.equal(opened.historical.productionReady, false);
    for (const role of ['candidate', 'recovery']) {
      const accepted = opened.previews.receipt.accepted[role].main;
      assert(accepted.acceptedAt < Date.now() - 900000, 'This qualification requires expired historical evidence');
      assert(opened.publicReferences(role).length > 0);
    }
    t.diagnostic(JSON.stringify({ sources: opened.historical.sealedSources.length, releaseKey: opened.historical.value.releaseKey,
      previewPin: opened.previews.pin, versions: Object.fromEntries(['candidate', 'recovery'].map(role =>
        [role, opened.previews.receipt.accepted[role].main.versionId])), ciVerified: false, cloudWrites: false }));
  });

  for (const [field, value] of [['requestPin', '0'.repeat(64)], ['status', 'promoted'], ['scopeClosureRequired', true],
    ['productionPromoted', true], ['cloudWrites', true], ['ownerOrder', ['main', 'nte']]]) {
    await t.test(`repinned audit rejects ${field} before opening upstream evidence`, () => rejectAudit(field, row => { row[field] = value; }));
  }
  await t.test('repinned executor identity must match the production request', () =>
    rejectAudit('executor-run', row => { row.executorCI.runID++; }));
  await t.test('repinned release key is checked after the complete real upstream chain', () =>
    rejectAudit('release-key', row => { row.releaseKey = '0'.repeat(64); }, /Historical audit differs: releaseKey/));

  await t.test('repinned local preview cannot claim production authority', async () => {
    const preview = readPinnedUnifiedInput(production.localPreview.path, production.localPreview.pin);
    mkdirSync(path.join(root, 'preview'));
    const localPreview = save('preview/preview.json', { ...preview, productionReady: true });
    const changedProduction = save('production.json', { ...production, localPreview });
    const changedAudit = save('production-audit.json', { ...audit, requestPin: changedProduction.pin });
    await assert.rejects(readUnifiedHistoricalPublication({ ...history, production: changedProduction, audit: changedAudit }),
      error => error.code === 'ERR_ASSERTION');
  });

  await t.test('original evidence remains unchanged and no live requests occurred', () => {
    assert.deepEqual(originals.map(file => digest(readFileSync(file))), pins);
    assert.equal(networkAttempts, 0);
  });
});
