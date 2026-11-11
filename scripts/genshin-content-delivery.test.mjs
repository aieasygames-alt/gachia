import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { genshinContentAssets } from './genshin-content-assets.mjs';
import { assertGenshinDeliveryData } from './genshin-content-delivery.mjs';

const expected = genshinContentAssets(resolve(import.meta.dirname, '..'));
const bytes = value => Buffer.from(JSON.stringify(value));

test('delivery assertions require exact raw bytes and current derived projections', () => {
  assertGenshinDeliveryData('/data/genshin/raw-characters.json', expected.files.get('data/raw-characters.json'), expected);
  const raw = JSON.parse(expected.files.get('data/raw-characters.json')); raw[0].nameEn = 'Wrong release';
  assert.throws(() => assertGenshinDeliveryData('/data/genshin/raw-characters.json', bytes(raw), expected), /bytes differ/);
  const platform = JSON.parse(expected.files.get('platform.json'));
  assertGenshinDeliveryData('/data-client/genshin-platform.json', bytes(platform), expected);
  assert.throws(() => assertGenshinDeliveryData('/data-client/genshin-platform.json', bytes({ ...platform, version: 'stale' }), expected));
  const tiers = JSON.parse(expected.files.get('tier-list.json')).data;
  assertGenshinDeliveryData('/data-client/tier-list-genshin.json', bytes(tiers), expected);
});

test('search and game membership must use the new Genshin slice without modifying other games', () => {
  for (const file of ['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json']) {
    const data = JSON.parse(expected.files.get(file)).data, gameList = file === 'games.json';
    const baseline = gameList ? { schemaVersion: 1, games: { starrail: { characters: ['retained'] } } } : { starrail: { characters: ['retained'] } };
    const value = gameList ? { ...baseline, games: { ...baseline.games, genshin: data } } : { ...baseline, genshin: data };
    assertGenshinDeliveryData('/data-manifest/' + file, bytes(value), expected, baseline);
    const changed = structuredClone(value);
    if (gameList) changed.games.starrail.characters = []; else changed.starrail.characters = [];
    assert.throws(() => assertGenshinDeliveryData('/data-manifest/' + file, bytes(changed), expected, baseline), /Other game/);
    const stale = structuredClone(value);
    if (gameList) stale.games.genshin = {}; else stale.genshin = {};
    assert.throws(() => assertGenshinDeliveryData('/data-manifest/' + file, bytes(stale), expected, baseline));
  }
});
