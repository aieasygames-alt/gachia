import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { migrationRequests } from '../../../scripts/genshin-migration-http.mjs'
import { nteRequests } from './nte-release-bundle'

const services: Record<string, string> = { main: 'gachia', router: 'gachia-router', genshin: 'gachia-game-genshin',
  nte: 'gachia-game-nte', 'azur-promilia': 'gachia-game-azur-promilia', lvmeng: 'gachia-game-lvmeng' }

export function genshinMaterialRoutedRequests<T extends { path: string }>(requests: T[]) {
  // Raw static aliases belong to the direct game Worker. Router's /_next/static
  // namespace belongs to Main; game pages use the /_games/genshin alias.
  return requests.filter(row => !row.path.startsWith('/_next/static/'))
}

// Read-only local bindings come from the fully verified current deployment, not
// from the pre-NTE migration's historical Main/Router config transformation.
export function genshinMaterialLocalConfig(baseline: any, owner: string, artifact: string | undefined, module: string) {
  assert(Object.hasOwn(services, owner)); const settings = baseline.settings[services[owner]]; assert(settings)
  const config: any = { name: 'genshin-material-' + owner, main: module, no_bundle: true, find_additional_modules: false,
    compatibility_date: settings.compatibility_date, compatibility_flags: settings.compatibility_flags ?? [],
    vars: Object.fromEntries(settings.bindings.filter((row: any) => row.type === 'plain_text').map((row: any) => [row.name, row.text])),
    services: settings.bindings.filter((row: any) => row.type === 'service').map((row: any) => {
      const target = Object.entries(services).find(([, service]) => service === row.service)
      assert(target, 'Unqualified local dependency service'); return { binding: row.name, service: 'genshin-material-' + target[0] }
    }) }
  if (owner !== 'router') { assert(artifact); config.assets = { binding: 'ASSETS', directory: path.join(artifact, 'assets') } }
  if (owner === 'main') Object.assign(config, { d1_databases: [{ binding: 'DB', database_name: 'material-local-only', database_id: '00000000-0000-0000-0000-000000000000' }],
    r2_buckets: [{ binding: 'IMAGES', bucket_name: 'material-local-only' }] })
  return config
}

export async function genshinMaterialDeliveryRequests(opened: any, owner: string, role: 'candidate' | 'recovery', artifact: string) {
  const { sources, workspace, candidateSources, contract } = opened
  const expected = role === 'candidate' ? opened.expected : opened.previous
  const currentWorkspace = role === 'candidate' ? workspace : sources.workspace
  const currentSources = role === 'candidate' ? candidateSources : sources.sources
  const wanted = owner === 'router'
    ? await nteRequests(currentWorkspace, 'router', 'candidate', undefined, false, currentSources, undefined, sources.owners.main.directory)
    : { requests: [], values: new Map<string, any>() }
  const add = (row: any) => {
    const existing = wanted.requests.find((value: any) => value.path === row.path)
    if (existing) { assert.equal(existing.status, row.status); if (row.sha256) existing.sha256 = row.sha256 }
    else wanted.requests.push(row)
  }
  const gameRequests = migrationRequests({ owner: 'genshin', role: 'candidate', artifact, expected, sources: currentSources, pairs: [] })
  for (const row of owner === 'router' ? genshinMaterialRoutedRequests(gameRequests) : gameRequests) add(row)
  for (const row of contract[role].expectations) add({ path: row.path, status: row.status })
  for (const [file, bytes] of expected.files) wanted.values.set(expected.contract.prefix + '/' + file, JSON.parse(bytes))
  assert.equal(new Set(wanted.requests.map((row: any) => row.path)).size, wanted.requests.length)
  return wanted
}

export function assertGenshinMaterialReferences(proof: { path: string }, references: any[], wanted: any, contract: any) {
  assert.deepEqual(references.map(({ path, status }) => ({ path, status })), wanted.requests.map(({ path, status }: any) => ({ path, status })))
  for (const [index, row] of references.entries()) {
    if (wanted.requests[index].sha256) assert.equal(row.sha256, wanted.requests[index].sha256)
    if (wanted.values.has(row.path)) assert.deepEqual(JSON.parse(readFileSync(path.join(path.dirname(proof.path), row.bodyFile), 'utf8')), wanted.values.get(row.path))
  }
  assert(contract.expectations.every((row: any) => references.some(value => value.path === row.path)), 'Incomplete material consumers')
}
