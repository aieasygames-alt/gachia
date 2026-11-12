import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildShadowSnapshot, buildShadowRelease, openShadowView, verifyShadowSnapshot, SHADOW_SCHEMA, type ShadowInput } from '../src/shadow-release'

const now = '2026-10-30T00:00:00.000Z'
const scopes = ['nte', 'genshin', 'hsr']
const capabilities = { main: [SHADOW_SCHEMA], nte: [SHADOW_SCHEMA], genshin: [SHADOW_SCHEMA] }
const input = (path: string, title = 'Synthetic title'): ShadowInput => ({ path, title, body: 'Synthetic plain text', expiresAt: null, disposition: 'approved-fixture' })
function fixture() {
  const snapshots = [buildShadowSnapshot('nte', [input('/zh/nte/items/ore'), input('/zh/nte/characters/hero')], true, now),
    buildShadowSnapshot('genshin', [input('/en/genshin/guides/example')], true, now),
    buildShadowSnapshot('hsr', [input('/zh/hsr/guides/example')], true, now)]
  const store = new Map(snapshots.map(s => [s.snapshotKey, s]))
  const refs = Object.fromEntries(snapshots.map(s => [s.game, s.snapshotKey]))
  const release = buildShadowRelease(scopes, refs, store, capabilities, now)
  return { snapshots, store, refs, release }
}

test('shadow DTO strips private data and assigns both NTE details to their game owner', () => {
  const a = { ...input('/zh/nte/items/ore'), actorEmail: 'private', rawRecord: 'secret', reviewText: 'internal' }
  const b = input('/zh/nte/characters/hero')
  const snapshot = buildShadowSnapshot('nte', [a, b], true, now)
  assert.deepEqual(snapshot, buildShadowSnapshot('nte', [b, a], true, now))
  assert.deepEqual(snapshot.pages.map(p => p.owner), ['nte', 'nte'])
  assert.ok(!JSON.stringify(snapshot).includes('secret'))
  assert.ok(!JSON.stringify(snapshot).includes('actorEmail'))
  assert.deepEqual(Object.keys(snapshot.pages[0]).sort(), ['body', 'expiresAt', 'owner', 'path', 'schema', 'title'])
  const copy = verifyShadowSnapshot(snapshot)
  copy.pages[0].title = 'Changed copy'
  assert.notEqual(snapshot.pages[0].title, copy.pages[0].title)
})

test('hold, withdrawal, expiry, incomplete source and ambiguous paths fail closed', () => {
  for (const disposition of ['held', 'withdrawn'] as const) assert.throws(() => buildShadowSnapshot('nte', [{ ...input('/zh/nte/items/ore'), disposition }], true, now), /Held/)
  assert.throws(() => buildShadowSnapshot('nte', [], false, now), /Incomplete/)
  assert.throws(() => buildShadowSnapshot('nte', [{ ...input('/zh/nte/items/ore'), expiresAt: now }], true, now), /Expired/)
  assert.throws(() => buildShadowSnapshot('nte', [], true, 'invalid'), /UTC/)
  for (const path of ['/zh/nte/items/%6fre', '/zh/nte/items/..', '/zh/nte/items/ore/', '/zh/genshin/items/ore', '/zh/nte/items/ore?q=1']) assert.throws(() => buildShadowSnapshot('nte', [input(path)], true, now), /path/)
  assert.throws(() => buildShadowSnapshot('nte', [input('/zh/nte/items/ore'), input('/zh/nte/items/ore')], true, now), /Duplicate/)
})

test('complete ReleaseMap retains unchanged snapshots, pins reads/index/cache and permits validated rollback', () => {
  const { store, refs, release } = fixture()
  const old = openShadowView(release, scopes, store, capabilities, now)
  const changed = buildShadowSnapshot('nte', [input('/zh/nte/items/ore', 'New version'), input('/zh/nte/characters/hero')], true, now)
  store.set(changed.snapshotKey, changed)
  const next = buildShadowRelease(scopes, { ...refs, nte: changed.snapshotKey }, store, capabilities, now)
  assert.equal(next.snapshots.genshin, release.snapshots.genshin)
  assert.equal(next.snapshots.hsr, release.snapshots.hsr)
  const view = openShadowView(next, scopes, store, capabilities, now)
  assert.equal(view.read('nte', '/zh/nte/items/ore')?.title, 'New version')
  assert.equal(old.read('nte', '/zh/nte/items/ore')?.title, 'Synthetic title')
  assert.equal(view.index('nte').find(p => p.path === '/zh/nte/items/ore')?.title, 'New version')
  assert.notEqual(view.cacheKey('nte', '/zh/nte/items/ore'), old.cacheKey('nte', '/zh/nte/items/ore'))
  assert.throws(() => view.read('main', '/zh/nte/items/ore'), /Wrong consumer/)
  assert.equal(view.read('nte', '/zh/nte/items/missing'), null)
  changed.pages[0].title = 'Mutated store'
  assert.equal(view.read('nte', '/zh/nte/characters/hero')?.title, 'Synthetic title')
  assert.throws(() => openShadowView(next, scopes, store, capabilities, now), /integrity/)
  assert.equal(openShadowView(release, scopes, store, capabilities, now).releaseKey, old.releaseKey)
  const returned = old.read('nte', '/zh/nte/items/ore')!; returned.title = 'Caller mutation'
  assert.equal(old.read('nte', '/zh/nte/items/ore')?.title, 'Synthetic title')
})

test('partial owners, missing snapshots, scope mismatch and tampering never open a partial view', () => {
  const { store, refs, release } = fixture()
  assert.throws(() => buildShadowRelease(scopes, { nte: refs.nte }, store, capabilities, now), /every scope/)
  assert.throws(() => buildShadowRelease(scopes, { ...refs, extra: refs.nte }, store, capabilities, now), /every scope/)
  assert.throws(() => buildShadowRelease(scopes, { ...refs, hsr: refs.nte }, store, capabilities, now), /scope mismatch/)
  assert.throws(() => buildShadowRelease(scopes, refs, store, { ...capabilities, main: [] }, now), /owner main/)
  assert.throws(() => buildShadowRelease(scopes, refs, store, { main: [SHADOW_SCHEMA], genshin: [SHADOW_SCHEMA] }, now), /owner nte/)
  assert.throws(() => openShadowView({ ...release, publishable: true } as never, scopes, store, capabilities, now), /integrity/)
  assert.throws(() => openShadowView(release, ['nte'], store, capabilities, now), /every scope/)
  const nte = store.get(refs.nte)!
  for (const altered of [{ ...nte, secret: 'private' }, { ...nte, routePolicy: 'old' }, { ...nte, pages: nte.pages.map(p => ({ ...p, owner: 'main' })) }]) assert.throws(() => verifyShadowSnapshot(altered), /integrity|policy/)
  store.delete(refs.genshin)
  assert.throws(() => openShadowView(release, scopes, store, capabilities, now), /Missing snapshot/)
})

test('explicit empty replacement removes a scope page; expired snapshots cannot be reopened', () => {
  const { store, refs, release } = fixture()
  const empty = buildShadowSnapshot('nte', [], true, now); store.set(empty.snapshotKey, empty)
  const next = buildShadowRelease(scopes, { ...refs, nte: empty.snapshotKey }, store, capabilities, now)
  assert.equal(openShadowView(next, scopes, store, capabilities, now).read('nte', '/zh/nte/items/ore'), null)
  assert.ok(openShadowView(release, scopes, store, capabilities, now).read('nte', '/zh/nte/items/ore'))
  const expiring = buildShadowSnapshot('nte', [{ ...input('/zh/nte/items/ore'), expiresAt: '2026-10-31T00:00:00.000Z' }], true, now)
  store.set(expiring.snapshotKey, expiring)
  const limited = buildShadowRelease(scopes, { ...refs, nte: expiring.snapshotKey }, store, capabilities, now)
  assert.throws(() => openShadowView(limited, scopes, store, capabilities, '2026-10-31T00:00:00.000Z'), /Expired/)
})
