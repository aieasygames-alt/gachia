import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { digest } from '../src/legacy-intake'
import { auditMaterialReleaseDependencies } from '../src/material-release-dependencies'
import { materialConsumerContract, assertMaterialPageConsumer, assertMaterialSearchConsumer } from '../src/material-consumer-contract'
import { createGenshinPublicNetwork } from '../../../scripts/unified-preview-network.mjs'
import { sampleReadOnly } from '../../../scripts/desktop-version-preview.mjs'
import { migrationPinned } from '../../../scripts/genshin-migration-http.mjs'
import type { SourceBytes } from '../src/unified-export'

assert.equal(process.env.CMS_LOCAL_ONLY, '1', 'Read-only public probe only')
const args = process.argv.slice(2)
assert.equal(args.length, 6)
assert.deepEqual(args.filter((_, i) => i % 2 === 0), ['--audit', '--pin', '--output'])
const audit = migrationPinned({ path: args[1], pin: args[3] }), directory = args[5]
assert(path.isAbsolute(directory)); assert.equal(audit.kind, 'material_release_dependency_audit')
// The input audit has already reopened the full R128 history. Rebind every
// consumer to those exact published bytes, without reinterpreting today's CMS.
const sourceIndex = migrationPinned(audit.sourceIndex)
const sources = migrationPinned(sourceIndex.active) as SourceBytes[]
assert.equal(sources.length, audit.sourceCount)
for (const graph of audit.games) assert.deepEqual(auditMaterialReleaseDependencies(graph.game, sources), graph)
const contracts = audit.games.map((row: { game: string }) => materialConsumerContract(row.game, sources))
mkdirSync(directory, { mode: 0o700 })
const network = await createGenshinPublicNetwork('http://127.0.0.1:1087')
const observations: { path: string; status: number; sha256: string; file: string; headers: Record<string, string> }[] = []
const gaps: { game: string; path: string; reason: string }[] = []
const failures: { path: string; error: string }[] = []
const tasks = new Map<string, { path: string; checks: ((status: number, body: Buffer) => void)[] }>()
const add = (url: string, check: (status: number, body: Buffer) => void) => {
  if (!tasks.has(url)) tasks.set(url, { path: url, checks: [] })
  tasks.get(url)!.checks.push(check)
}
for (const contract of contracts) {
  for (const raw of contract.raw) add(raw.path, (status, body) => { assert.equal(status, 200); assert.deepEqual(JSON.parse(body.toString()), raw.value, raw.path) })
  if (!contract.materialCount) continue
  for (const locale of ['zh', 'en', 'ja'] as const) {
    const searchPath = `/data-manifest/search-${locale}.json`
    add(searchPath, (status, body) => {
      assert.equal(status, 200)
      const value = JSON.parse(body.toString())
      if (!value[contract.game]?.items) {
        gaps.push({ game: contract.game, path: searchPath, reason: 'material-scope-absent-from-global-search' }); return
      }
      assertMaterialSearchConsumer(contract, locale, value)
    })
    const pages = contract.pages.filter((row: { locale: string }) => row.locale === locale)
    // A bounded baseline probe: full collection links plus first/last and one
    // dependency-bearing detail. This is explicitly not full page qualification.
    const selected = [pages[0], pages[1], pages.at(-1), pages.find((row: { id?: string; links: string[] }) => row.id && row.links.length > 1)].filter(Boolean)
    for (const page of selected) add(page.path, (status, body) => assertMaterialPageConsumer(page, status, body.toString()))
  }
}
try {
  await sampleReadOnly([...tasks.values()], async (task: { path: string; checks: ((status: number, body: Buffer) => void)[] }, i: number) => {
    const response = await network.request('https://gachia.com' + task.path, { method: 'GET', redirect: 'error', credentials: 'omit',
      headers: { 'accept-language': task.path.match(/^\/(zh|en|ja)\//)?.[1] ?? 'zh' }, signal: AbortSignal.timeout(30000) })
    const body = Buffer.from(await response.arrayBuffer()), file = `${i}.body`
    writeFileSync(path.join(directory, file), body, { flag: 'wx', mode: 0o600 })
    observations.push({ path: task.path, status: response.status, sha256: createHash('sha256').update(body).digest('hex'), file, headers: Object.fromEntries(response.headers) })
    // Finish independent read-only observations so one existing application gap
    // cannot conceal the rest. Failed assertions remain explicit release blockers.
    for (const check of task.checks) {
      try { check(response.status, body) } catch (error) { failures.push({ path: task.path, error: (error as Error).message }) }
    }
  }, 6)
  const text = JSON.stringify({ schemaVersion: 1, kind: 'material_public_consumer_audit', status: gaps.length || failures.length ? 'blocked-by-consumer-gaps' : 'passed',
    sourceIndex: audit.sourceIndex, dependencyAudit: { path: args[1], pin: args[3] }, observedAt: new Date().toISOString(),
    coverage: 'all material and relationship public JSON, exact global material search, full collection links and representative detail pages',
    games: contracts.map((row: ReturnType<typeof materialConsumerContract>) => ({ game: row.game, materials: row.materialCount,
      dependencyClosureComplete: row.dependencyClosureComplete, fullDetailPageAcceptance: false })),
    observations: observations.sort((a, b) => a.path.localeCompare(b.path)), gaps, failures, cloudWrites: false, cmsWrites: false, productionQualified: false }, null, 2) + '\n'
  const file = path.join(directory, 'result.json'); writeFileSync(file, text, { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ path: file, pin: digest(text), checks: observations.length, gaps, failures, cloudWrites: false }))
  if (gaps.length || failures.length) process.exitCode = 2
} catch (error) {
  writeFileSync(path.join(directory, 'failure.json'), JSON.stringify({ error: (error as Error).message, observations, gaps, cloudWrites: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  throw error
} finally { await network.close() }
