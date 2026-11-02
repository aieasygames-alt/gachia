import assert from 'node:assert/strict';

const GAMES = ['genshin', 'nte'];

export function releaseScope(game) {
  assert(GAMES.includes(game), 'Unreviewed release game');
  return { game, owners: [game, 'main'], services: [`gachia-game-${game}`, 'gachia'],
    serviceFor: owner => {
      assert(owner === game || owner === 'main', 'Release owner/game mismatch');
      return owner === 'main' ? 'gachia' : `gachia-game-${game}`;
    } };
}

export function assertReleaseScope(plan, owners) {
  const scope = releaseScope(plan.game);
  assert.deepEqual(plan.owners, scope.owners, 'Release owner/game mismatch');
  if (owners) {
    assert.deepEqual(Object.keys(owners).sort(), [...scope.owners].sort(), 'Release owner inventory mismatch');
    for (const owner of scope.owners) assert.equal(owners[owner].service, scope.serviceFor(owner), 'Release service/game mismatch');
  }
  return scope;
}
