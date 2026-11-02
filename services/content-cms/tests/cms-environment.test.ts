import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cmsEnvironment } from '../src/cms-environment'

const editor = { CMS_MODE: 'editor', PAYLOAD_SECRET: 'test-only-disposable-secret-32-characters', DATABASE_URL: 'postgres://test:password@postgres/cms', CMS_SERVER_URL: 'https://cms.example.invalid', CMS_DATA_DIR: '/var/lib/payload' }
test('editor runtime requires HTTPS, isolated storage and explicit migrations without local gates', () => {
  const result = cmsEnvironment(editor)
  assert.equal(result.database, 'postgres'); assert.equal(result.schemaPush, false)
  assert.equal(result.secureCookies, true); assert.equal(result.databaseTLS, true)
  for (const key of ['CMS_LOCAL_ONLY', 'CMS_SHADOW_READER', 'CMS_PG_SCHEMA_PUSH', 'CMS_LOCAL_NAMESPACE']) assert.throws(() => cmsEnvironment({ ...editor, [key]: '1' }), /local/)
  for (const url of ['http://cms.example.invalid', 'https://cms.example.invalid/path', 'https://user:pass@cms.example.invalid']) assert.throws(() => cmsEnvironment({ ...editor, CMS_SERVER_URL: url }), /origin/)
  for (const dir of ['relative', '/', '/var/lib/../tmp']) assert.throws(() => cmsEnvironment({ ...editor, CMS_DATA_DIR: dir }), /directory/)
  assert.throws(() => cmsEnvironment({ ...editor, DATABASE_URL: editor.DATABASE_URL + '?sslmode=disable' }), /DATABASE_URL/)
  assert.throws(() => cmsEnvironment({ ...editor, PAYLOAD_DROP_DATABASE: 'true' }), /forbidden/)
  assert.throws(() => cmsEnvironment({ ...editor, DATABASE_URL: 'postgres://test:password@postgres' }), /DATABASE_URL/)
})
test('postgres experiments cannot point at a real database or arbitrary namespace', () => {
  const probe = { CMS_MODE: 'postgres-local', CMS_LOCAL_ONLY: '1', PAYLOAD_SECRET: editor.PAYLOAD_SECRET, CMS_LOCAL_NAMESPACE: 'pg-probe-test', DATABASE_URL: 'postgres://probe:password@127.0.0.1:5432/cms_probe_test' }
  assert.equal(cmsEnvironment(probe).schemaPush, false)
  assert.equal(cmsEnvironment({ ...probe, CMS_PG_SCHEMA_PUSH: '1' }).schemaPush, true)
  assert.throws(() => cmsEnvironment({ ...probe, DATABASE_URL: probe.DATABASE_URL.replace('127.0.0.1', 'db.example.invalid') }), /loopback/)
  assert.throws(() => cmsEnvironment({ ...probe, DATABASE_URL: probe.DATABASE_URL.replace('cms_probe_test', 'production') }), /loopback/)
  assert.throws(() => cmsEnvironment({ ...probe, CMS_LOCAL_NAMESPACE: '../other' }), /namespace/)
  assert.throws(() => cmsEnvironment({ CMS_MODE: 'unknown' }), /Unsupported/)
})
