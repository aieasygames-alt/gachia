import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { afterEach, expect, it } from 'vitest';
import { checkRocoPublication, ROCO_WITHDRAWAL_ARCHIVE, ROCO_WITHDRAWAL_RECORD } from '../scripts/roco-publication-contract.mjs';
import { rawSemanticHash } from '../scripts/raw-inventory-contract.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const roots = [];
const json = async path => JSON.parse(await readFile(path, 'utf8'));
async function put(root, path, value) {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), JSON.stringify(value));
}
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'roco-withdrawal-')); roots.push(root);
  const record = await json(resolve(ROOT, ROCO_WITHDRAWAL_RECORD));
  const ledger = { pairs: record.resolutions.map(row => row.path), holds: [], pending: [] };
  for (const path of [ROCO_WITHDRAWAL_ARCHIVE, ROCO_WITHDRAWAL_RECORD, record.reviewDocument]) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await cp(resolve(ROOT, path), resolve(root, path), { recursive: true });
  }
  const documents = new Map();
  for (const item of record.resolutions) for (const prefix of ['packages/data/games', 'apps/web/public/data']) {
    documents.set(`${prefix}/${item.path}`, await json(resolve(ROOT, prefix, item.path)));
  }
  return { root, record, ledger, documents, semanticHash: rawSemanticHash };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

it('permits only the explicit withdrawal of both holds, not official factual approval', async () => {
  const f = await fixture();
  expect(await checkRocoPublication(f.root, f)).toEqual({ decision: 'withdrawn_not_verified', resolved: f.ledger.pairs, officialFactsApproved: false, archivedImages: 3 });
});

it.each(['missing-record', 'false-approval', 'missing-resolution', 'duplicate-resolution', 'hold-conflict', 'pending-conflict',
  'hash-rebaseline', 'archive-traversal', 'archive-tamper', 'archive-ledger-tamper', 'archive-ledger-reason', 'archive-link', 'missing-review',
  'source-change', 'mirror-change', 'equal-change', 'unverified-name-even-rehashed', 'image-restore', 'image-tamper', 'image-rebaseline', 'missing-image-evidence', 'new-image', 'image-alias'])('rejects withdrawal regression: %s', async kind => {
  const f = await fixture();
  const first = f.record.resolutions[0];
  const charKey = 'packages/data/games/roco/raw-characters.json';
  if (kind === 'missing-record') await rm(resolve(f.root, ROCO_WITHDRAWAL_RECORD));
  if (kind === 'false-approval') f.record.decision = 'verified';
  if (kind === 'missing-resolution') f.record.resolutions.pop();
  if (kind === 'duplicate-resolution') f.record.resolutions[1] = { ...first };
  if (kind === 'hold-conflict') f.ledger.holds.push({ path: first.path });
  if (kind === 'pending-conflict') f.ledger.pending.push({ path: first.path });
  if (kind === 'hash-rebaseline') first.previousHoldSha256 = '0'.repeat(64);
  if (kind === 'archive-traversal') first.archive = '../characters.json';
  if (kind === 'archive-tamper') await put(f.root, first.archive, [{ id: 'invented' }]);
  if (kind === 'archive-ledger-tamper') await put(f.root, `${ROCO_WITHDRAWAL_ARCHIVE}/ledger.json`, { holds: [] });
  if (kind === 'archive-ledger-reason') {
    const path = `${ROCO_WITHDRAWAL_ARCHIVE}/ledger.json`;
    const ledger = await json(resolve(f.root, path)); ledger.holds[0].reason = 'Rewritten history'; await put(f.root, path, ledger);
  }
  if (kind === 'archive-link') { await rm(resolve(f.root, first.archive)); await symlink(resolve(ROOT, first.archive), resolve(f.root, first.archive)); }
  if (kind === 'missing-review') await rm(resolve(f.root, f.record.reviewDocument));
  if (['source-change', 'equal-change', 'unverified-name-even-rehashed'].includes(kind)) f.documents.get(charKey)[0].name = 'Unverified identity';
  if (['mirror-change', 'equal-change'].includes(kind)) f.documents.get('apps/web/public/data/roco/raw-characters.json')[0].name = 'Unverified identity';
  if (kind === 'unverified-name-even-rehashed') {
    f.documents.set('apps/web/public/data/roco/raw-characters.json', f.documents.get(charKey));
    first.activeSha256 = rawSemanticHash(f.documents.get(charKey));
  }
  if (kind === 'image-restore') {
    const target = resolve(f.root, 'apps/web/public', f.record.assets[0].path);
    await mkdir(dirname(target), { recursive: true }); await cp(resolve(f.root, f.record.assets[0].archive), target);
  }
  if (kind === 'image-tamper') await writeFile(resolve(f.root, f.record.assets[0].archive), 'changed');
  if (kind === 'image-rebaseline') {
    await writeFile(resolve(f.root, f.record.assets[0].archive), 'changed');
    f.record.assets[0].sha256 = createHash('sha256').update('changed').digest('hex');
  }
  if (kind === 'missing-image-evidence') f.record.assets.pop();
  if (kind === 'new-image') await put(f.root, 'apps/web/public/images/roco/characters/new.webp', 'unreviewed');
  if (kind === 'image-alias') {
    await mkdir(resolve(f.root, 'apps/web/public'), { recursive: true });
    await cp(resolve(f.root, f.record.assets[0].archive), resolve(f.root, 'apps/web/public/unreviewed.webp'));
  }
  if (kind !== 'missing-record') await put(f.root, ROCO_WITHDRAWAL_RECORD, f.record);
  await expect(checkRocoPublication(f.root, f)).rejects.toThrow();
});

it('requires guide scope and dates even after an intentional active hash update', async () => {
  const f = await fixture();
  const guides = f.documents.get('packages/data/games/roco/raw-guides.json');
  guides[0].contentReview.status = 'verified';
  f.documents.set('apps/web/public/data/roco/raw-guides.json', guides);
  f.record.resolutions[1].activeSha256 = rawSemanticHash(guides);
  await put(f.root, ROCO_WITHDRAWAL_RECORD, f.record);
  await expect(checkRocoPublication(f.root, f)).rejects.toThrow('publication scope changed');
});
