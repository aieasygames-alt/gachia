import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { communityBaseline, COMMUNITY_PUBLICATION_POLICY } from '../src/unified-baseline'
import { readUnifiedSources } from '../src/unified-sources'
import { unifiedPlan } from '../src/unified-plan'
import { digest, MAX_SNAPSHOT_BYTES } from '../src/legacy-intake'
import { baselineDirectory } from '../src/inventory-baseline'
import { projectRoot } from '../src/local-environment'

const repo = path.resolve(projectRoot, '../..')
const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
const pairs: string[] = JSON.parse(readFileSync(path.join(repo, 'packages/data/raw-content-review.json'), 'utf8')).pairs
const originals = plan.sources.map(source => ({ sourcePath: source.sourcePath, text: readFileSync(path.join(repo, source.sourcePath), 'utf8'), sha256: source.sourceSHA256 }))
const json = (text: string) => new Response(text, { headers: { 'content-type': 'application/json' } })
const request: typeof fetch = async input => {
  const pair = new URL(String(input)).pathname.slice('/data/'.length)
  return json(originals.find(source => source.sourcePath === `packages/data/games/${pair}`)!.text)
}

test('community baseline accepts ordinary public content without authority certification and explicitly selects code-only inputs', async () => {
  const calls: string[] = []
  const result = await communityBaseline({ plan, originals, pairs, request: async (input, options) => {
    assert.equal(options?.method, 'GET'); assert.equal(options?.credentials, 'omit'); assert.equal(options?.redirect, 'error')
    const url = new URL(String(input)); assert.equal(url.origin, 'https://gachia.com'); calls.push(url.pathname)
    if (url.pathname === '/data/genshin/raw-guides.json') {
      const rows = JSON.parse(originals.find(source => source.sourcePath.endsWith('genshin/raw-guides.json'))!.text)
      rows.push({ ...rows[0], id: 'isolated-public-only-guide' })
      return json(JSON.stringify(rows))
    }
    if (url.pathname === '/data/genshin/raw-characters.json') {
      const rows = JSON.parse(originals.find(source => source.sourcePath.endsWith('genshin/raw-characters.json'))!.text)
      rows[0].name = 'Ordinary community editorial text'
      return json(JSON.stringify(rows))
    }
    return request(input, options)
  } })
  assert.equal(result.sources.length, 115); assert.equal(calls.length, pairs.length)
  assert.deepEqual(result.manifest.policy, COMMUNITY_PUBLICATION_POLICY)
  assert.equal(result.manifest.policy.publicSourceAttestationRequired, false)
  assert.equal(result.manifest.contentAuthorityCertified, false)
  const summary = result.sources.find(source => source.sourcePath.endsWith('genshin/raw-character-summaries.json'))!
  assert.equal(JSON.parse(summary.text)[0].name, 'Ordinary community editorial text')
  assert.equal(digest(summary.text), summary.sha256)
  assert(JSON.parse(result.sources.find(source => source.sourcePath.endsWith('genshin/raw-guides.json'))!.text).some((row: { id: string }) => row.id === 'isolated-public-only-guide'))
  assert.equal(result.manifest.inputs.filter(source => source.mode === 'derived_from_active_characters').length, 4)
  assert.equal(result.manifest.inputs.find(source => source.sourcePath === 'apps/game-lvmeng/lib/data.ts')?.mode, 'operator_selected_code')
})

for (const [label, response] of [
  ['unavailable', () => new Response('missing', { status: 404 })],
  ['HTML', () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } })],
  ['cookie', () => new Response('[]', { headers: { 'content-type': 'application/json', 'set-cookie': 'private=1' } })],
  ['invalid JSON', () => json('{')],
  ['byte budget', () => json(' '.repeat(MAX_SNAPSHOT_BYTES + 1))],
] as const) test(`public ${label} never silently falls back to original Git`, async () => {
  await assert.rejects(communityBaseline({ plan, originals, pairs, request: async () => response() }))
})

test('missing, corrupt, duplicate and unmapped inputs are rejected before fetching', async () => {
  const noFetch: typeof fetch = async () => { throw new Error('must not fetch') }
  for (const sources of [originals.slice(1), [...originals, originals[0]], [{ ...originals[0], text: 'corrupt' }, ...originals.slice(1)]]) {
    await assert.rejects(communityBaseline({ plan, originals: sources, pairs, request: noFetch }), error => error instanceof Error && !error.message.includes('must not fetch'))
  }
  await assert.rejects(communityBaseline({ plan, originals, pairs: ['../../private'], request: noFetch }), /Unknown/)
})
