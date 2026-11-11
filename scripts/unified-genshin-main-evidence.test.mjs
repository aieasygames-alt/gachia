import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { digest } from './desktop-release-assets.mjs';
import { genshinMainFixture as fixture, pairUUID } from './fixtures/unified-genshin-main-fixture.mjs';
import { readUnifiedCompletedGenshinMainPromotion as readCompleted, readUnifiedGenshinMainPromotionJournal } from './unified-genshin-main-evidence.mjs';

const owners = ['genshin', 'main'], roles = ['recovery', 'candidate'], json = value => JSON.stringify(value, null, 2) + '\n';
const load = file => JSON.parse(readFileSync(file));
const journalRows = f => readFileSync(f.journalFile, 'utf8').trimEnd().split('\n').map(JSON.parse);
function receipt(f, edit) {
  const value = load(f.input.proof.path); edit(value); f.input.proof = f.save(f.input.proof.path, value);
}
function journal(f, edit) {
  const rows = journalRows(f); edit(rows);
  const bytes = rows.map(JSON.stringify).join('\n') + '\n'; writeFileSync(f.journalFile, bytes);
  receipt(f, value => { value.journalPin = digest(bytes); });
}
function renewal(f, edit) {
  const file = join(f.renewalDirectory, 'receipt.json'), value = load(file); edit(value);
  const proof = f.save(file, value);
  journal(f, rows => { for (const row of rows) row.renewalPin = proof.pin; rows[0].accepted = value.accepted; });
  receipt(f, value => { value.renewalPin = proof.pin; });
}
function remote(f, edit) {
  const file = join(f.directory, 'remote-0.json'), value = load(file); edit(value); const proof = f.save(file, value);
  journal(f, rows => { rows[1].proof = { ...value, evidenceSHA256: proof.pin }; });
}
function publicProof(f, edit) {
  const file = join(f.directory, 'public-acceptance.json'), value = load(file); edit(value); const proof = f.save(file, value);
  journal(f, rows => { rows.at(-1).proof = { ...value, evidenceSHA256: proof.pin }; });
  receipt(f, receipt => { receipt.publicProof = { ...value, evidenceSHA256: proof.pin }; });
}
function publicHTTP(f, owner, edit) {
  const file = join(f.directory, 'public', owner, 'result.json'), value = load(file); edit(value); const proof = f.save(file, value);
  publicProof(f, value => { value.owners[owner].evidenceSHA256 = proof.pin; });
}
function deployment(f, owner, kind, edit) {
  const file = join(f.directory, `deployment-${owner}-${kind}`), body = load(file + '.body'), metadata = load(file + '.json');
  edit(body, metadata); const bytes = Buffer.from(json(body)); writeFileSync(file + '.body', bytes);
  f.save(file + '.json', { ...metadata, sha256: digest(bytes), bytes: bytes.length });
  journal(f, rows => { rows[3 + owners.indexOf(owner) * 2].result.responses[kind] = { status: metadata.status, sha256: digest(bytes), bytes: bytes.length }; });
}

// Restore an isolated synthetic run between mutations, not a repository or live
// evidence chain. This avoids rebuilding identical multipart/HTML fixtures.
async function tamperCases(t, cases) {
  const f = await fixture(t); assert.ifError(f.failure);
  const files = new Map();
  const walk = directory => { for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name); if (entry.isDirectory()) walk(file); else files.set(file, readFileSync(file));
  } }; walk(f.input.run);
  const { references, ...serial } = f.input, original = structuredClone(serial);
  for (const [name, edit] of Object.entries(cases)) await t.test(name, async () => {
    f.input = { ...structuredClone(original), references };
    for (const [file, bytes] of files) writeFileSync(file, bytes);
    await edit(f); await assert.rejects(readCompleted(f.input), undefined, name);
  });
}

test('completed pair independently reopens four immutable versions, exact deployments and two public evidence sets offline', async t => {
  const f = await fixture(t); assert.ifError(f.failure);
  let calls = 0; t.mock.method(globalThis, 'fetch', async () => { calls++; throw Error('Historical completion must remain offline'); });
  const opened = await readCompleted(f.input);
  assert.equal(calls, 0); assert.deepEqual(Object.keys(opened.modules), owners);
  for (const owner of owners) {
    assert.deepEqual(Object.keys(opened.modules[owner]), roles);
    assert.equal(opened.deployments[owner].versionId, f.input.previews.receipt.accepted.candidate[owner].versionId);
    assert.equal(opened.publicHTTP[owner].observations.length, f.input.publicReferences[owner].length);
  }
  for (const name of ['currentCMSRead', 'currentCloudRead', 'freshnessRenewed', 'sourceAdvanced', 'productionReady']) assert.equal(opened[name], false);
  const now = Date.now(); t.mock.method(Date, 'now', () => now + 86400000);
  const old = await readCompleted(f.input); assert.equal(old.freshnessRenewed, false);
  assert(old.renewal.receipt.accepted.candidate.genshin.acceptedAt < Date.now() - 900000);
});

test('all four upload-time modules, version metadata, runtime config and preview responses are required', async t => {
  const cases = {};
  for (const owner of owners) for (const role of roles) {
    const root = f => join(f.input.previews.directory, `${role}-${owner}`);
    cases[`${owner}/${role} module receipt`] = f => writeFileSync(f.input.previews.receipt.accepted[role][owner].moduleProof.path, '{}');
    cases[`${owner}/${role} version`] = f => writeFileSync(join(root(f), 'version.json'), '{}');
    cases[`${owner}/${role} HTTP body`] = f => writeFileSync(join(root(f), 'http/0.body'), 'changed');
    cases[`${owner}/${role} renewal body`] = f => writeFileSync(join(f.renewalDirectory, `${role}-${owner}/0.body`), 'changed');
  }
  for (const owner of owners) cases[`${owner} runtime configuration`] = f => { f.input.runtimeConfigs[owner].compatibility_date = '2020-01-01'; };
  cases['Main-only preview continuation'] = f => {
    const file = join(f.input.previews.directory, 'receipt.json'), value = load(file); value.kind = 'unified_readonly_preview_completion';
    f.input.previews.pin = f.save(file, value).pin;
  };
  cases['preview receipt pin'] = f => { f.input.previews.pin = 'c'.repeat(64); };
  await tamperCases(t, cases);
});

test('repinned journals cannot omit, reorder, substitute or silently reconcile an owner', async t => {
  const cases = {
    'missing second write': f => journal(f, rows => { rows.splice(4, 2); }),
    'duplicated first owner': f => journal(f, rows => { rows[4].owner = rows[5].owner = 'genshin'; }),
    'Main first': f => journal(f, rows => { [rows[2], rows[4]] = [rows[4], rows[2]]; [rows[3], rows[5]] = [rows[5], rows[3]]; }),
    'wrong version': f => journal(f, rows => { rows[4].versionId = pairUUID(999); }),
    'wrong service': f => journal(f, rows => { rows[5].service = 'gachia-game-genshin'; }),
    'wrong order': f => journal(f, rows => { rows[0].ownerOrder.reverse(); }),
    'changed baseline': f => journal(f, rows => { rows[0].baseline.routes.push({ pattern: 'unapproved' }); }),
    'stopped': f => journal(f, rows => { rows.at(-1).phase = 'stopped'; }),
    'read-only reconcile suffix': f => journal(f, rows => { rows.push({ ...rows.at(-1), phase: 'read_only_reconciliation' }); }),
    'changed preview pin': f => journal(f, rows => { rows[2].previewPin = 'c'.repeat(64); }),
    'changed handoff': f => journal(f, rows => { rows[3].sourceHandoff = { path: '/wrong', pin: 'c'.repeat(64) }; }),
    'missing policy': f => journal(f, rows => { delete rows[5].freshnessPolicy; }),
    'unknown policy': f => journal(f, rows => { for (const row of rows) row.freshnessPolicy = 'skip'; }),
    'missing authorization': f => journal(f, rows => { delete rows[4].writeAuthorization; }),
    'authorization on promoted': f => journal(f, rows => { rows[5].writeAuthorization = rows[4].writeAuthorization; }),
    'authorization timestamp': f => journal(f, rows => { rows[4].writeAuthorization.authorizedAt++; }),
    'future source': f => journal(f, rows => { rows[4].writeAuthorization.identityObservedAt = Date.now() + 86400000; }),
    'backwards source': f => journal(f, rows => { rows[4].writeAuthorization.identityObservedAt = rows[2].writeAuthorization.identityObservedAt - 1; }),
    'backwards chronology': f => journal(f, rows => { rows[5].at = new Date(Date.parse(rows[4].at) - 1).toISOString(); }),
    'missing newline': f => { writeFileSync(f.journalFile, readFileSync(f.journalFile, 'utf8').trimEnd()); receipt(f, value => { value.journalPin = digest(readFileSync(f.journalFile)); }); },
  };
  await tamperCases(t, cases);
});

test('renewals retain every immutable identity and must be fresh at both owner writes', async t => {
  const cases = {};
  for (const owner of owners) for (const role of roles) {
    cases[`${owner}/${role} omitted`] = f => renewal(f, value => { delete value.accepted[role][owner]; });
    cases[`${owner}/${role} version swapped`] = f => renewal(f, value => { value.accepted[role][owner].versionId = pairUUID(999); });
    cases[`${owner}/${role} module proof changed`] = f => renewal(f, value => { value.accepted[role][owner].moduleProof.pin = 'c'.repeat(64); });
    cases[`${owner}/${role} original evidence changed`] = f => renewal(f, value => { value.accepted[role][owner].originalEvidenceSHA256 = 'c'.repeat(64); });
    cases[`${owner}/${role} future acceptance`] = f => renewal(f, value => { value.accepted[role][owner].acceptedAt = Date.now() + 86400000; });
  }
  cases['changed renewal kind'] = f => renewal(f, value => { value.kind = 'unified_main_preview_renewal'; });
  cases['extra owner'] = f => renewal(f, value => { value.accepted.candidate.hi3 = value.accepted.candidate.main; });
  cases['stale exactly at second write'] = f => {
    const rows = journalRows(f), at = Math.max(...roles.flatMap(role => owners.map(owner => rows[0].accepted[role][owner].acceptedAt))) + 900000;
    t.mock.method(Date, 'now', () => at + 1000);
    journal(f, rows => {
      for (const row of rows.slice(4)) row.at = new Date(at).toISOString();
      rows[4].writeAuthorization = { authorizedAt: at, identityObservedAt: at - 1 };
    });
    receipt(f, value => { value.writeAuthorizations.main = journalRows(f)[4].writeAuthorization; });
  };
  await tamperCases(t, cases);
});

test('source age cutoff is checked at each write while long post-write acceptance does not renew authorization', async t => {
  const f = await fixture(t); assert.ifError(f.failure);
  const start = Date.parse(journalRows(f)[4].at), future = start + 1800000;
  t.mock.method(Date, 'now', () => future);
  journal(f, rows => { rows.at(-1).at = new Date(future).toISOString(); });
  assert.equal((await readCompleted(f.input)).freshnessRenewed, false);
  const original = journalRows(f);
  for (const owner of owners) {
    const rows = structuredClone(original), index = owner === 'genshin' ? 2 : 4;
    const at = rows[index].writeAuthorization.identityObservedAt + 900000;
    for (const row of rows.slice(index, -1)) row.at = new Date(at).toISOString();
    rows[index].writeAuthorization.authorizedAt = at;
    const bytes = rows.map(JSON.stringify).join('\n') + '\n'; writeFileSync(f.journalFile, bytes);
    assert.throws(() => readUnifiedGenshinMainPromotionJournal({ run: f.input.run, pin: digest(bytes), value: f.input.value, previewPin: f.input.previews.pin }), /expired|backwards/);
  }
});

test('exact deployment response evidence cannot be repinned to another ID, service or allocation', async t => {
  const cases = {};
  for (const owner of owners) for (const kind of ['creation', 'verification']) {
    cases[`${owner}/${kind} body`] = f => writeFileSync(join(f.directory, `deployment-${owner}-${kind}.body`), '{}');
    cases[`${owner}/${kind} ID`] = f => deployment(f, owner, kind, body => { body.result.id = pairUUID(999); });
    cases[`${owner}/${kind} allocation`] = f => deployment(f, owner, kind, body => { body.result.versions[0].percentage = 50; });
    cases[`${owner}/${kind} version`] = f => deployment(f, owner, kind, body => { body.result.versions[0].version_id = pairUUID(999); });
    cases[`${owner}/${kind} HTTP error`] = f => deployment(f, owner, kind, (_body, metadata) => { metadata.status = 503; });
    cases[`${owner}/${kind} metadata owner`] = f => deployment(f, owner, kind, (_body, metadata) => { metadata.owner = owner === 'main' ? 'genshin' : 'main'; });
  }
  for (const owner of owners) cases[`${owner} deployed service`] = f => journal(f, rows => { rows[3 + owners.indexOf(owner) * 2].result.service = 'other'; });
  await tamperCases(t, cases);
});

test('remote immutable coverage and both public evidence sets remain mandatory after repinning', async t => {
  const cases = {
    'missing remote owner': f => remote(f, value => { value.observed.pop(); }),
    'reordered remote roles': f => remote(f, value => { value.observed.reverse(); }),
    'remote module hash': f => remote(f, value => { value.observed[0].moduleSHA256 = 'c'.repeat(64); }),
    'remote module proof': f => remote(f, value => { value.observed[3].moduleProof.pin = 'c'.repeat(64); }),
    'remote immutable metadata': f => remote(f, value => { value.observed[2].version.number++; }),
    'remote candidate allocation': f => remote(f, value => { value.versions.gachia = pairUUID(999); }),
    'remote recovery allocation': f => remote(f, value => { value.recoveryVersions['gachia-game-genshin'] = pairUUID(999); }),
  };
  for (const owner of owners) {
    cases[`${owner} public missing`] = f => rmSync(join(f.directory, 'public', owner, '0.body'));
    cases[`${owner} public body`] = f => writeFileSync(join(f.directory, 'public', owner, '0.body'), 'changed');
    cases[`${owner} public owner omitted`] = f => publicProof(f, value => { delete value.owners[owner]; });
    cases[`${owner} public wrong directory`] = f => publicProof(f, value => { value.owners[owner].directory = f.directory; });
    cases[`${owner} public wrong kind`] = f => publicHTTP(f, owner, value => { value.kind = 'unified_main_public_http'; if (owner === 'main') value.kind = 'unified_genshin_public_http'; });
    cases[`${owner} public noindex`] = f => publicHTTP(f, owner, value => { value.observations[0].headers['x-robots-tag'] = 'noindex'; });
    cases[`${owner} public cookie`] = f => publicHTTP(f, owner, value => { value.observations[0].headers['set-cookie'] = 'session=wrong'; });
    cases[`${owner} public cache`] = f => publicHTTP(f, owner, value => { value.observations[0].headers['cache-control'] = 'public, max-age=3600'; });
    cases[`${owner} public coverage`] = f => publicHTTP(f, owner, value => { value.observations.pop(); });
  }
  await tamperCases(t, cases);
});

test('completion binds external reviewed request and verified exact CI identities without promoting qualification', async t => {
  const cases = {
    'receipt pin': f => { f.input.proof.pin = 'c'.repeat(64); },
    'Main completion kind': f => receipt(f, value => { value.kind = 'unified_publication_promotion'; }),
    'stopped receipt': f => receipt(f, value => { value.status = 'stopped'; }),
    'already advanced': f => receipt(f, value => { value.sourceAdvanced = true; }),
    'release mismatch': f => receipt(f, value => { value.releaseKey = 'c'.repeat(64); }),
    'wrong location': f => { f.input.proof = f.save(join(f.directory, 'moved.json'), load(f.input.proof.path)); },
    'request mismatch': f => { f.input.productionRequest.pin = 'c'.repeat(64); },
    'receipt authorization': f => receipt(f, value => { value.writeAuthorizations.main.authorizedAt++; }),
    'receipt missing owner authorization': f => receipt(f, value => { delete value.writeAuthorizations.genshin; }),
    'wrong receipt freshness': f => receipt(f, value => { value.freshnessPolicy = 'receipt-clock'; }),
    'wrong receipt versions': f => receipt(f, value => { delete value.versions['gachia-game-genshin']; }),
  };
  for (const name of ['sourceCI', 'originExecutorCI', 'executorCI']) {
    cases[`${name} identity`] = f => { f.input[name].commit = 'c'.repeat(40); };
    cases[`${name} verification`] = f => { f.input[name].status = 'not_verified'; };
  }
  await tamperCases(t, cases);
});

for (const fault of ['genshin-unknown', 'main-unknown', 'genshin-public', 'main-public']) test(`real protocol ${fault} cannot yield a completed pair or perform another write`, async t => {
  const f = await fixture(t, { fault }); assert(f.failure); assert.equal(f.receipt, undefined);
  const rows = journalRows(f); assert(rows.some(row => row.phase === 'stopped'));
  assert(rows.some(row => row.phase === 'read_only_reconciliation')); assert(!rows.some(row => row.phase === 'production_accepted'));
  assert.equal(rows.find(row => row.phase === 'stopped').automaticRollback, false);
  assert.equal(f.calls.filter(row => row.method === 'POST').length, fault === 'genshin-unknown' ? 1 : 2);
  assert.throws(() => readUnifiedGenshinMainPromotionJournal({ run: f.input.run, pin: digest(readFileSync(f.journalFile)), value: f.input.value, previewPin: f.input.previews.pin }), /Incomplete, stopped/);
});
