import assert from 'node:assert/strict'
import { cmsEnvironment } from '../src/cms-environment'
import { readLegacySources } from '../src/legacy-intake'
import { unifiedPlan, importUnifiedPlan } from '../src/unified-plan'
import { publishedEditingContext } from '../src/published-editing-guard'

assert.equal(cmsEnvironment().mode, 'postgres-local', 'HTTP fixture is restricted to an owned cms_probe_* database')
const source = readLegacySources().sources.find(source => source.sourcePath === 'packages/data/games/hi3/raw-characters.json')
assert.ok(source)
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const result = await importUnifiedPlan(payload, unifiedPlan([source], ['hi3']))
  assert.ok(result.created > 0)
  const materials = readLegacySources().sources.find(source => source.sourcePath === 'packages/data/games/genshin/raw-materials.json')
  assert.ok(materials)
  assert.ok((await importUnifiedPlan(payload, unifiedPlan([materials], ['genshin']))).created > 0)
  const material = (await payload.find({ collection: 'content-records', overrideAccess: true, draft: true, depth: 0,
    where: { and: [{ kind: { equals: 'materials' } }, { stableKey: { like: 'unified:genshin:' } }] }, limit: 1 })).docs[0]
  const admin = (await payload.find({ collection: 'users', overrideAccess: true, where: { role: { equals: 'admin' } }, limit: 1 })).docs[0]
  const imported = material.sourceRecord as any
  const after = { ...material, reviewEvidence: { publishedBaseline: { kind: 'genshin-published-editing-baseline-v1', source: imported,
    importOriginalSHA256: imported.originalSHA256, syncKey: 'a'.repeat(64), exportKey: 'b'.repeat(64),
    sourceIndex: { path: '/fixture/source-index.json', pin: 'c'.repeat(64) }, versionId: 'fixture-version' } } }
  await payload.update({ collection: 'content-records', id: material.id, user: admin, overrideAccess: false,
    draft: true, data: after, context: publishedEditingContext(material, after) })
  console.log(JSON.stringify({ ...result, syntheticDatabaseOnly: true }))
} finally { await payload.destroy() }
