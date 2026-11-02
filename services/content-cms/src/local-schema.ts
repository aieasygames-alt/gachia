import type { SQLiteAdapter } from '@payloadcms/db-sqlite'

export function localSchemaStatements(input: unknown): string[] {
  if (!Array.isArray(input) || !input.every(value => typeof value === 'string')) throw new Error('Unsupported local schema plan')
  const indexes = new Map<string, string>()
  return input.filter(statement => {
    const match = /^CREATE (?:UNIQUE )?INDEX `([^`]+)` ON /u.exec(statement)
    if (!match) { indexes.clear(); return true }
    const previous = indexes.get(match[1])
    if (previous && previous !== statement) throw new Error('Conflicting index definitions in local schema plan')
    indexes.set(match[1], statement)
    // drizzle-kit 0.31.7 repeats the same index block after a SQLite FK table rebuild.
    return previous === undefined
  })
}

export async function applyLocalSchema(client: SQLiteAdapter['client'], statements: string[]) {
  if (!statements.length) return
  // Disable FK actions only on the rebuild connection; validate before the atomic commit.
  await client.execute('PRAGMA foreign_keys = OFF')
  let transaction: Awaited<ReturnType<typeof client.transaction>> | undefined
  try {
    transaction = await client.transaction('write')
    for (const statement of statements) {
      if (/^PRAGMA foreign_keys\s*=\s*(?:ON|OFF|0|1);?$/iu.test(statement.trim())) continue
      await transaction.execute(statement)
    }
    if ((await transaction.execute('PRAGMA foreign_key_check')).rows.length) throw new Error('Local schema foreign key validation failed')
    await transaction.commit()
  } catch (error) {
    if (transaction && !transaction.closed) await transaction.rollback()
    throw error
  } finally {
    transaction?.close()
    await client.execute('PRAGMA foreign_keys = ON')
  }
}
