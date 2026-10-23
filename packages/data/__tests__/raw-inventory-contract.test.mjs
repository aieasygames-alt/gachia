import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { RAW_REVIEW_LEDGER, checkRawInventory, rawRecordChanges, rawSemanticHash, verifyRawInventory } from '../scripts/raw-inventory-contract.mjs';

const roots = [];
const SOURCE = 'packages/data/games';
const MIRROR = 'apps/web/public/data';
const pair = 'pilot/raw-guides.json';
const only = 'pilot/raw-character-summaries.json';
const before = [{ id: 'one', title: 'Existing', nested: { value: 1, other: 2 } }];
const after = [{ ...before[0], title: 'Unverified update' }, { id: 'two', title: 'New' }];
async function put(root, path, value) {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), `${JSON.stringify(value)}\n`);
}
async function fixture({ pending = true } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'raw-inventory-'));
  roots.push(root);
  const ledger = { schemaVersion: 1, pairs: [pair], sourceOnly: [{ path: only, reason: 'Compact source input' }],
    pending: pending ? [{ path: pair, status: 'needs_review', sourceSha256: rawSemanticHash(after), mirrorSha256: rawSemanticHash(before),
      changes: rawRecordChanges(after, before), reason: 'Scope not established', reviewDocument: 'plans/review.md' }] : [] };
  await put(root, `${SOURCE}/${pair}`, pending ? after : before);
  await put(root, `${MIRROR}/${pair}`, before);
  await put(root, `${SOURCE}/${only}`, before);
  await put(root, RAW_REVIEW_LEDGER, ledger);
  await put(root, 'plans/review.md', 'A bounded pending review, not factual approval.');
  return { root, ledger };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

it('checks all committed pairs and does not confuse containment with approval', async () => {
  const result = await verifyRawInventory();
  expect(result).toMatchObject({ pairs: 90, equal: 90, sourceOnly: 5, issues: [], engineeringReady: true, contentReleaseReady: false });
  expect(result.pending).toEqual([]);
  expect(result.holds.map(row => row.path)).toEqual(['roco/raw-characters.json', 'roco/raw-guides.json']);

  await expect(verifyRawInventory(undefined, { release: true })).rejects.toThrow('2 factual holds');
});
it('allows bounded engineering with pending content but blocks release without writing anything', async () => {
  const { root } = await fixture();
  const original = await readFile(resolve(root, RAW_REVIEW_LEDGER), 'utf8');
  expect(await verifyRawInventory(root)).toMatchObject({ engineeringReady: true, contentReleaseReady: false });
  await expect(verifyRawInventory(root, { release: true })).rejects.toThrow('Main content release blocked');
  expect(await readFile(resolve(root, RAW_REVIEW_LEDGER), 'utf8')).toBe(original);
  expect(JSON.parse(await readFile(resolve(root, `${MIRROR}/${pair}`), 'utf8'))).toEqual(before);
});
it('allows an explicitly resolved equal inventory, without claiming factual approval', async () => {
  const { root } = await fixture({ pending: false });
  expect(await verifyRawInventory(root, { release: true })).toMatchObject({ contentReleaseReady: true, factualApproval: 'not_implied_by_mirror_equality' });
});
async function heldFixture() {
  const result = await fixture({ pending: false });
  result.ledger.holds = [{ path: pair, status: 'needs_review', sourceSha256: rawSemanticHash(before), mirrorSha256: rawSemanticHash(before),
    reason: 'Equal mirrors still contain unverified claims', reviewDocument: 'plans/review.md' }];
  await put(result.root, RAW_REVIEW_LEDGER, result.ledger);
  return result;
}
it('keeps an equal factual hold engineering-readable but not release-ready, without rewriting evidence', async () => {
  const { root } = await heldFixture();
  const original = await readFile(resolve(root, RAW_REVIEW_LEDGER), 'utf8');
  expect(await verifyRawInventory(root)).toMatchObject({ equal: 1, pending: [], engineeringReady: true, contentReleaseReady: false });
  await expect(verifyRawInventory(root, { release: true })).rejects.toThrow('1 factual holds');
  expect(await readFile(resolve(root, RAW_REVIEW_LEDGER), 'utf8')).toBe(original);
});
it('rejects simultaneous source and mirror changes under a factual hold even when still equal', async () => {
  const { root } = await heldFixture();
  for (const directory of [SOURCE, MIRROR]) await put(root, `${directory}/${pair}`, after);
  await expect(verifyRawInventory(root)).rejects.toThrow('held content changed since review');
});
it.each(['duplicate', 'path', 'status', 'source-hash', 'mirror-hash', 'reason', 'document', 'missing-document', 'not-array'])('rejects invalid factual hold: %s', async kind => {
  const { root, ledger } = await heldFixture();
  const hold = ledger.holds[0];
  if (kind === 'duplicate') ledger.holds.push({ ...hold });
  if (kind === 'path') hold.path = only;
  if (kind === 'status') hold.status = 'approved';
  if (kind === 'source-hash') hold.sourceSha256 = 'bad';
  if (kind === 'mirror-hash') hold.mirrorSha256 = 'bad';
  if (kind === 'reason') hold.reason = '';
  if (kind === 'document') hold.reviewDocument = '../secret.md';
  if (kind === 'missing-document') await rm(resolve(root, 'plans/review.md'));
  if (kind === 'not-array') ledger.holds = {};
  await put(root, RAW_REVIEW_LEDGER, ledger);
  await expect(verifyRawInventory(root)).rejects.toThrow(/Invalid|review document/);
});
it.each([SOURCE, MIRROR])('blocks changed pending bytes semantically on %s', async directory => {
  const { root } = await fixture();
  await put(root, `${directory}/${pair}`, [{ id: 'one', title: 'Third version' }]);
  await expect(verifyRawInventory(root)).rejects.toThrow('changed since review');
});
it.each([SOURCE, MIRROR])('blocks silent synchronization toward %s', async directory => {
  const { root } = await fixture();
  await put(root, `${directory}/${pair}`, directory === SOURCE ? before : after);
  await expect(verifyRawInventory(root)).rejects.toThrow('silently synchronized');
});
it('rejects newly introduced drift in a formerly equal pair', async () => {
  const { root } = await fixture({ pending: false });
  await put(root, `${SOURCE}/${pair}`, after);
  await expect(verifyRawInventory(root)).rejects.toThrow('unreviewed drift');
});
it('rejects deletion of both sides rather than silently shrinking the inventory', async () => {
  const { root } = await fixture();
  for (const directory of [SOURCE, MIRROR]) await rm(resolve(root, directory, pair));
  const result = await checkRawInventory(root);
  expect(result.issues).toContain(`missing source: ${pair}`);
  expect(result.issues).toContain(`missing mirror: ${pair}`);
});
it.each([SOURCE, MIRROR])('rejects unregistered or orphan raw files under %s', async directory => {
  const { root } = await fixture();
  await put(root, `${directory}/pilot/raw-extra.json`, []);
  await expect(verifyRawInventory(root)).rejects.toThrow('unregistered');
});
it('requires explicit registration of even an equal new pair', async () => {
  const { root } = await fixture();
  for (const directory of [SOURCE, MIRROR]) await put(root, `${directory}/pilot/raw-extra.json`, []);
  await expect(verifyRawInventory(root)).rejects.toThrow('unregistered');
});
it.each([`${SOURCE}/${only}`, `${MIRROR}/${pair}`])('rejects missing or malformed input %s', async path => {
  const { root } = await fixture();
  await writeFile(resolve(root, path), '{');
  await expect(verifyRawInventory(root)).rejects.toThrow('invalid JSON');
  await rm(resolve(root, path));
  await expect(verifyRawInventory(root)).rejects.toThrow('missing');
});
it('does not silently publish source-only compact files as raw mirrors', async () => {
  const { root } = await fixture();
  await put(root, `${MIRROR}/${only}`, before);
  await expect(verifyRawInventory(root)).rejects.toThrow('unregistered mirror');
});
it('ignores whitespace and object key ordering but not array ordering', async () => {
  const { root } = await fixture();
  const reordered = [{ title: 'Existing', nested: { other: 2, value: 1 }, id: 'one' }];
  await writeFile(resolve(root, MIRROR, pair), JSON.stringify(reordered, null, 4));
  expect(rawSemanticHash(reordered)).toBe(rawSemanticHash(before));
  await expect(verifyRawInventory(root)).resolves.toHaveProperty('engineeringReady', true);
  await put(root, `${SOURCE}/${pair}`, [...after].reverse());
  await expect(verifyRawInventory(root)).rejects.toThrow('changed since review');
});
it('binds the reviewed entity/field diff as well as document hashes', async () => {
  const { root, ledger } = await fixture();
  ledger.pending[0].changes[0].fields = ['invented'];
  await put(root, RAW_REVIEW_LEDGER, ledger);
  await expect(verifyRawInventory(root)).rejects.toThrow('changed since review');
});
it('requires a readable review document and rejects links outside the plans directory', async () => {
  const { root, ledger } = await fixture();
  await rm(resolve(root, 'plans/review.md'));
  await expect(verifyRawInventory(root)).rejects.toThrow('review document');
  ledger.pending[0].reviewDocument = '../private.md';
  await put(root, RAW_REVIEW_LEDGER, ledger);
  await expect(verifyRawInventory(root)).rejects.toThrow('Invalid pending');
});
it.each(['duplicate', 'traversal', 'status', 'hash', 'reason', 'source-only-pending'])('rejects invalid ledger: %s', async kind => {
  const { root, ledger } = await fixture();
  if (kind === 'duplicate') ledger.pairs.push(pair);
  if (kind === 'traversal') ledger.pairs[0] = '../raw-secret.json';
  if (kind === 'status') ledger.pending[0].status = 'confirmed';
  if (kind === 'hash') ledger.pending[0].sourceSha256 = 'invalid';
  if (kind === 'reason') ledger.sourceOnly[0].reason = '';
  if (kind === 'source-only-pending') ledger.pending[0].path = only;
  await put(root, RAW_REVIEW_LEDGER, ledger);
  await expect(verifyRawInventory(root)).rejects.toThrow(/Invalid/);
});
it('rejects raw file and game directory symlinks', async () => {
  const { root } = await fixture();
  const path = resolve(root, MIRROR, pair);
  await rm(path);
  await symlink(resolve(root, SOURCE, pair), path);
  await expect(verifyRawInventory(root)).rejects.toThrow('Invalid raw inventory file');
  await rm(path);
  await put(root, `${MIRROR}/${pair}`, before);
  await symlink(resolve(root, SOURCE, 'pilot'), resolve(root, MIRROR, 'alias'));
  await expect(verifyRawInventory(root)).rejects.toThrow('Symlink');
});
it('reports added, removed and changed fields, and rejects ambiguous record identities', () => {
  expect(rawRecordChanges([{ id: 'new' }, { id: 'kept', a: 2 }], [{ id: 'removed' }, { id: 'kept', a: 1, b: true }])).toEqual([
    { id: 'kept', kind: 'changed', fields: ['a', 'b'] },
    { id: 'new', kind: 'source-only', fields: ['id'] },
    { id: 'removed', kind: 'mirror-only', fields: ['id'] },
  ]);
  for (const value of [{}, [null], [{ id: '' }], [{ id: 'one' }, { id: 'one' }]]) expect(() => rawRecordChanges(value, [])).toThrow();
});
