import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, realpath, rm, writeFile, readFile, symlink, link, truncate, readdir, chmod, rename, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { shadowArtifactFiles } from '../src/shadow-artifact-files'
import { loadShadowConsumer } from '../src/shadow-consumer'
import { SHADOW_SCHEMA } from '../src/shadow-release'
import { currentShadowFixture } from '../test-support/current-shadow-fixture'

const exec = promisify(execFile)
const fixturePath = new URL('../../../reports/payload-status-audit-2026-10-30/batch17-shadow.json', import.meta.url)
const worker = new URL('../scripts/shadow-file-consumer.ts', import.meta.url)
async function setup() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'shadow-files-')))
  const files = await shadowArtifactFiles(root)
  const fixture = currentShadowFixture(JSON.parse(await readFile(fixturePath, 'utf8')))
  const owners = ['main', 'nte', 'genshin', 'azur-promilia', 'lvmeng']
  const context = { owner: 'main', releaseKey: fixture.next.releaseKey, scopes: fixture.next.scopes,
    capabilities: Object.fromEntries(owners.map(owner => [owner, [SHADOW_SCHEMA]])), asOf: '2026-10-30T00:00:00.000Z' }
  const consume = (override = {}) => exec(process.execPath, ['--import', 'tsx', worker.pathname, root, JSON.stringify({ ...context, ...override })],
    { env: { ...process.env, CMS_LOCAL_ONLY: '1' }, timeout: 30000, maxBuffer: 1024 * 1024 })
  const populate = async () => {
    for (const snapshot of fixture.snapshots) await files.write('snapshot', snapshot.snapshotKey, JSON.stringify(snapshot))
    for (const release of [fixture.baseline, fixture.next]) await files.write('release', release.releaseKey, JSON.stringify(release))
  }
  return { root, files, fixture, owners, context, consume, populate }
}

test('file transport rejects overwrite, partial artifacts, traversal, links and oversized reads', async () => {
  const f = await setup()
  try {
    const release = f.fixture.next, key = release.releaseKey, text = JSON.stringify(release)
    const filename = path.join(f.root, `release-${key}.json`)
    const race = await Promise.allSettled([f.files.write('release', key, text), f.files.write('release', key, text)])
    assert.equal(race.filter(r => r.status === 'fulfilled').length, 1)
    assert.equal(await f.files.read('release', key), text)
    await assert.rejects(f.files.write('release', key, text), /EEXIST/)
    assert.deepEqual(await readdir(f.root), [`release-${key}.json`])
    await assert.rejects(f.files.read('release', '../escape'), /identity/)
    await assert.rejects(shadowArtifactFiles('.'), /absolute/)
    await assert.rejects(f.files.write('release', key, '{}'), /integrity/)
    await rm(filename)
    await writeFile(path.join(f.root, '.pending-test'), text)
    await assert.rejects(f.files.read('release', key), /ENOENT/)
    await symlink(path.join(f.root, '.pending-test'), filename)
    await assert.rejects(f.files.read('release', key), /ELOOP/)
    await assert.rejects(f.files.write('release', key, text), /EEXIST/)
    await rm(filename)
    await link(path.join(f.root, '.pending-test'), filename)
    await assert.rejects(f.files.read('release', key), /Unsafe/)
    await rm(filename)
    await writeFile(filename, '{')
    await assert.rejects(f.files.read('release', key), SyntaxError)
    await writeFile(filename, JSON.stringify({ ...release, publishable: true }))
    await assert.rejects(f.files.read('release', key), /integrity/)
    await truncate(filename, 1024 * 1024 + 1)
    await assert.rejects(f.files.read('release', key), /Oversized/)
    const alias = path.join(f.root, 'alias')
    await symlink(f.root, alias)
    await assert.rejects(shadowArtifactFiles(alias), /Unsafe/)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('five isolated consumers share pinned files, keep NTE materials with NTE and revalidate rollback', { timeout: 60000 }, async () => {
  const f = await setup()
  try {
    await f.populate()
    const settled = await Promise.allSettled(f.owners.map(async owner => JSON.parse((await f.consume({ owner })).stdout)))
    const results = settled.map(result => { if (result.status === 'rejected') throw result.reason; return result.value })
    assert.equal(new Set(results.map(r => r.pid)).size, 5)
    assert.ok(results.every(r => r.pid !== process.pid))
    assert.equal(results.reduce((n, r) => n + r.documents.length, 0), 17)
    for (const result of results) {
      assert.equal(result.index.releaseKey, f.context.releaseKey)
      assert.equal(result.publishable, false)
      for (const { document, metadata } of result.documents) {
        assert.equal(document.releaseKey, result.index.releaseKey)
        assert.equal(document.title, metadata.title)
        assert.equal(document.cacheKey, metadata.cacheKey)
        assert.equal(document.owner, result.owner)
        assert.deepEqual(metadata.robots, { index: false, follow: false })
      }
    }
    const main = results.find(r => r.owner === 'main'), nte = results.find(r => r.owner === 'nte')
    assert.equal(main.documents.some((r: any) => r.document.path === '/zh/nte/items/ore'), false)
    assert.equal(nte.documents.find((r: any) => r.document.path === '/zh/nte/items/ore').document.title, 'Updated synthetic item')
    assert.equal(nte.documents.find((r: any) => r.document.path === '/zh/nte/characters/example').document.title, 'Updated synthetic character')
    const old = JSON.parse((await f.consume({ owner: 'nte', releaseKey: f.fixture.baseline.releaseKey })).stdout)
    assert.equal(old.index.releaseKey, f.fixture.baseline.releaseKey)
    assert.equal(old.documents.find((r: any) => r.document.path === '/zh/nte/items/ore').document.title, 'Synthetic shadow fixture')
    await assert.rejects(f.consume({ capabilities: { ...f.context.capabilities, nte: [] } }), /Unsupported schema/)
    const snapshot = f.fixture.next.snapshots.nte
    await writeFile(path.join(f.root, `snapshot-${snapshot}.json`), '{')
    await assert.rejects(f.consume(), error => {
      assert.equal((error as { stdout: string }).stdout, '')
      return true
    })
    await rm(path.join(f.root, `snapshot-${snapshot}.json`))
    await assert.rejects(loadShadowConsumer(f.context, f.files.read), /ENOENT/)
    await rm(path.join(f.root, `release-${f.fixture.baseline.releaseKey}.json`))
    await assert.rejects(f.consume({ releaseKey: f.fixture.baseline.releaseKey }), /ENOENT/)
  } finally { await rm(f.root, { recursive: true, force: true }) }
})

test('snapshot limits, root permissions and root replacement fail closed', async () => {
  const f = await setup(), moved = `${f.root}-moved`
  try {
    const key = f.fixture.snapshots[0].snapshotKey
    const filename = path.join(f.root, `snapshot-${key}.json`)
    await writeFile(filename, '')
    await truncate(filename, 2 * 1024 * 1024 + 1)
    await assert.rejects(f.files.read('snapshot', key), /Oversized/)
    await chmod(f.root, 0o755)
    await assert.rejects(shadowArtifactFiles(f.root), /Unsafe/)
    await assert.rejects(f.files.read('snapshot', key), /root changed/)
    await chmod(f.root, 0o700)
    await rename(f.root, moved)
    await mkdir(f.root, { mode: 0o700 })
    await assert.rejects(f.files.read('snapshot', key), /root changed/)
  } finally {
    await rm(f.root, { recursive: true, force: true })
    await rm(moved, { recursive: true, force: true })
  }
})
