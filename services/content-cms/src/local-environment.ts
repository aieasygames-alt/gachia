import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function localEnvironment(env: Record<string, string | undefined> = process.env) {
  if (env.CMS_LOCAL_ONLY !== '1') {
    throw new Error('This feasibility app requires CMS_LOCAL_ONLY=1; production is not supported.')
  }
  if (!env.PAYLOAD_SECRET || env.PAYLOAD_SECRET.length < 32) {
    throw new Error('Provide a disposable PAYLOAD_SECRET of at least 32 characters.')
  }
  if (env.DATABASE_URL || env.D1_DATABASE_ID || env.R2_BUCKET || env.PAYLOAD_PUBLIC_SERVER_URL) {
    throw new Error('Remote database/storage/server configuration is forbidden in this local app.')
  }
  const namespace = env.CMS_LOCAL_NAMESPACE || 'development'
  if (!/^[a-z0-9-]{1,64}$/.test(namespace)) throw new Error('Invalid local namespace.')
  const directory = path.join(projectRoot, '.local', namespace)
  return { directory, secret: env.PAYLOAD_SECRET, databaseURL: `file:${path.join(directory, 'cms.db')}` }
}
