import { postgresAdapter } from '@payloadcms/db-postgres'

export function editorPostgresAdapter(args: Parameters<typeof postgresAdapter>[0]) {
  const factory = postgresAdapter(args)
  return { ...factory, init: (options: Parameters<typeof factory.init>[0]) => {
    const db = factory.init(options)
    const pool = new db.pg.Pool(db.poolOptions)
    const acquired = new Set<{ release: (destroy?: boolean) => void }>()
    pool.on('acquire', client => acquired.add(client))
    pool.on('release', (_error, client) => acquired.delete(client))
    db.pool = pool
    const destroy = db.destroy!.bind(db)
    let shutdown: Promise<void> | undefined
    db.destroy = () => shutdown ??= (async () => {
      // Payload 3.92.1 destroy clears schema state but leaves its pool (and a
      // reserved reconnect client) open. Shutdown happens after request draining.
      for (const client of [...acquired]) client.release(true)
      await pool.end()
      await destroy()
    })()
    return db
  } }
}
