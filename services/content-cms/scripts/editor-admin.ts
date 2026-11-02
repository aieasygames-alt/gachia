import { cmsEnvironment } from '../src/cms-environment'
import type { PostgresAdapter } from '@payloadcms/db-postgres'

const runtime = cmsEnvironment()
if (runtime.database !== 'postgres') throw new Error('Use local:admin for SQLite experiments.')
const email = process.env.CMS_ADMIN_EMAIL
const password = process.env.CMS_ADMIN_PASSWORD
if (!email || !password || password.length < 16) throw new Error('Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD (at least 16 characters).')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Bootstrap requires a real transaction.')
  try {
    // Serialize competing CLI bootstraps; the HTTP first-register route stays closed.
    const { sql } = await import('@payloadcms/db-postgres')
    const transaction = payload.db.sessions?.[transactionID]?.db as PostgresAdapter['drizzle'] | undefined
    if (!transaction) throw new Error('PostgreSQL transaction session is missing.')
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(710031001)`)
    const req = { transactionID }
    const existing = await payload.count({ collection: 'users', req, overrideAccess: true })
    if (existing.totalDocs !== 0) throw new Error('Bootstrap refused: users already exist. No account was changed.')
    await payload.create({ collection: 'users', req, overrideAccess: true, data: { email, password, role: 'admin' } })
    await payload.db.commitTransaction(transactionID)
    console.log('CMS administrator created. Credentials are not printed.')
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
} finally {
  await payload.destroy()
}
