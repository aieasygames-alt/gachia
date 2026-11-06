import assert from 'node:assert/strict'
import { lstatSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { diskSpace } from '../../scripts/desktop-disk-preflight.mjs'
import { verifyUnifiedPreviewContract } from '../../services/content-cms/src/unified-preview'

assert.deepEqual(process.argv.slice(2), ['--remove-own-frozen-dependencies'])
const report = path.dirname(fileURLToPath(import.meta.url)), prior = path.resolve(report, '../payload-desktop-unified-2026-11-06-r46')
const previewPin = 'bfa4097e1983e8395b5acf0c8b3cf160684a305463ebe03f7f2dcc675a639bea'
assert.equal(JSON.parse(readFileSync(path.join(report, 'local-audit-02.json'), 'utf8')).status, 'local_editorial_seal_reverified_not_cloud_authorized')
await verifyUnifiedPreviewContract(path.join(prior, 'preview-01'), previewPin)
const source = path.join(prior, 'frozen-ananta-01/source'), modules = path.join(source, 'node_modules')
assert.equal(realpathSync(source), source); assert.equal(realpathSync(modules), modules); assert(lstatSync(modules).isDirectory())
const links: string[] = []
for (const base of ['apps', 'packages']) for (const entry of readdirSync(path.join(source, base), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const directory = path.join(source, base, entry.name, 'node_modules')
  let stat
  try { stat = lstatSync(directory) } catch (error) { assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT'); continue }
  assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Unexpected linked dependency container')
  assert.equal(realpathSync(directory), directory)
  for (const dependency of readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!dependency.isSymbolicLink()) continue
    const target = realpathSync(path.join(dependency.parentPath, dependency.name))
    assert(target.startsWith(modules + path.sep) || target.startsWith(path.join(source, 'packages') + path.sep), 'Foreign frozen dependency link')
  }
  links.push(directory)
}
const before = diskSpace(prior)
for (const directory of links) rmSync(directory, { recursive: true, force: false })
rmSync(modules, { recursive: true, force: false })
await verifyUnifiedPreviewContract(path.join(prior, 'preview-01'), previewPin)
const result = { status: 'own_frozen_dependencies_removed_seals_reverified', before, after: diskSpace(prior), removed: [modules, ...links],
  previewPin, sourcesArtifactsReceiptsAndRecoveryRetained: true, installedApplicationUntouched: true, cloudWrites: false }
writeFileSync(path.join(report, 'cleanup.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
console.log(JSON.stringify(result))
