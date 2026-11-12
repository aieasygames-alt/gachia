import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { loadLocalShadow, shadowDocument } from '../../../packages/core/shadow-local-reader'
import { canonical, digest } from '../../../packages/core/shadow-canonical'
import { canonical as legacyCanonical } from '../src/record-mapping'
import { shadowFixtureResponse } from '../src/shadow-http-fixture'
import { currentShadowFixture } from '../test-support/current-shadow-fixture'

const historicalFixture = JSON.parse(readFileSync(new URL('../../../reports/shadow-fixture-2026-10-31.json', import.meta.url), 'utf8'))
const fixture = currentShadowFixture(historicalFixture)
const env = { CONTENT_SHADOW_LOCAL_ONLY: '1', GENSHIN_SHADOW_READER: '1', NTE_SHADOW_READER: '1',
  CONTENT_CMS_SHADOW_ORIGIN: 'http://127.0.0.1:3100', CONTENT_CMS_SHADOW_RELEASE_KEY: fixture.release.releaseKey }
const host = '127.0.0.1:3317'
function transport(data = fixture) {
  const requests: string[] = []
  const fetcher: typeof fetch = async (input, init) => {
    requests.push(String(input))
    assert.equal(init?.cache, 'no-store'); assert.equal(init?.redirect, 'error')
    const url = new URL(String(input)); const key = url.pathname.split('/').at(-1)!
    const value = url.pathname.includes('/releases/') ? data.release : data.snapshots[key]
    return Response.json(value ?? { error: 'missing' }, { status: value ? 200 : 404, headers: { 'x-shadow-only': 'true' } })
  }
  return { requests, fetcher }
}

test('shared canonicalization preserves historical fixture identities', () => {
  assert.equal(canonical(historicalFixture), legacyCanonical(historicalFixture))
  const { releaseKey, ...release } = historicalFixture.release
  assert.equal(digest(canonical(release)), releaseKey)
})

test('local reader verifies the complete map once and binds real projections and synthetic media', async () => {
  const mock = transport()
  const context = await loadLocalShadow('genshin', fixture.release.releaseKey, host, env, mock.fetcher)
  assert.equal(mock.requests.length, 3)
  const content = shadowDocument(context, '/zh/genshin/characters/index')!
  assert.equal(content.document.body, 'Approved local shadow fixture')
  assert.equal(content.metadata.title, content.document.title)
  assert.equal(content.jsonLd.identifier, context.releaseKey)
  assert.equal(digest(context.mediaBody), context.mediaDigest)
  assert.ok(context.mediaPath.includes(context.releaseKey))
  assert.ok(content.document.cacheKey.includes(context.releaseKey))
  assert.throws(() => shadowDocument(context, '/zh/nte/characters/index'), /Wrong consumer/)
  const second = await loadLocalShadow('genshin', fixture.release.releaseKey, host, env, mock.fetcher)
  assert.notEqual(second.contextId, context.contextId)
})

test('local reader refuses remote origins, redirects, wrong keys and missing opt-in before fetching', async () => {
  const mock = transport()
  for (const origin of ['https://gachia.com', 'http://localhost:3100', 'http://127.0.0.1:3100/path', 'http://a:b@127.0.0.1:3100', 'http://127.0.0.1:3100/?secret=x']) {
    await assert.rejects(loadLocalShadow('genshin', fixture.release.releaseKey, host, { ...env, CONTENT_CMS_SHADOW_ORIGIN: origin }, mock.fetcher))
  }
  await assert.rejects(loadLocalShadow('genshin', fixture.release.releaseKey, 'gachia.com', env, mock.fetcher), /disabled/)
  await assert.rejects(loadLocalShadow('genshin', fixture.release.releaseKey, host, { ...env, CONTENT_SHADOW_LOCAL_ONLY: undefined }, mock.fetcher), /disabled/)
  await assert.rejects(loadLocalShadow('genshin', 'a'.repeat(64), host, env, mock.fetcher), /Unapproved/)
  assert.equal(mock.requests.length, 0)
})

test('missing other-owner snapshot and tampered bytes cannot expose a partial view', async () => {
  const partial = structuredClone(fixture)
  delete partial.snapshots[partial.release.snapshots.nte]
  await assert.rejects(loadLocalShadow('genshin', fixture.release.releaseKey, host, env, transport(partial).fetcher), /unavailable/)
  const tampered = structuredClone(fixture)
  tampered.snapshots[tampered.release.snapshots.genshin].pages[0].body = 'Unapproved'
  await assert.rejects(loadLocalShadow('genshin', fixture.release.releaseKey, host, env, transport(tampered).fetcher), /integrity/)
  await assert.rejects(loadLocalShadow('genshin', fixture.release.releaseKey, host, env, async () => new Response('x'.repeat(1024 * 1024 + 1), { headers: { 'x-shadow-only': 'true' } })), /Oversized/)
})

test('CMS fixture HTTP endpoint is off without explicit local opt-in', async () => {
  const previous = process.env.CMS_SHADOW_READER
  try {
    delete process.env.CMS_SHADOW_READER
    const response = await shadowFixtureResponse(new Request('http://127.0.0.1:3100/', { headers: { host: '127.0.0.1:3100' } }), 'release', fixture.release.releaseKey)
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('x-shadow-only'), null)
  } finally {
    if (previous === undefined) delete process.env.CMS_SHADOW_READER
    else process.env.CMS_SHADOW_READER = previous
  }
})

test('NTE now reads both its material and character documents while Main rejects those paths', async () => {
  const split = currentShadowFixture(JSON.parse(readFileSync(new URL('../../../reports/payload-next-phase-2026-11-01/shadow-split-fixture.json', import.meta.url), 'utf8')))
  const splitEnv = { ...env, MAIN_SHADOW_READER: '1', CONTENT_CMS_SHADOW_RELEASE_KEY: split.release.releaseKey }
  const main = await loadLocalShadow('main', split.release.releaseKey, host, splitEnv, transport(split).fetcher)
  const nte = await loadLocalShadow('nte', split.release.releaseKey, host, splitEnv, transport(split).fetcher)
  assert.equal(main.releaseKey, nte.releaseKey)
  assert.deepEqual(main.entries.map(entry => entry.path), [])
  assert.deepEqual(nte.entries.map(entry => entry.path), ['/zh/nte/characters/index', '/zh/nte/items/ore'])
  assert.equal(shadowDocument(nte, '/zh/nte/items/ore')!.document.title, 'Main NTE item fixture')
  assert.throws(() => shadowDocument(main, '/zh/nte/characters/index'), /Wrong consumer/)
  assert.throws(() => shadowDocument(main, '/zh/nte/items/ore'), /Wrong consumer/)
})
