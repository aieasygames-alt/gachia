import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-sqlite';

export async function up({ db }: MigrateUpArgs): Promise<void> {
  const current = await db.run(sql`PRAGMA table_info(game_updates)`);
  if (!current.rows.some(row => row.name === 'event_schedule')) await db.run(sql`ALTER TABLE game_updates ADD COLUMN event_schedule text`);
  const versions = await db.run(sql`PRAGMA table_info(_game_updates_v)`);
  if (!versions.rows.some(row => row.name === 'version_event_schedule')) await db.run(sql`ALTER TABLE _game_updates_v ADD COLUMN version_event_schedule text`);
}
export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Preserve event schedules and version history; do not drop the nullable columns during application rollback.');
}
