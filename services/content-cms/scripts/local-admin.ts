import { localEnvironment } from '../src/local-environment'

localEnvironment()
const email = process.env.CMS_ADMIN_EMAIL
const password = process.env.CMS_ADMIN_PASSWORD
if (!email || !password || password.length < 16) throw new Error('Set CMS_ADMIN_EMAIL and a CMS_ADMIN_PASSWORD of at least 16 characters.')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const existing = await payload.count({ collection: 'users', overrideAccess: true })
  if (existing.totalDocs !== 0) throw new Error('Bootstrap refused: users already exist. No account was changed.')
  await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, role: 'admin' } })
  console.log('Local administrator created. Credentials are not printed; no public-site account was created.')
} finally {
  await payload.destroy()
}
