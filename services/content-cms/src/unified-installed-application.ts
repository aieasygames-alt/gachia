import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { assertUnifiedInstalledApplication, readPinnedUnifiedInput } from './unified-desktop'

function filePins(value: unknown): Record<string, string> {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Installed file inventory required')
  const entries = Object.entries(value)
  assert(entries.length > 0, 'Installed file inventory must not be empty')
  for (const [name, pin] of entries) {
    assert(name && !path.isAbsolute(name) && name.split('/').every(part => part && part !== '.' && part !== '..'), 'Invalid installed file path')
    assert(typeof pin === 'string' && /^[a-f0-9]{64}$/.test(pin), 'Invalid installed file digest')
  }
  return value as Record<string, string>
}

// The production caller fixes the desktop root; tests use an isolated real installation.
export function verifyUnifiedInstalledApplication(root: string, repo: string, sourceCommit: string, proof: { path: string; pin: string }) {
  assert(/^[a-f0-9]{40}$/.test(sourceCommit), 'Exact installed source commit required')
  const application = readPinnedUnifiedInput(proof.path, proof.pin) as Record<string, unknown>
  assert(application && typeof application === 'object' && !Array.isArray(application))
  assert.equal(application.schemaVersion, 1)
  assert(typeof application.app === 'string')
  const app = application.app
  assertUnifiedInstalledApplication(root, app)
  assert.equal(proof.path, path.resolve(app, '../..', 'application-manifest.json'))
  assert.equal(application.sourceCommit, sourceCommit)
  assert(typeof application.buildID === 'string' && application.buildID.length > 0, 'Installed build ID required')
  assert.equal(readFileSync(path.join(app, '.next/BUILD_ID'), 'utf8').trim(), application.buildID)
  const files = filePins(application.files), releaseFiles = filePins(application.releaseFiles)
  const sources = execFileSync('git', ['ls-tree', '-r', '--name-only', sourceCommit, 'services/content-cms/src', 'services/content-cms/scripts'],
    { cwd: repo, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim().split('\n')
  assert(sources[0], 'Reviewed CMS source inventory required')
  for (const source of sources) {
    const original = execFileSync('git', ['show', `${sourceCommit}:${source}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 })
    assert.equal(files[source.slice('services/content-cms/'.length)], digest(original), 'Installed source is not the exact reviewed commit')
  }
  for (const [name, pin] of Object.entries(files)) {
    assert.equal(digest(readFileSync(path.join(app, name))), pin, 'Installed application integrity changed')
  }
  for (const [name, pin] of Object.entries(releaseFiles)) {
    assert.equal(digest(readFileSync(path.resolve(app, '../..', name))), pin, 'Installed release integrity changed')
  }
}
