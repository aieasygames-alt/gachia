import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { localSQLiteAdapter } from './local-sqlite'
import { editorPostgresAdapter } from './postgres'
import { buildConfig } from 'payload'
import { collections } from './collections'
import { projectRoot } from './local-environment'
import { cmsEnvironment } from './cms-environment'
import { verifySourceTask } from './local-jobs'

const runtime = cmsEnvironment()
mkdirSync(runtime.directory, { recursive: true, mode: 0o700 })

export default buildConfig({
  secret: runtime.secret,
  serverURL: runtime.serverURL,
  cors: [runtime.serverURL],
  csrf: [runtime.serverURL],
  admin: { user: 'users', importMap: { baseDir: projectRoot } },
  collections: collections(runtime.directory, { secureCookies: runtime.secureCookies, postgres: runtime.database === 'postgres' }),
  upload: { limits: { fileSize: 10 * 1024 * 1024 }, abortOnLimit: true },
  localization: { locales: ['zh', 'en', 'ja'], defaultLocale: 'zh', fallback: false },
  db: runtime.database === 'sqlite'
    ? localSQLiteAdapter({ client: { url: runtime.databaseURL }, push: true, transactionOptions: { behavior: 'immediate' } })
    : editorPostgresAdapter({ pool: { connectionString: runtime.databaseURL, max: 10, connectionTimeoutMillis: 5000,
      ssl: runtime.databaseTLS ? { rejectUnauthorized: true } : false }, push: runtime.schemaPush,
      disableCreateDatabase: true, migrationDir: path.join(projectRoot, 'src/migrations') }),
  typescript: { outputFile: path.join(projectRoot, 'src/payload-types.ts') },
  graphQL: { disable: true },
  email: () => ({
    name: 'disabled-email',
    defaultFromAddress: 'disabled@example.invalid',
    defaultFromName: 'Gachia CMS',
    sendEmail: async () => { throw new Error('Email is disabled. Contact the CMS administrator for account recovery.') },
  }),
  telemetry: false,
  jobs: {
    tasks: [verifySourceTask],
    deleteJobOnComplete: false,
    access: { run: () => false, queue: () => false, cancel: () => false },
  },
})
