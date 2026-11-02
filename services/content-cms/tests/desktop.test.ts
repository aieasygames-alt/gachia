import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cmsEnvironment } from '../src/cms-environment'
import { desktopRequestAllowed } from '../src/desktop-boundary'

const env = { CMS_MODE: 'desktop', PAYLOAD_SECRET: 'test-only-disposable-secret-32-characters',
  DATABASE_URL: 'postgres://app:password@127.0.0.1:54329/gachia_cms', CMS_DATA_DIR: '/var/lib/gachia-desktop', CMS_SERVER_URL: 'http://127.0.0.1:3100' }
test('desktop is durable PostgreSQL without schema push and refuses remote/CI/test configuration', () => {
  const config = cmsEnvironment(env)
  assert.equal(config.schemaPush, false)
  assert.equal(config.secureCookies, false)
  assert.equal(config.database, 'postgres')
  for (const key of ['CI', 'GITHUB_ACTIONS', 'CMS_LOCAL_ONLY', 'CMS_SHADOW_READER', 'CMS_PG_SCHEMA_PUSH', 'PAYLOAD_DROP_DATABASE']) {
    assert.throws(() => cmsEnvironment({ ...env, [key]: '1' }))
  }
  assert.throws(() => cmsEnvironment({ ...env, DATABASE_URL: env.DATABASE_URL.replace('127.0.0.1', 'example.com') }))
  assert.throws(() => cmsEnvironment({ ...env, CMS_SERVER_URL: 'http://localhost:3100' }))
})
test('desktop HTTP boundary rejects rebinding, foreign origins and cross-site requests', () => {
  const headers = new Headers({ host: '127.0.0.1:3100' })
  assert.ok(desktopRequestAllowed(headers))
  headers.set('origin', 'http://127.0.0.1:3100')
  assert.ok(desktopRequestAllowed(headers))
  headers.set('origin', 'https://attacker.invalid')
  assert.equal(desktopRequestAllowed(headers), false)
  headers.delete('origin')
  headers.set('host', 'attacker.invalid')
  assert.equal(desktopRequestAllowed(headers), false)
  headers.set('host', '127.0.0.1:3100')
  headers.set('sec-fetch-site', 'cross-site')
  assert.equal(desktopRequestAllowed(headers), false)
})
