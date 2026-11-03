import assert from 'node:assert/strict';
import test from 'node:test';
import { assertReleaseScope, releaseScope } from './desktop-release-scope.mjs';
import { assertEditorialRecovery } from './desktop-cloud-transport.mjs';
import { promotionWriter } from './desktop-promotion-request.mjs';

const sha = 'a'.repeat(64), uuid = '11111111-1111-4111-8111-111111111111';
for (const game of ['genshin', 'nte']) {
  const other = game === 'genshin' ? 'nte' : 'genshin';
  const plan = { game, owners: [game, 'main'], preview: false, changed: ['one'], releaseKey: sha };
  test(`${game}: scope derives exactly one game and Main, never an arbitrary service`, () => {
    const scope = assertReleaseScope(plan, { [game]: { service: `gachia-game-${game}` }, main: { service: 'gachia' } });
    assert.deepEqual(scope.services, [`gachia-game-${game}`, 'gachia']);
    assert.throws(() => scope.serviceFor(other)); assert.throws(() => scope.serviceFor('router'));
    assertEditorialRecovery(plan, sha);
    for (const patch of [{ game: other }, { game: undefined }, { owners: [other, 'main'] }, { owners: [game] }, { owners: ['main', game] }]) {
      assert.throws(() => assertReleaseScope({ ...plan, ...patch }));
    }
    assert.throws(() => assertReleaseScope(plan, { [game]: { service: `gachia-game-${other}` }, main: { service: 'gachia' } }));
  });
  test(`${game}: fixed writer rejects a swapped game/Main version map before requests`, async () => {
    const calls = [];
    const input = { game, releaseKey: sha, versions: { gachia: uuid, [`gachia-game-${game}`]: uuid }, token: 'test',
      request: async (url, options) => { calls.push(options.method); return Response.json({ success: true, result: { id: uuid, strategy: 'percentage', versions: [{ version_id: uuid, percentage: 100 }] } }); } };
    assert.throws(() => promotionWriter({ ...input, game: other }));
    assert.throws(() => promotionWriter({ ...input, versions: { ...input.versions, 'gachia-router': uuid } }));
    const write = promotionWriter(input);
    await assert.rejects(write({ owner: other, service: `gachia-game-${other}`, releaseKey: sha, versionId: uuid }));
    assert.equal(calls.length, 0);
    await write({ owner: game, service: `gachia-game-${game}`, releaseKey: sha, versionId: uuid });
    assert.deepEqual(calls, ['POST', 'GET']);
  });
}
test('unreviewed games never acquire a release scope', () => {
  for (const game of [undefined, 'main', 'router', 'nte-staging', 'azur-promilia']) assert.throws(() => releaseScope(game));
});
