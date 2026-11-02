import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildShadowSnapshot, buildShadowRelease, SHADOW_SCHEMA } from '../src/shadow-release'
import { loadShadowConsumer, type ShadowArtifactReader } from '../src/shadow-consumer'

const asOf = '2026-10-30T00:00:00.000Z'
function fixture(title = 'Fixture') {
  const scopes = ['nte', 'genshin']
  const capabilities = { main: [SHADOW_SCHEMA], nte: [SHADOW_SCHEMA], genshin: [SHADOW_SCHEMA] }
  const page = (path: string) => ({ path, title, body: '<script>literal text only</script>', expiresAt: null, disposition: 'approved-fixture' as const })
  const snapshots = [buildShadowSnapshot('nte', [page('/zh/nte/items/ore'), page('/zh/nte/characters/hero')], true, asOf), buildShadowSnapshot('genshin', [page('/en/genshin/guides/example')], true, asOf)]
  const release = buildShadowRelease(scopes, Object.fromEntries(snapshots.map(s => [s.game, s.snapshotKey])), new Map(snapshots.map(s => [s.snapshotKey, s])), capabilities, asOf)
  const bytes = new Map([[release.releaseKey, JSON.stringify(release)], ...snapshots.map(s => [s.snapshotKey, JSON.stringify(s)] as [string, string])])
  const read: ShadowArtifactReader = async (_kind, key) => { const value = bytes.get(key); if (value === undefined) throw new Error('Missing artifact'); return value }
  return { context: { owner: 'main', releaseKey: release.releaseKey, scopes, capabilities, asOf }, release, snapshots, bytes, read }
}

test('independent serialized consumers bind body, metadata, index and cache to one release', async () => {
  const f = fixture()
  const main = await loadShadowConsumer(f.context, f.read)
  const nte = await loadShadowConsumer({ ...f.context, owner: 'nte' }, f.read)
  const dedicated = await loadShadowConsumer({ ...f.context, owner: 'genshin' }, f.read)
  for (const [consumer, pathname] of [[main, '/zh/nte/items/ore'], [nte, '/zh/nte/characters/hero'], [dedicated, '/en/genshin/guides/example']] as const) {
    const document = consumer.document(pathname)!, meta = consumer.metadata(pathname)!, index = consumer.index()
    assert.equal(document.releaseKey, meta.releaseKey)
    assert.equal(document.releaseKey, index.releaseKey)
    assert.equal(document.title, meta.title)
    assert.equal(document.title, index.entries.find(p => p.path === pathname)?.title)
    assert.equal(document.cacheKey, meta.cacheKey)
    assert.equal(document.format, 'plain-text')
    assert.deepEqual(meta.robots, { index: false, follow: false })
    assert.equal(consumer.publishable, false)
    assert.ok(!('actorEmail' in document))
  }
  assert.throws(() => main.document('/zh/nte/characters/hero'), /Wrong consumer/)
  assert.throws(() => nte.metadata('/zh/nte/items/ore'), /Wrong consumer/)
  assert.equal(main.document('/zh/nte/items/missing'), null)
  assert.equal(main.metadata('/zh/nte/items/missing'), null)
})

test('pinned consumers do not follow newer maps or mutable context, source bytes and return values', async () => {
  const old = fixture('Old'), next = fixture('New')
  const consumer = await loadShadowConsumer(old.context, old.read)
  old.bytes.clear(); old.context.owner = 'nte'; old.context.scopes.length = 0
  const doc = consumer.document('/zh/nte/items/ore')!; doc.title = 'Mutated result'
  const idx = consumer.index(); idx.entries[0].title = 'Mutated index'
  assert.equal(consumer.metadata('/zh/nte/items/ore')?.title, 'Old')
  const newer = await loadShadowConsumer(next.context, next.read)
  assert.equal(newer.document('/zh/nte/items/ore')?.title, 'New')
  assert.notEqual(newer.document('/zh/nte/items/ore')?.cacheKey, doc.cacheKey)
})

test('context is captured before async reads and mixed-version responses fail closed', async () => {
  const f = fixture(), next = fixture('Next')
  const consumer = await loadShadowConsumer(f.context, async (kind, key) => {
    f.context.owner = 'nte'; f.context.scopes = []
    return f.read(kind, key)
  })
  assert.equal(consumer.owner, 'main')
  const fresh = fixture()
  await assert.rejects(loadShadowConsumer(fresh.context, async () => JSON.stringify(next.release)), /Pinned release/)
  await assert.rejects(loadShadowConsumer(fresh.context, async (kind, key) => kind === 'release' ? fresh.read(kind, key) : JSON.stringify(next.snapshots[0])), /Pinned snapshot/)
})

test('missing, malformed, oversized, tampered and incompatible artifacts expose no consumer', async () => {
  const f = fixture()
  await assert.rejects(loadShadowConsumer({ ...f.context, owner: 'unknown' }, f.read), /Unsupported/)
  await assert.rejects(loadShadowConsumer({ ...f.context, capabilities: { ...f.context.capabilities, nte: [] } }, f.read), /Unsupported schema/)
  await assert.rejects(loadShadowConsumer(f.context, async () => '{'), SyntaxError)
  await assert.rejects(loadShadowConsumer(f.context, async () => ' '.repeat(1024 * 1024 + 1)), /oversized/)
  await assert.rejects(loadShadowConsumer(f.context, async (kind, key) => kind === 'release' ? f.read(kind, key) : ' '.repeat(2 * 1024 * 1024 + 1)), /oversized/)
  const altered = { ...f.release, snapshots: { ...f.release.snapshots, nte: '../escape' } }
  await assert.rejects(loadShadowConsumer(f.context, async () => JSON.stringify(altered)), /references/)
  await assert.rejects(loadShadowConsumer(f.context, async (kind, key) => {
    const text = await f.read(kind, key)
    return kind === 'snapshot' ? JSON.stringify({ ...JSON.parse(text), actorEmail: 'private' }) : text
  }), /whitelist/)
  f.bytes.delete(f.snapshots[1].snapshotKey)
  await assert.rejects(loadShadowConsumer(f.context, f.read), /Missing artifact/)
})
