import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { artifactFiles, isolatedEnvironment, withRunLock } from '../../../scripts/desktop-publish.mjs'
import { assertDiskBudget, BUILD_TEMP_BUDGET } from '../../../scripts/desktop-disk-preflight.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { migrationPinned, migrationSave } from '../../../scripts/genshin-migration-http.mjs'
import { prepareNteMainCandidate, verifyNteMainCandidate } from '../../../scripts/nte-main-candidate.mjs'
import { nteContentAssets } from '../../../scripts/nte-content-assets.mjs'
import { verifyNteMigrationSource } from './nte-migration-source'

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
