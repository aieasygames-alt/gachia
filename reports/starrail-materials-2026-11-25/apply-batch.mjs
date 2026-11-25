// Run from the configured local tools/payload-cms directory with Node 24 and --env-file=.env --import tsx.
// Uses Payload's Local API and version history. Does not write SQLite directly or synchronize the cloud.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getPayload } from '../../tools/payload-cms/node_modules/payload/dist/index.js';
import { parseStarRailUpdate } from '../../packages/data/cms/starrail-updates.ts';
import { parseStarRailPublication } from '../../packages/data/cms/starrail-publication.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];
assert(['prepare', 'publish'].includes(mode), 'Choose prepare or publish.');
assert.equal(await fs.realpath(process.cwd()), '/Users/robert/Documents/gachia/tools/payload-cms', 'Use the configured local CMS directory.');
const read = async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const write = async (name, value) => fs.writeFile(path.join(root, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const canonical = row => {
  const parsed = parseStarRailUpdate({ ...row, _status: 'published' });
  assert(parsed, `Invalid content: ${row.slug}`);
  return parsed;
};
const sorted = rows => rows.map(canonical).sort((a, b) => `${a.locale}:${a.slug}`.localeCompare(`${b.locale}:${b.slug}`));
const before = (await read('cms-before.json')).docs;
const batch = await read('batch.json');
const expected = sorted([...before.map(row => ({ ...row, ...(batch.updates.find(p => p.slug === row.slug)?.data || {}) })), ...batch.creates]);
assert(parseStarRailPublication({ revision: 1, docs: expected }));
assert.equal(expected.length, 46);
assert.equal(new Set(batch.updates.map(p => p.slug)).size, batch.updates.length);
assert(batch.updates.every(p => before.some(row => row.slug === p.slug)));

process.env.NODE_ENV = 'production';
const config = (await import(pathToFileURL(path.join(process.cwd(), 'payload.config.ts')).href)).default;
const payload = await getPayload({ config });
const publicRows = async () => {
  const rows = await payload.find({ collection: 'game-updates', limit: 151, draft: false, overrideAccess: false, sort: 'contentKey' });
  assert.equal(rows.hasNextPage, false);
  return rows.docs;
};
try {
  if (mode === 'prepare') {
    assert.deepEqual(sorted(await publicRows()), sorted(before), 'Public contents changed since the baseline.');
    const latest = await payload.find({ collection: 'game-updates', limit: 151, draft: true });
    assert.equal(latest.hasNextPage, false);
    assert.equal(latest.docs.length, before.length, 'Unreviewed records exist.');
    for (const row of latest.docs) {
      const baseline = before.find(b => b.id === row.id);
      assert(baseline && baseline.updatedAt === row.updatedAt && row._status === 'published', 'An operator has changed this record.');
      assert.deepEqual(canonical(row), canonical(baseline));
    }
    const receipt = [];
    for (const patch of batch.updates) {
      const original = before.find(row => row.slug === patch.slug);
      const saved = await payload.update({ collection: 'game-updates', id: original.id, data: { ...patch.data, _status: 'draft' }, draft: true });
      receipt.push({ id: saved.id, slug: saved.slug, updatedAt: saved.updatedAt, action: 'updated_draft' });
    }
    for (const row of batch.creates) {
      const saved = await payload.create({ collection: 'game-updates', data: { ...row, _status: 'draft' }, draft: true });
      receipt.push({ id: saved.id, slug: saved.slug, updatedAt: saved.updatedAt, action: 'created_draft' });
    }
    assert.deepEqual(sorted(await publicRows()), sorted(before), 'Draft changes leaked into the public export.');
    await write('draft-receipt.json', { status: 'drafts_saved_and_isolated', records: receipt });
    await write('expected-publication.json', { docs: expected });
    console.log(JSON.stringify({ status: 'drafts_saved_and_isolated', updated: batch.updates.length, created: batch.creates.length, publicCount: before.length }));
  } else {
    const receipt = await read('draft-receipt.json');
    assert.deepEqual(sorted(await publicRows()), sorted(before), 'Public contents changed before publication.');
    // Validate the complete prepared batch before publishing the first record.
    for (const record of receipt.records) {
      const saved = await payload.findByID({ collection: 'game-updates', id: record.id, draft: true });
      assert.equal(saved.updatedAt, record.updatedAt, 'Draft changed after review.');
      assert.equal(saved._status, 'draft');
      assert.deepEqual(canonical(saved), expected.find(row => row.slug === record.slug));
    }
    const published = [];
    for (const record of receipt.records) {
      const row = expected.find(row => row.slug === record.slug);
      const saved = await payload.update({ collection: 'game-updates', id: record.id, data: row, draft: false });
      assert.equal(saved._status, 'published');
      const history = await payload.findVersions({ collection: 'game-updates', where: { parent: { equals: record.id } }, limit: 1 });
      assert(history.totalDocs >= 2);
      published.push({ id: saved.id, slug: saved.slug, updatedAt: saved.updatedAt, versionCount: history.totalDocs });
    }
    const actual = await publicRows();
    assert.deepEqual(sorted(actual), expected, 'The final public collection differs from the reviewed batch.');
    await write('cms-after.json', { docs: actual });
    await write('local-publication.json', { status: 'published_and_verified', records: published, totalPublished: actual.length, method: 'Payload Local API', cloudWrites: 0 });
    console.log(JSON.stringify({ status: 'published_and_verified', totalPublished: actual.length, changed: published.length, cloudWrites: 0 }));
  }
} finally {
  await payload.destroy();
}
