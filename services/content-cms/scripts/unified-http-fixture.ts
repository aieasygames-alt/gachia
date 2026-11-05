import assert from 'node:assert/strict'
import { cmsEnvironment } from '../src/cms-environment'
import { readLegacySources } from '../src/legacy-intake'
import { unifiedPlan, importUnifiedPlan } from '../src/unified-plan'

assert.equal(cmsEnvironment().mode, 'postgres-local', 'HTTP fixture is restricted to an owned cms_probe_* database')
const source = readLegacySources().sources.find(source => source.sourcePath === 'packages/data/games/hi3/raw-characters.json')
assert.ok(source)
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const result = await importUnifiedPlan(payload, unifiedPlan([source], ['hi3']))
  assert.ok(result.created > 0)
  console.log(JSON.stringify({ ...result, syntheticDatabaseOnly: true }))
} finally { await payload.destroy() }
