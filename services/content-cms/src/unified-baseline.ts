import assert from 'node:assert/strict'
import { characterSummaries } from '../../../packages/data/scripts/generate-character-summaries.mjs'
import { digest, MAX_SNAPSHOT_BYTES } from './legacy-intake'
import { assertJSON } from './unified-content'
import type { SourceBytes } from './unified-export'
import type { UnifiedPlan } from './unified-plan'

export const COMMUNITY_PUBLICATION_POLICY = Object.freeze({
  contract: 'community-editorial-v1', factualSourceApprovalRequired: false, publicSourceAttestationRequired: false,
  baseline: 'public-json-and-pinned-code', preserveExistingPublicContent: true,
})

async function publicJSON(response: Response) {
  assert.equal(response.status, 200, 'Public baseline unavailable; never fall back to old Git content')
  assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json', 'Expected public JSON')
  assert(!response.headers.has('set-cookie'), 'Unexpected private public-data response')
  assert(response.body, 'Missing public baseline body')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.length
      assert(bytes <= MAX_SNAPSHOT_BYTES, 'Public baseline byte budget exceeded')
      chunks.push(chunk.value)
    }
  } finally { await reader.cancel(); reader.releaseLock() }
  const body = Buffer.concat(chunks), text = body.toString('utf8')
  assert(Buffer.from(text).equals(body), 'Invalid public UTF-8')
  assertJSON(JSON.parse(text))
  return text
}

export async function communityBaseline({ plan, originals, pairs, request = fetch }: {
  plan: UnifiedPlan; originals: SourceBytes[]; pairs: string[]; request?: typeof fetch
}) {
  const sources = new Map(originals.map(source => [source.sourcePath, { ...source }]))
  assert.equal(sources.size, originals.length, 'Duplicate original source')
  assert.deepEqual([...sources.keys()].sort(), plan.sources.map(source => source.sourcePath).sort(), 'Complete original source set required')
  for (const source of plan.sources) assert.equal(sources.get(source.sourcePath)?.sha256, source.sourceSHA256, 'Original plan source mismatch')
  for (const source of originals) assert.equal(digest(source.text), source.sha256, 'Corrupt original source')
  const publicPaths = new Set(pairs.map(pair => `packages/data/games/${pair}`))
  assert.equal(publicPaths.size, pairs.length, 'Duplicate public mirror mapping')
  for (const pair of pairs) assert(/^[a-z0-9-]+\/raw-[a-z0-9-]+\.json$/.test(pair) && sources.has(`packages/data/games/${pair}`), 'Unknown public source mapping')
  const observations: { sourcePath: string; origin: string; path: string; sha256: string; bytes: number }[] = []
  // Bounded sequential reads avoid rate spikes; there is no authority/source approval or cloud credential.
  for (const pair of [...pairs].sort()) {
    const sourcePath = `packages/data/games/${pair}`, path = `/data/${pair}`, origin = 'https://gachia.com'
    const response = await request(origin + path, { method: 'GET', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) })
    const text = await publicJSON(response), sha256 = digest(text)
    sources.set(sourcePath, { sourcePath, text, sha256 })
    observations.push({ sourcePath, origin, path, sha256, bytes: Buffer.byteLength(text) })
  }
  const derived = new Set<string>()
  for (const source of plan.sources.filter(source => source.delegated === 'character-summary-generator')) {
    const characters = sources.get(`packages/data/games/${source.game}/raw-characters.json`)
    assert(characters, 'Missing active characters for derived baseline')
    const text = JSON.stringify(characterSummaries(source.game, JSON.parse(characters.text)), null, 2) + '\n'
    sources.set(source.sourcePath, { sourcePath: source.sourcePath, text, sha256: digest(text) })
    derived.add(source.sourcePath)
  }
  return { sources: [...sources.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)),
    manifest: { schemaVersion: 1, kind: 'community_content_baseline', policy: COMMUNITY_PUBLICATION_POLICY, planSHA256: plan.planSHA256,
      observations, inputs: plan.sources.map(source => ({ sourcePath: source.sourcePath, sha256: sources.get(source.sourcePath)!.sha256,
        mode: publicPaths.has(source.sourcePath) ? 'public_http' : derived.has(source.sourcePath) ? 'derived_from_active_characters' : 'operator_selected_code' })),
      capturedAt: new Date().toISOString(), contentAuthorityCertified: false, cloudWrites: false, productionReady: false } }
}
