import path from 'node:path'
import { localEnvironment, projectRoot } from './local-environment'

type Env = Record<string, string | undefined>
function origin(value: string | undefined, production: boolean) {
  const url = new URL(value ?? (production ? 'invalid:' : 'http://127.0.0.1:3100'))
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || (production ? url.protocol !== 'https:' : url.protocol !== 'http:' || url.hostname !== '127.0.0.1')) throw new Error('Invalid CMS_SERVER_URL origin')
  return url.origin
}

export function cmsEnvironment(env: Env = process.env) {
  const mode = env.CMS_MODE ?? 'sqlite-local'
  if (mode === 'sqlite-local') return { ...localEnvironment(env), mode, database: 'sqlite' as const, serverURL: origin(undefined, false), secureCookies: false, schemaPush: true, databaseTLS: false }
  if (!['postgres-local', 'editor', 'desktop'].includes(mode)) throw new Error('Unsupported CMS_MODE')
  if (env.PAYLOAD_DROP_DATABASE) throw new Error('PAYLOAD_DROP_DATABASE is forbidden in PostgreSQL modes')
  if (!env.PAYLOAD_SECRET || env.PAYLOAD_SECRET.length < 32) throw new Error('PAYLOAD_SECRET must contain at least 32 characters')
  if (env.D1_DATABASE_ID || env.R2_BUCKET) throw new Error('This deployment uses PostgreSQL and a private persistent media volume')
  const database = new URL(env.DATABASE_URL ?? 'invalid:')
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.username || !database.password
    || !database.hostname || !database.pathname || database.pathname === '/' || database.search || database.hash) throw new Error('A PostgreSQL DATABASE_URL without query overrides is required')
  if (mode === 'postgres-local') {
    if (env.CMS_LOCAL_ONLY !== '1' || database.hostname !== '127.0.0.1' || !/^\/cms_probe_[a-z0-9_]+$/.test(database.pathname)) throw new Error('PostgreSQL probe requires an isolated loopback cms_probe_* database')
    const namespace = env.CMS_LOCAL_NAMESPACE
    if (!namespace || !/^pg-probe-[a-z0-9-]+$/.test(namespace)) throw new Error('PostgreSQL probe requires a pg-probe-* namespace')
    return { mode, secret: env.PAYLOAD_SECRET, database: 'postgres' as const, databaseURL: database.toString(), databaseTLS: false,
      directory: path.join(projectRoot, '.local', namespace), serverURL: origin(env.CMS_SERVER_URL, false), secureCookies: false,
      schemaPush: env.CMS_PG_SCHEMA_PUSH === '1' }
  }
  if (env.CMS_LOCAL_ONLY || env.CMS_SHADOW_READER || env.CMS_PG_SCHEMA_PUSH || env.CMS_LOCAL_NAMESPACE) throw new Error('Editor deployment must not enable local fixtures or schema push')
  const directory = env.CMS_DATA_DIR
  if (!directory || !path.isAbsolute(directory) || path.normalize(directory) !== directory || directory === path.parse(directory).root
    || directory === projectRoot || directory.startsWith(projectRoot + path.sep)) throw new Error('CMS_DATA_DIR must be a dedicated absolute persistent directory outside the checkout')
  if (!['require', 'disable'].includes(env.CMS_DATABASE_TLS ?? 'require')) throw new Error('CMS_DATABASE_TLS must be require or disable')
  if (mode === 'desktop') {
    if (env.CI || env.GITHUB_ACTIONS || database.hostname !== '127.0.0.1' || database.pathname !== '/gachia_cms') throw new Error('Desktop CMS requires a local gachia_cms database and cannot run in CI')
    if (env.CMS_SERVER_URL !== 'http://127.0.0.1:3100') throw new Error('Desktop CMS requires the fixed loopback origin')
    return { mode, secret: env.PAYLOAD_SECRET, database: 'postgres' as const, databaseURL: database.toString(), directory,
      databaseTLS: false, serverURL: env.CMS_SERVER_URL, secureCookies: false, schemaPush: false }
  }
  return { mode, secret: env.PAYLOAD_SECRET, database: 'postgres' as const, databaseURL: database.toString(), directory,
    databaseTLS: env.CMS_DATABASE_TLS !== 'disable', serverURL: origin(env.CMS_SERVER_URL, true), secureCookies: true, schemaPush: false }
}
