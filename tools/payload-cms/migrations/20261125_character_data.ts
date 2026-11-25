import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-sqlite';

// Additive migration for the existing editor. Fresh development databases already
// receive these nullable columns through Payload's schema push.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const current = await db.run(sql`PRAGMA table_info(game_updates)`);
  if (!current.rows.some(row => row.name === 'character_data')) await db.run(sql`ALTER TABLE game_updates ADD COLUMN character_data text`);
  const versions = await db.run(sql`PRAGMA table_info(_game_updates_v)`);
  if (!versions.rows.some(row => row.name === 'version_character_data')) await db.run(sql`ALTER TABLE _game_updates_v ADD COLUMN version_character_data text`);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Preserve published character data and history. Roll back the application without dropping these nullable columns.');
}
