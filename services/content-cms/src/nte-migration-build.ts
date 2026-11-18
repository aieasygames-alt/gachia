import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles, isolatedEnvironment, withRunLock } from '../../../scripts/desktop-publish.mjs'
import { assertDiskBudget, BUILD_TEMP_BUDGET } from '../../../scripts/desktop-disk-preflight.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { prepareNteMainCandidate, verifyNteMainCandidate } from '../../../scripts/nte-main-candidate.mjs'
import { nteContentAssets } from '../../../scripts/nte-content-assets.mjs'
import { verifyNteMigrationSource } from './nte-migration-source'
import { readNteSourceIndex } from './nte-release-history'

type Proof = { path: string; pin: string }
export async function buildNteMigration(source: Proof) {
  const opened = verifyNteMigrationSource(source), workspace = opened.workspace, parent = path.dirname(source.path)
  return withRunLock(parent, async () => {
    assertDiskBudget({ path: parent, operation: 'complete published A NTE migration build', estimatedBytes: BUILD_TEMP_BUDGET })
    const directory = path.join(parent, 'build'); assert(!existsSync(directory)); mkdirSync(directory, { mode: 0o700 }); mkdirSync(path.join(directory, 'home'))
    const env: NodeJS.ProcessEnv = { ...isolatedEnvironment(path.join(directory, 'home')), NODE_ENV: 'production', npm_config_manage_package_manager_versions: 'false',
      NTE_DEPLOYMENT_MODE: 'live', CLOUDFLARE_ENV: '', SKIP_NEXT_APP_BUILD: 'false', SKIP_WRANGLER_CONFIG_CHECK: 'false' }
    const stages: any[] = []
    const run = async (name: string, file: string, args: string[], cwd: string) => {
      const log = path.join(directory, name + '.log')
      await new Promise<void>((accept, reject) => {
        const child = spawn(file, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
        child.stdout.on('data', bytes => appendFileSync(log, bytes)); child.stderr.on('data', bytes => appendFileSync(log, bytes))
        child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(Error(`NTE migration ${name} failed (${code}); inspect ${log}`)))
      })
      stages.push({ name, file, args, logPin: digest(readFileSync(log)) }); verifyNteMigrationSource(source)
    }
    try {
      const store = execFileSync('pnpm', ['store', 'path'], { encoding: 'utf8' }).trim()
      await run('install', 'pnpm', ['install', '--offline', '--frozen-lockfile', '--ignore-scripts', '--prod=false', '--store-dir', store], workspace)
      for (const owner of ['nte', 'main']) {
        const cwd = path.join(workspace, 'apps', owner === 'main' ? 'web' : 'game-nte')
        await run(owner + '-runtime', process.execPath, [path.join(workspace, 'scripts/require-app-runtime.mjs')], cwd)
        await run(owner + '-build', 'pnpm', ['exec', 'opennextjs-cloudflare', 'build', '--config', 'wrangler.jsonc', '--env', ''], cwd)
        if (owner === 'nte') await run('nte-assets', process.execPath, [path.join(workspace, 'scripts/game-release.mjs'), 'prepare-assets', '--game', 'nte', '--environment', 'production'], cwd)
      }
      const main = await prepareNteMainCandidate(path.join(directory, 'main'), workspace), nte = path.join(directory, 'nte')
      cpSync(path.join(workspace, 'apps/game-nte/.open-next'), nte, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true })
      const expected = nteContentAssets(workspace)
      for (const [file, bytes] of expected.files) assert(readFileSync(path.join(nte, 'assets', expected.contract.prefix, file)).equals(bytes))
      const value = { schemaVersion: 1, kind: 'nte_migration_build', source, sourceCommit: opened.value.sourceCommit,
        sourceIndex: opened.value.sourceIndex, active: opened.value.active, stages, mainCandidate: main.proof,
        artifacts: { main: { directory: main.artifact, tree: migrationSave(directory, 'main-tree.json', artifactFiles(main.artifact)) },
          nte: { directory: nte, tree: migrationSave(directory, 'nte-tree.json', artifactFiles(nte)) } },
        contentVersion: expected.manifest.version, editorialChanges: [], cloudWrites: false, productionReady: false }
      const proof = migrationSave(directory, 'build.json', value); verifyNteMigrationBuild(proof); return { proof, value }
    } catch (error) { migrationSave(directory, 'failure.json', { error: (error as Error).message, stages, cloudWrites: false }); throw error }
  })
}
export function verifyNteMigrationBuild(proof: Proof) {
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'build.json')); assert(!existsSync(path.join(directory, 'failure.json')))
  assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'nte_migration_build'); assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false)
  assert.deepEqual(value.editorialChanges, [])
  const source = verifyNteMigrationSource(value.source), main = verifyNteMainCandidate(value.mainCandidate)
  assert.equal(value.sourceCommit, source.value.sourceCommit); assert.deepEqual(value.sourceIndex, source.value.sourceIndex); assert.deepEqual(value.active, source.value.active)
  assert.equal(value.artifacts.main.directory, main.artifact); assert.equal(value.artifacts.nte.directory, path.join(directory, 'nte'))
  for (const owner of ['main', 'nte']) assert.deepEqual(artifactFiles(value.artifacts[owner].directory), migrationPinned(value.artifacts[owner].tree))
  const expected = nteContentAssets(source.workspace); assert.equal(value.contentVersion, expected.manifest.version)
  for (const [file, bytes] of expected.files) assert(readFileSync(path.join(value.artifacts.nte.directory, 'assets', expected.contract.prefix, file)).equals(bytes))
  assert.deepEqual(value.stages.map((row: any) => row.name), ['install', 'nte-runtime', 'nte-build', 'nte-assets', 'main-runtime', 'main-build'])
  for (const row of value.stages) assert.equal(digest(readFileSync(path.join(directory, row.name + '.log'))), row.logPin)
  return { value, directory, source, workspace: source.workspace, expected }
}

// R128 is a source-only NTE data correction. It deliberately reuses the
// published R127 source as recovery while applying only the committed NTE
// material relationship source to the candidate workspace. This path never
// reads or invents a CMS editorial record.
export async function buildNteDataOnly(input: { repo: string; commit: string; sourceIndex: Proof; directory: string }) {
  const directory = path.resolve(input.directory)
  assert(!existsSync(directory)); mkdirSync(directory, { mode: 0o700 })
  const current = await readNteSourceIndex(input.sourceIndex), sourceDirectory = path.join(directory, 'source-input'), workspace = path.join(sourceDirectory, 'source')
  assert.equal(current.sources.length, 115); mkdirSync(sourceDirectory, { mode: 0o700 }); mkdirSync(workspace, { mode: 0o700 })
  const archive = path.join(sourceDirectory, 'source.tar'), git = (args: string[]) => execFileSync('git', ['--no-replace-objects', ...args], { cwd: input.repo, maxBuffer: 32 * 1024 * 1024 })
  git(['archive', '--format=tar', `--output=${archive}`, input.commit]); execFileSync('tar', ['-xf', archive, '-C', workspace]); unlinkSync(archive)
  const ledger = JSON.parse(readFileSync(path.join(workspace, 'packages/data/raw-content-review.json'), 'utf8'))
  for (const row of current.sources) {
    writeFileSync(path.join(workspace, row.sourcePath), row.text)
    const relative = row.sourcePath.slice('packages/data/games/'.length)
    if (row.sourcePath.startsWith('packages/data/games/') && ledger.pairs.includes(relative)) writeFileSync(path.join(workspace, 'apps/web/public/data', relative), row.text)
  }
  const materialPath = 'packages/data/games/nte/raw-character-materials.json'
  const baseline = current.sources
  const material = baseline.find((row: any) => row.sourcePath === materialPath)
  assert(material, 'R128 material source is not in the published source inventory')
  const candidateText = git(['show', `${input.commit}:${materialPath}`]).toString('utf8')
  assert.equal(digest(candidateText), digest(git(['show', `${input.commit}:${materialPath}`])), 'Candidate source is not stable')
  writeFileSync(path.join(workspace, materialPath), candidateText)
  const mirror = path.join(workspace, 'apps/web/public/data/nte/raw-character-materials.json')
  writeFileSync(mirror, candidateText)
  const runNames = ['generate-character-summaries.mjs', 'generate-manifests.mjs', 'verify-manifests.mjs', 'raw-inventory-contract.mjs']
  const stages: any[] = []
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: directory, LANG: 'en_US.UTF-8', NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false', CI: 'true' }
  const runScript = (script: string, args: string[] = []) => {
    const log = path.join(directory, `${stages.length}-${script}.log`)
    const bytes = execFileSync(process.execPath, [path.join(workspace, 'packages/data/scripts', script), ...args], { cwd: workspace, env, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
    writeFileSync(log, bytes, { flag: 'wx', mode: 0o600 }); stages.push({ name: script, logPin: digest(bytes) })
  }
  runScript(runNames[0]); runScript(runNames[1]); runScript(runNames[2]); runScript(runNames[3], ['--release'])
  const baselineRows = baseline.map((row: any) => ({ sourcePath: row.sourcePath, sha256: row.sha256 }))
  const candidate = baselineRows.map((row: any, index: number) => {
    const text = readFileSync(path.join(workspace, row.sourcePath), 'utf8'), file = `candidate/${index}.source`
    mkdirSync(path.join(directory, 'candidate'), { recursive: true, mode: 0o700 }); writeFileSync(path.join(directory, file), text, { flag: 'wx', mode: 0o600 })
    return { sourcePath: row.sourcePath, sha256: digest(text), file }
  })
  const changed = candidate.filter((row: any, index: number) => row.sha256 !== baseline[index].sha256).map((row: any) => row.sourcePath)
  assert.deepEqual(changed, [materialPath], 'R128 data-only build changed an unapproved source')
  const store = execFileSync('pnpm', ['store', 'path'], { encoding: 'utf8' }).trim()
  const installLog = path.join(directory, 'install.log')
  execFileSync('pnpm', ['install', '--offline', '--frozen-lockfile', '--ignore-scripts', '--prod=false', '--store-dir', store], { cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe'] })
  writeFileSync(installLog, 'pnpm install --offline --frozen-lockfile\n', { flag: 'wx', mode: 0o600 }); stages.push({ name: 'install', logPin: digest(readFileSync(installLog)) })
  const buildEnv = { ...env, NTE_DEPLOYMENT_MODE: 'live', CLOUDFLARE_ENV: '', SKIP_NEXT_APP_BUILD: 'false', SKIP_WRANGLER_CONFIG_CHECK: 'false' }
  const cwd = path.join(workspace, 'apps/game-nte')
  const runtimeLog = path.join(directory, 'nte-runtime.log')
  execFileSync(process.execPath, [path.join(workspace, 'scripts/require-app-runtime.mjs')], { cwd, env: buildEnv, stdio: ['ignore', 'pipe', 'pipe'] }); writeFileSync(runtimeLog, 'runtime\n', { flag: 'wx', mode: 0o600 }); stages.push({ name: 'nte-runtime', logPin: digest(readFileSync(runtimeLog)) })
  const nteLog = path.join(directory, 'nte-build.log')
  execFileSync('pnpm', ['exec', 'opennextjs-cloudflare', 'build', '--config', 'wrangler.jsonc', '--env', ''], { cwd, env: buildEnv, stdio: ['ignore', 'pipe', 'pipe'] }); writeFileSync(nteLog, 'opennext build\n', { flag: 'wx', mode: 0o600 }); stages.push({ name: 'nte-build', logPin: digest(readFileSync(nteLog)) })
  const assetsLog = path.join(directory, 'nte-assets.log')
  execFileSync(process.execPath, [path.join(workspace, 'scripts/game-release.mjs'), 'prepare-assets', '--game', 'nte', '--environment', 'production'], { cwd, env: buildEnv, stdio: ['ignore', 'pipe', 'pipe'] }); writeFileSync(assetsLog, 'prepare-assets\n', { flag: 'wx', mode: 0o600 }); stages.push({ name: 'nte-assets', logPin: digest(readFileSync(assetsLog)) })
  const artifact = path.join(directory, 'artifacts/nte'); mkdirSync(path.dirname(artifact), { recursive: true, mode: 0o700 }); cpSync(path.join(cwd, '.open-next'), artifact, { recursive: true, verbatimSymlinks: true, force: false, errorOnExist: true })
  const expected = nteContentAssets(workspace)
  for (const [file, bytes] of expected.files) assert(readFileSync(path.join(artifact, 'assets', expected.contract.prefix, file)).equals(bytes))
  const value = { schemaVersion: 1, kind: 'nte_data_only_build', sourceIndex: input.sourceIndex, sourceCommit: input.commit,
    baseline: migrationSave(directory, 'baseline.json', baseline), candidate: migrationSave(directory, 'candidate.json', candidate), stages, workspace,
    artifacts: { nte: { directory: artifact, tree: migrationSave(directory, 'nte-tree.json', artifactFiles(artifact)) } },
    contentVersion: expected.manifest.version, changedPaths: changed, cloudWrites: false, productionReady: false }
  const proof = migrationSave(directory, 'build.json', value); verifyNteDataOnlyBuild(proof); return { proof, value, directory, workspace, candidateSources: candidate, expected }
}

export function verifyNteDataOnlyBuild(proof: Proof) {
  const value = migrationPinned(proof), directory = path.dirname(proof.path)
  assert.equal(proof.path, path.join(directory, 'build.json')); assert.equal(value.schemaVersion, 1); assert.equal(value.kind, 'nte_data_only_build')
  assert.equal(value.cloudWrites, false); assert.equal(value.productionReady, false); assert.deepEqual(value.changedPaths, ['packages/data/games/nte/raw-character-materials.json'])
  const baseline = migrationPinned(value.baseline), candidate = migrationPinned(value.candidate)
  assert.equal(candidate.length, baseline.length); assert.equal(candidate.length, 115)
  const changed = candidate.filter((row: any, index: number) => row.sha256 !== baseline[index].sha256).map((row: any) => row.sourcePath)
  assert.deepEqual(changed, value.changedPaths)
  for (const row of candidate) assert.equal(digest(readFileSync(path.join(directory, row.file), 'utf8')), row.sha256)
  assert.equal(value.artifacts.nte.directory, path.join(directory, 'artifacts/nte'))
  assert.deepEqual(artifactFiles(value.artifacts.nte.directory), migrationPinned(value.artifacts.nte.tree))
  const expected = nteContentAssets(value.workspace); assert.equal(value.contentVersion, expected.manifest.version)
  for (const [file, bytes] of expected.files) assert(readFileSync(path.join(value.artifacts.nte.directory, 'assets', expected.contract.prefix, file)).equals(bytes))
  return { value, directory, workspace: value.workspace, expected, candidateSources: candidate }
}
