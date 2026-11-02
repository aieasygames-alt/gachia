import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { cpSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'

test('cold backup restores into a separate process after loss of the disposable original', { timeout: 60000 }, () => {
  const id = randomUUID()
  const seed = `recovery-${id}`
  const restored = `recovery-restored-${id}`
  const original = path.join(projectRoot, '.local', seed)
  const backup = path.join(projectRoot, '.local', `recovery-backup-${id}`)
  const target = path.join(projectRoot, '.local', restored)
  const env = { ...process.env, CMS_LOCAL_ONLY: '1', PAYLOAD_SECRET: randomUUID() + randomUUID(), CMS_RECOVERY_PASSWORD: randomUUID() + 'Aa1!' }
  const run = (mode: string, namespace: string) => {
    const result = spawnSync(process.execPath, [path.join(projectRoot, 'node_modules/tsx/dist/cli.mjs'), 'scripts/recovery-fixture.ts', mode], { cwd: projectRoot, env: { ...env, CMS_LOCAL_NAMESPACE: namespace }, encoding: 'utf8', timeout: 25000 })
    assert.equal(result.status, 0, result.stdout + result.stderr + (result.error?.message || ''))
  }
  const manifest = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    assert.ok(!entry.isSymbolicLink())
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? manifest(file).map(value => `${entry.name}/${value}`) : [`${entry.name}:${createHash('sha256').update(readFileSync(file)).digest('hex')}`]
  })
  try {
    run('seed', seed)
    // The child has exited and closed Payload; this intentionally tests cold, not live, backup.
    const expected = manifest(original)
    cpSync(original, backup, { recursive: true, errorOnExist: true, force: false })
    assert.deepEqual(manifest(backup), expected)
    rmSync(original, { recursive: true })
    cpSync(backup, target, { recursive: true, errorOnExist: true, force: false })
    assert.deepEqual(manifest(target), expected)
    run('verify', restored)
    assert.deepEqual(manifest(backup), expected)
  } finally {
    for (const directory of [original, backup, target]) rmSync(directory, { recursive: true, force: true })
  }
})
