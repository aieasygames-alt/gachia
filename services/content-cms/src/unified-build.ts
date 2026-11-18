import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, realpathSync, lstatSync, writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { exportUnifiedContent, type SourceBytes } from './unified-export'
import { verifyUnifiedPlan, type UnifiedPlan } from './unified-plan'
import type { UnifiedRecord } from './unified-content'
import { COMMUNITY_PUBLICATION_POLICY } from './unified-baseline'
import { AZUR_NAME_CONSUMER, projectAzurRawNames } from './unified-consumers'
import { assertMaterialCandidateDependencies } from './material-release-dependencies'
import { GENSHIN_LOCAL_SCOPE, genshinLocalOwnerScope } from './unified-genshin-local-scope'
import { AZUR_PROMILIA_PRODUCTION_SCOPE, GENSHIN_PRODUCTION_SCOPE, LVMENG_PRODUCTION_SCOPE, NTE_PRODUCTION_SCOPE, independentProductionOwnerScope, type IndependentProductionScope } from './unified-genshin-production-scope'

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const bytesSHA256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const sourceGame = (sourcePath: string) => sourcePath.match(/^packages\/data\/games\/([a-z0-9-]+)\//)?.[1]
  ?? sourcePath.match(/^apps\/game-([a-z0-9-]+)\/lib\/data\.ts$/)?.[1]
const save = (file: string, value: unknown) => {
  const text = json(value)
  writeFileSync(file, text, { flag: 'wx', mode: 0o600 })
  return digest(text)
}
const git = (repo: string, args: string[]) => execFileSync('git', args, { cwd: repo, maxBuffer: 32 * 1024 * 1024 })

function regular(root: string, relative: string) {
  assert(relative && !path.isAbsolute(relative) && !relative.includes('\\')
    && relative.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe frozen path')
  const file = path.join(root, relative)
  assert.equal(realpathSync(file), file, 'Linked frozen input forbidden')
  assert(lstatSync(file).isFile(), 'Regular frozen file required')
  return file
}

export function unifiedOwnerPlan(changedPaths: string[], plan: UnifiedPlan, ownership: { games: Record<string, unknown> }) {
  assert(changedPaths.length > 0, 'Changed source paths required')
  const known = new Set(plan.sources.map(source => source.sourcePath)), games = new Set<string>()
  for (const sourcePath of changedPaths) {
    const game = sourceGame(sourcePath)
    assert(known.has(sourcePath) && game && plan.games.includes(game), 'Unregistered changed source')
    games.add(game)
  }
  // Main embeds manifests and public data even for independently served games.
  const owners = [...games].filter(game => Object.hasOwn(ownership.games, game)).sort().concat('main')
  return { games: [...games].sort(), owners, services: owners.map(owner => owner === 'main' ? 'gachia' : `gachia-game-${owner}`) }
}

export function unifiedTree(root: string, relative = '', buildOutputs = false): { path: string; sha256: string }[] {
  return readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = relative ? `${relative}/${entry.name}` : entry.name
    if (buildOutputs && (entry.name === 'node_modules' && /^(?:node_modules|(?:apps|packages)\/[^/]+\/node_modules)$/.test(name)
      || /^(?:apps|packages)\/[^/]+\/(?:\.next|\.open-next|\.wrangler|\.turbo)$/.test(name)
      || entry.isFile() && name.endsWith('.tsbuildinfo'))) return []
    assert(!entry.isSymbolicLink(), 'Linked frozen tree forbidden')
    if (entry.isDirectory()) return unifiedTree(root, name, buildOutputs)
    return [{ path: name, sha256: bytesSHA256(readFileSync(regular(root, name))) }]
  })
}

type FreezeInput = {
  repo: string; commit: string; directory: string; plan: UnifiedPlan
  records: UnifiedRecord[]; activeSources: SourceBytes[]; preview: boolean
  localScope?: typeof GENSHIN_LOCAL_SCOPE
  productionScope?: IndependentProductionScope
}

// A source/compiler receipt only. It cannot authorize cloud upload, CMS install or promotion.
export function freezeUnifiedContent(input: FreezeInput) {
  const { plan, records, activeSources, preview } = input
  verifyUnifiedPlan(plan)
  assert(/^[a-f0-9]{40}$/.test(input.commit), 'Explicit exact source commit required')
  const repo = realpathSync(input.repo), directory = path.resolve(input.directory)
  assert.equal(git(repo, ['rev-parse', '--verify', `${input.commit}^{commit}`]).toString().trim(), input.commit)
  const originals = plan.sources.map(source => {
    const bytes = git(repo, ['show', `${input.commit}:${source.sourcePath}`]), text = bytes.toString('utf8')
    assert(Buffer.from(text).equals(bytes), 'Invalid UTF-8 import source')
    assert.equal(digest(text), source.sourceSHA256, `Frozen commit differs from import O: ${source.sourcePath}`)
    return { sourcePath: source.sourcePath, text, sha256: digest(text) }
  })
  const knownRecords = new Map(plan.sources.flatMap(source => source.records.map(record => [record.stableKey, record] as const)))
  for (const record of records) assert.deepEqual(record.sourceRecord, knownRecords.get(record.stableKey)?.sourceRecord, 'Record is outside the pinned plan')
  const candidate = exportUnifiedContent(records, originals, activeSources, preview)
  assert.equal(candidate.manifest.status, 'editorial_candidate', 'No new editorial changes: do not freeze an unchanged import')
  const materialDependencies = assertMaterialCandidateDependencies(activeSources,
    candidate.files.map(file => ({ sourcePath: file.sourcePath, text: file.content, sha256: file.candidateSHA256 })))
  assert(input.localScope === undefined || input.localScope === GENSHIN_LOCAL_SCOPE, 'Unknown local scope')
  const local = input.localScope && genshinLocalOwnerScope(candidate.manifest, activeSources,
    candidate.files.map(file => ({ sourcePath: file.sourcePath, text: file.content, sha256: file.candidateSHA256 })))
  assert(input.productionScope === undefined || [GENSHIN_PRODUCTION_SCOPE, NTE_PRODUCTION_SCOPE, AZUR_PROMILIA_PRODUCTION_SCOPE, LVMENG_PRODUCTION_SCOPE].includes(input.productionScope), 'Unknown production source scope')
  assert(!(input.localScope && input.productionScope), 'Local and production source scopes cannot be combined')
  const independent = input.productionScope && independentProductionOwnerScope(input.productionScope === NTE_PRODUCTION_SCOPE ? 'nte' : input.productionScope === AZUR_PROMILIA_PRODUCTION_SCOPE ? 'azur-promilia' : input.productionScope === LVMENG_PRODUCTION_SCOPE ? 'lvmeng' : 'genshin', candidate.manifest, activeSources,
    candidate.files.map(file => ({ sourcePath: file.sourcePath, text: file.content, sha256: file.candidateSHA256 })))
  assert(directory !== repo && !repo.startsWith(directory + path.sep), 'Output cannot contain the source repository')
  assert.equal(realpathSync(path.dirname(directory)), path.dirname(directory), 'Linked output parent forbidden')
  const tree = git(repo, ['ls-tree', '-rlz', input.commit]).toString().split('\0').filter(Boolean).map(row => {
    const match = row.match(/^(100644|100755) blob [a-f0-9]{40}\s+(\d+)\t(.+)$/s)
    assert(match, 'Source links/submodules forbidden')
    const relative = match[3]
    assert(!path.isAbsolute(relative) && relative.split('/').every(part => part && !['.', '..', '.git', 'node_modules', '.env', '.env.local'].includes(part)), 'Private/unsafe source entry')
    return { path: relative, bytes: Number(match[2]) }
  })
  assertDiskBudget({ path: directory, operation: 'unified source freeze', estimatedBytes: tree.reduce((sum, file) => sum + file.bytes, 0) * 2 + GiB })
  mkdirSync(directory, { mode: 0o700 })
  const workspace = path.join(directory, 'source'), archive = path.join(directory, 'source.tar')
  mkdirSync(workspace, { mode: 0o700 })
  const stages: string[] = []
  const run = (script: string, args: string[] = []) => {
    const scriptPath = regular(workspace, script)
    const output = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: workspace, maxBuffer: 16 * 1024 * 1024,
      env: { PATH: process.env.PATH, HOME: directory, LANG: 'en_US.UTF-8', NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false', CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    writeFileSync(path.join(directory, `${stages.length}.log`), output, { flag: 'wx', mode: 0o600 })
    stages.push(`${script} ${args.join(' ')}`.trim())
  }
  try {
    git(repo, ['archive', '--format=tar', `--output=${archive}`, input.commit])
    execFileSync('tar', ['-xf', archive, '-C', workspace])
    unlinkSync(archive)
    const originalFiles = new Map(unifiedTree(workspace).map(file => [file.path, file.sha256]))
    assert.deepEqual([...originalFiles.keys()].sort(), tree.map(file => file.path).sort(), 'Archive source inventory mismatch')
    run('packages/data/scripts/raw-inventory-contract.mjs', ['--release'])
    const azurNamesPath = 'packages/data/games/azur-promilia/raw-characters.json'
    if (candidate.files.some(source => source.sourcePath === azurNamesPath)) {
      const consumer = regular(workspace, AZUR_NAME_CONSUMER)
      writeFileSync(consumer, projectAzurRawNames(readFileSync(consumer, 'utf8'), readFileSync(regular(workspace, azurNamesPath), 'utf8')))
      stages.push('cms:project-azur-existing-raw-names-v1')
    }
    const ledger = JSON.parse(readFileSync(regular(workspace, 'packages/data/raw-content-review.json'), 'utf8')) as { pairs: string[] }
    const apply = (sources: SourceBytes[]) => {
      for (const source of sources) {
        writeFileSync(regular(workspace, source.sourcePath), source.text)
        if (source.sourcePath.startsWith('packages/data/games/')) {
          const relative = source.sourcePath.slice('packages/data/games/'.length)
          if (ledger.pairs.includes(relative)) writeFileSync(regular(workspace, `apps/web/public/data/${relative}`), source.text)
        }
      }
    }
    // Verify A's summaries before generating B; never erase inconsistent public-only values.
    apply(activeSources)
    const summarySources = plan.sources.filter(source => source.delegated === 'character-summary-generator')
    const activeSummaries = new Map(summarySources.map(source => [source.sourcePath, JSON.parse(readFileSync(regular(workspace, source.sourcePath), 'utf8'))]))
    run('packages/data/scripts/generate-character-summaries.mjs')
    for (const source of summarySources) assert(isDeepStrictEqual(JSON.parse(readFileSync(regular(workspace, source.sourcePath), 'utf8')),
      activeSummaries.get(source.sourcePath)), `Active summary differs from active characters; explicit reconciliation required: ${source.sourcePath}`)
    apply(candidate.files.map(file => ({ sourcePath: file.sourcePath, text: file.content, sha256: file.candidateSHA256 })))
    run('packages/data/scripts/generate-character-summaries.mjs')
    run('packages/data/scripts/generate-manifests.mjs')
    run('packages/data/scripts/verify-manifests.mjs')
    run('packages/data/scripts/raw-inventory-contract.mjs', ['--release'])
    const candidateByPath = new Map(candidate.files.map(file => [file.sourcePath, file.content]))
    const summaryPaths = new Set(summarySources.map(source => source.sourcePath))
    for (const source of activeSources) if (!summaryPaths.has(source.sourcePath)) {
      assert.equal(readFileSync(regular(workspace, source.sourcePath), 'utf8'), candidateByPath.get(source.sourcePath) ?? source.text, 'Generator changed a non-derived source')
    }
    const files = unifiedTree(workspace)
    assert([...originalFiles.keys()].every(file => files.some(row => row.path === file)), 'Generator removed a frozen input')
    const sourcePaths = new Set(plan.sources.map(source => source.sourcePath))
    const projection = (file: string) => sourcePaths.has(file)
      || file === AZUR_NAME_CONSUMER
      || /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(file)
    const modified: { path: string; sha256: string }[] = []
    for (const file of files) {
      if (originalFiles.get(file.path) === file.sha256) continue
      assert(projection(file.path), `Generator changed an unrelated input: ${file.path}`)
      modified.push(file)
    }
    const scope: { games: string[]; owners: string[]; services: string[]; localScope?: typeof GENSHIN_LOCAL_SCOPE; productionScope?: IndependentProductionScope } = local || independent || unifiedOwnerPlan(candidate.files.map(file => file.sourcePath), plan,
      JSON.parse(readFileSync(regular(workspace, 'packages/core/route-ownership.json'), 'utf8')))
    mkdirSync(path.join(directory, 'active'), { mode: 0o700 })
    const activeFiles = [...activeSources].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)).map((source, index) => {
      const file = `active/${index}.source`
      writeFileSync(path.join(directory, file), source.text, { flag: 'wx', mode: 0o600 })
      return { sourcePath: source.sourcePath, sha256: source.sha256, file }
    })
    const activePin = save(path.join(directory, 'active.json'), activeFiles)
    const filesPin = save(path.join(directory, 'files.json'), files)
    const manifest = { schemaVersion: 1, kind: 'unified_frozen_source', sourceCommit: input.commit, planSHA256: plan.planSHA256,
      candidate: candidate.manifest, ...scope, materialDependencies, sourceTreeSHA256: digest(canonical(files)), filesPin, activePin, modified, stages,
      publicationPolicy: COMMUNITY_PUBLICATION_POLICY, sourceAuthentication: 'not_required_by_operator', status: 'generated_source_only', productionReady: false, activationSupported: false,
      cloudWrites: false, websiteChanged: false,
      pending: ['domain and reference validation',
        'exact owner builds and consumer acceptance', 'compatible recovery', local ? 'frozen Main readback' : 'controlled multi-owner activation'] }
    const manifestPin = save(path.join(directory, 'manifest.json'), manifest)
    return { directory, workspace, manifestPin, ...manifest }
  } catch (error) {
    const failure = error as { message?: string; stdout?: Buffer; stderr?: Buffer }
    save(path.join(directory, 'failure.json'), { status: 'failed', stages, error: failure.message,
      stdout: failure.stdout?.toString().slice(-16384), stderr: failure.stderr?.toString().slice(-16384), cloudWrites: false })
    throw error
  } finally {
    // Only our disposable archive; retain failed source/evidence for diagnosis.
    try { unlinkSync(archive) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
}

export function verifyUnifiedFrozenSource(directory: string, pin: string) {
  assert(/^[a-f0-9]{64}$/.test(pin), 'External frozen manifest pin required')
  const root = path.resolve(directory)
  assert.equal(realpathSync(root), root, 'Linked frozen directory forbidden')
  const text = readFileSync(regular(root, 'manifest.json'), 'utf8')
  assert.equal(digest(text), pin, 'Frozen manifest changed')
  type Manifest = Omit<ReturnType<typeof freezeUnifiedContent>, 'directory' | 'workspace' | 'manifestPin'>
  const manifest = JSON.parse(text) as Manifest
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.kind, 'unified_frozen_source')
  assert.equal(manifest.status, 'generated_source_only'); assert.equal(manifest.sourceAuthentication, 'not_required_by_operator')
  assert.deepEqual(manifest.publicationPolicy, COMMUNITY_PUBLICATION_POLICY)
  for (const field of ['productionReady', 'activationSupported', 'cloudWrites', 'websiteChanged'] as const) assert.equal(manifest[field], false)
  const { candidateSHA256, ...candidate } = manifest.candidate
  assert.equal(digest(canonical(candidate)), candidateSHA256, 'Compiler manifest changed')
  assert.equal(candidate.productionReady, false); assert.equal(candidate.activationSupported, false); assert.equal(candidate.cloudWrites, false)
  const activeText = readFileSync(regular(root, 'active.json'), 'utf8')
  assert.equal(digest(activeText), manifest.activePin, 'Active source inventory changed')
  const activeFiles = JSON.parse(activeText) as { sourcePath: string; sha256: string; file: string }[]
  assert.deepEqual(activeFiles.map(({ sourcePath, sha256 }) => ({ sourcePath, sha256 })),
    candidate.baselines.map(({ sourcePath, activeSHA256 }) => ({ sourcePath, sha256: activeSHA256 })), 'Incomplete active sources')
  for (const [index, row] of activeFiles.entries()) {
    assert.equal(row.file, `active/${index}.source`)
    assert.equal(bytesSHA256(readFileSync(regular(root, row.file))), row.sha256, 'Active source bytes changed')
  }
  const filesText = readFileSync(regular(root, 'files.json'), 'utf8')
  assert.equal(digest(filesText), manifest.filesPin, 'Frozen inventory changed')
  const files = unifiedTree(path.join(root, 'source'), '', true)
  assert.deepEqual(files, JSON.parse(filesText), 'Frozen source files changed')
  assert.equal(digest(canonical(files)), manifest.sourceTreeSHA256, 'Frozen source tree changed')
  if (manifest.materialDependencies !== undefined) assert.deepEqual(manifest.materialDependencies, assertMaterialCandidateDependencies(
    activeFiles.map(row => ({ ...row, text: readFileSync(regular(root, row.file), 'utf8') })),
    candidate.files.map(row => ({ sourcePath: row.sourcePath, sha256: row.candidateSHA256, text: readFileSync(regular(path.join(root, 'source'), row.sourcePath), 'utf8') }))),
  'Material dependency gate receipt changed')
  const scoped = manifest as Manifest & { localScope?: typeof GENSHIN_LOCAL_SCOPE; productionScope?: IndependentProductionScope }
  assert(!(scoped.localScope && scoped.productionScope), 'Mixed source scopes')
  if (scoped.productionScope !== undefined) {
    assert([GENSHIN_PRODUCTION_SCOPE, NTE_PRODUCTION_SCOPE, AZUR_PROMILIA_PRODUCTION_SCOPE, LVMENG_PRODUCTION_SCOPE].includes(scoped.productionScope), 'Unknown production source scope')
    const independent = independentProductionOwnerScope(scoped.productionScope === NTE_PRODUCTION_SCOPE ? 'nte' : scoped.productionScope === AZUR_PROMILIA_PRODUCTION_SCOPE ? 'azur-promilia' : scoped.productionScope === LVMENG_PRODUCTION_SCOPE ? 'lvmeng' : 'genshin', manifest.candidate,
      activeFiles.map(row => ({ ...row, text: readFileSync(regular(root, row.file), 'utf8') })),
      candidate.files.map(row => ({ sourcePath: row.sourcePath, sha256: row.candidateSHA256, text: readFileSync(regular(path.join(root, 'source'), row.sourcePath), 'utf8') })))
    for (const key of ['games', 'owners', 'services'] as const) assert.deepEqual(manifest[key], independent[key])
  } else if (scoped.localScope !== undefined) {
    assert.equal(scoped.localScope, GENSHIN_LOCAL_SCOPE, 'Unknown local scope')
    const local = genshinLocalOwnerScope(manifest.candidate,
      activeFiles.map(row => ({ ...row, text: readFileSync(regular(root, row.file), 'utf8') })),
      candidate.files.map(row => ({ sourcePath: row.sourcePath, sha256: row.candidateSHA256,
        text: readFileSync(regular(path.join(root, 'source'), row.sourcePath), 'utf8') })))
    for (const key of ['games', 'owners', 'services'] as const) assert.deepEqual(manifest[key], local[key], 'Genshin-only owner plan changed')
  } else assert(manifest.owners.includes('main'), 'Main can only be omitted in the explicit Genshin local preview')
  return scoped
}
