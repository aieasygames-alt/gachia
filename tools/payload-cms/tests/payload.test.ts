import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getPayload } from 'payload';
import seed from '../../../packages/data/cms/starrail-snapshot.json';
import { importUpdates } from '../lib/import-updates';
import { parseStarRailUpdate } from '../../../packages/data/cms/starrail-updates';

test('real Payload + SQLite: draft isolation, publish, restricted writes, history and idempotent imports', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'gachia-payload-test-'));
  process.env.PAYLOAD_SECRET = 'isolated-test-secret-with-at-least-32-characters';
  process.env.DATABASE_URL = `file:${path.join(directory, 'test.db')}`;
  const config = (await import('../payload.config')).default;
  const payload = await getPayload({ config });
  try {
    await importUpdates(payload, [seed[0]], false);
    let publicRead = await payload.find({ collection: 'game-updates', overrideAccess: false, draft: false });
    assert.equal(publicRead.docs.length, 0);
    const drafts = await payload.find({ collection: 'game-updates', draft: true });
    const draft = drafts.docs[0]!;
    assert.equal(draft._status, 'draft');
    const valid = parseStarRailUpdate(seed[1]);
    assert.ok(valid);
    await assert.rejects(payload.create({ collection: 'game-updates', overrideAccess: false, data: valid }));
    await assert.rejects(payload.update({ collection: 'game-updates', id: draft.id, data: { _status: 'published', sources: [] }, draft: false }));
    await payload.update({ collection: 'game-updates', id: draft.id, data: { _status: 'published' }, draft: false });
    publicRead = await payload.find({ collection: 'game-updates', overrideAccess: false, draft: false });
    assert.equal(publicRead.docs.length, 1);
    assert.equal(publicRead.docs[0]?.title, seed[0]!.title);
    await payload.update({ collection: 'game-updates', id: draft.id, data: { title: 'Operator reviewed title' } });
    const repeat = await importUpdates(payload, [seed[0]], true);
    assert.equal(repeat[0]?.action, 'preserved');
    const saved = await payload.findByID({ collection: 'game-updates', id: draft.id });
    assert.equal(saved.title, 'Operator reviewed title');
    await payload.update({ collection: 'game-updates', id: draft.id, data: { title: 'Private draft title', _status: 'draft' }, draft: true });
    const stillPublished = await payload.find({ collection: 'game-updates', overrideAccess: false, draft: false });
    assert.equal(stillPublished.docs[0]?.title, 'Operator reviewed title');
    const anonymousDraftQuery = await payload.find({ collection: 'game-updates', overrideAccess: false, draft: true });
    assert.ok(anonymousDraftQuery.docs.every(doc => doc.title !== 'Private draft title'));
    // @ts-expect-error Deliberately exercise invalid input at the real API boundary.
    await assert.rejects(payload.update({ collection: 'game-updates', id: draft.id, data: { gameId: 'genshin' } }));
    const versions = await payload.findVersions({ collection: 'game-updates', where: { parent: { equals: draft.id } } });
    assert.ok(versions.totalDocs >= 2);
    await assert.rejects(payload.findVersions({ collection: 'game-updates', overrideAccess: false }));
    await payload.update({ collection: 'game-updates', id: draft.id, data: { _status: 'draft' }, draft: false });
    const unpublished = await payload.find({ collection: 'game-updates', overrideAccess: false, draft: false });
    assert.equal(unpublished.totalDocs, 0);
  } finally {
    await payload.destroy();
    await rm(directory, { recursive: true, force: true });
  }
});
