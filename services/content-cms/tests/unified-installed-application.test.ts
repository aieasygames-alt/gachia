import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { verifyUnifiedInstalledApplication } from '../src/unified-installed-application'

for (const fault of ['none', 'settings', 'linked-settings', 'pin', 'manifest-path', 'commit', 'build', 'source', 'missing-source',
  'application', 'release', 'empty-release', 'array-files', 'traversal', 'digest', 'late-change']) {
  test(`real installed application verification: ${fault}`, t => {
    const directory = realpathSync(mkdtempSync(path.join(tmpdir(), 'unified-install-')))
    t.after(() => rmSync(directory, { recursive: true, force: true }))
    const repo = path.join(directory, 'repo'), root = path.join(directory, 'desktop')
    const release = path.join(root, 'releases', 'fixture'), app = path.join(release, 'services/content-cms')
    const write = (file: string, bytes: string) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, bytes) }
    write(path.join(repo, 'services/content-cms/src/example.ts'), 'export const value = 1\n')
    write(path.join(repo, 'services/content-cms/scripts/check.ts'), 'export const check = true\n')
    const git = (...args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
    git('init', '--quiet'); git('add', '.')
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'fixture')
    const commit = git('rev-parse', 'HEAD')
    const files: Record<string, string> = {}
    for (const name of ['src/example.ts', 'scripts/check.ts']) {
      const bytes = readFileSync(path.join(repo, 'services/content-cms', name), 'utf8')
      write(path.join(app, name), bytes); files[name] = digest(bytes)
    }
    write(path.join(app, '.next/BUILD_ID'), 'fixture-build\n')
    write(path.join(app, '.next/server.js'), 'fixture runtime'); files['.next/server.js'] = digest('fixture runtime')
    write(path.join(release, 'scripts/runtime.mjs'), 'fixture release')
    const releaseFiles: Record<string, string> = { 'scripts/runtime.mjs': digest('fixture release') }
    const manifest = { schemaVersion: 1, app, sourceCommit: commit, buildID: 'fixture-build', files, releaseFiles }
    const settings = path.join(root, 'settings.json')
    write(settings, JSON.stringify({ app }))
    if (fault === 'settings') write(settings, JSON.stringify({ app: repo }))
    if (fault === 'linked-settings') {
      write(path.join(directory, 'settings.json'), JSON.stringify({ app })); rmSync(settings); symlinkSync(path.join(directory, 'settings.json'), settings)
    }
    if (fault === 'commit') manifest.sourceCommit = 'a'.repeat(40)
    if (fault === 'build') write(path.join(app, '.next/BUILD_ID'), 'other-build')
    if (fault === 'source') { write(path.join(app, 'src/example.ts'), 'changed'); files['src/example.ts'] = digest('changed') }
    if (fault === 'missing-source') delete files['scripts/check.ts']
    if (fault === 'application') write(path.join(app, '.next/server.js'), 'changed')
    if (fault === 'release') write(path.join(release, 'scripts/runtime.mjs'), 'changed')
    if (fault === 'empty-release') manifest.releaseFiles = {}
    if (fault === 'array-files') Object.assign(manifest, { files: [] })
    if (fault === 'traversal') files['../escape'] = digest('escape')
    if (fault === 'digest') releaseFiles['scripts/runtime.mjs'] = 'invalid'
    const file = path.join(release, fault === 'manifest-path' ? 'other.json' : 'application-manifest.json')
    const bytes = JSON.stringify(manifest); write(file, bytes)
    const proof = { path: file, pin: fault === 'pin' ? '0'.repeat(64) : digest(bytes) }
    const verify = () => verifyUnifiedInstalledApplication(root, repo, commit, proof)
    if (fault === 'none') assert.doesNotThrow(verify)
    else if (fault === 'late-change') {
      verify(); write(path.join(app, '.next/server.js'), 'changed after first verification')
      assert.throws(verify, /Installed application integrity changed/)
    } else assert.throws(verify)
  })
}
