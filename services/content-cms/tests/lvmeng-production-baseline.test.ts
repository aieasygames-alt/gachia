import assert from 'node:assert/strict'
import test from 'node:test'
import { SERVICES } from '../../../scripts/desktop-cloud-release.mjs'
import { assertLvmengProductionBaseline } from '../src/lvmeng-independent-production'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const snapshot = () => ({ services: Object.fromEntries(SERVICES.map((service: string, i: number) => [service,
  { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
  settings: {}, bindings: {}, routes: [], domains: [], subdomains: {}, scripts: [...SERVICES] })

test('Lvmeng requires a complete current source and rejects every unrecorded deployment, including Main and Azur', () => {
  const baseline = snapshot()
  assertLvmengProductionBaseline({ allOwnersCurrent: true, baseline }, structuredClone(baseline))
  assert.throws(() => assertLvmengProductionBaseline({ allOwnersCurrent: false, baseline }, baseline), /complete current source/)
  for (const service of SERVICES) {
    const observed = structuredClone(baseline)
    observed.services[service].versions[0].version_id = uuid(99)
    assert.throws(() => assertLvmengProductionBaseline({ allOwnersCurrent: true, baseline }, observed), /deployment drift/)
  }
  const changed = { ...baseline, routes: [{ pattern: 'example.com/*' }] }
  assert.throws(() => assertLvmengProductionBaseline({ allOwnersCurrent: true, baseline }, changed), /Topology drift/)
})
