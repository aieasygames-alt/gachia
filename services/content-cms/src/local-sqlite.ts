import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { applyLocalSchema, localSchemaStatements } from './local-schema'

// The local libSQL client must not start overlapping writer transactions on shared connections.
// This is per adapter/process only, not a distributed lock or a production database strategy.
export function localSQLiteAdapter(args: Parameters<typeof sqliteAdapter>[0]) {
  if (!args.client.url.startsWith('file:')) throw new Error('Local SQLite adapter requires a file database')
  const factory = sqliteAdapter(args)
  return {
    ...factory,
    init: (options: Parameters<typeof factory.init>[0]) => {
      const db = factory.init(options)
      const kit = db.requireDrizzleKit.bind(db)
      db.requireDrizzleKit = () => {
        const original = kit()
        return {
          ...original,
          pushSchema: async (...args) => {
            const plan = await original.pushSchema(...args)
            const statements = localSchemaStatements((plan as typeof plan & { statementsToExecute?: unknown }).statementsToExecute)
            return { ...plan, apply: () => applyLocalSchema(db.client, statements) }
          },
        }
      }
      const begin = db.beginTransaction.bind(db)
      const commit = db.commitTransaction.bind(db)
      const rollback = db.rollbackTransaction.bind(db)
      let tail = Promise.resolve()
      let waiting = 0
      const releases = new Map<string | number, () => void>()
      db.beginTransaction = async options => {
        if (waiting >= 64) throw new Error('Local writer queue is full; retry after current requests complete')
        waiting++
        const previous = tail
        let release!: () => void
        tail = new Promise<void>(resolve => { release = resolve })
        await previous
        waiting--
        try {
          const id = await begin(options)
          if (id === null) throw new Error('Local database did not start a transaction')
          releases.set(id, release)
          return id
        } catch (error) { release(); throw error }
      }
      const finish = async (incoming: Parameters<typeof commit>[0], operation: typeof commit) => {
        const id = await incoming
        try { await operation(id) } finally {
          releases.get(id)?.()
          releases.delete(id)
        }
      }
      db.commitTransaction = id => finish(id, commit)
      db.rollbackTransaction = id => finish(id, rollback)
      return db
    },
  }
}
