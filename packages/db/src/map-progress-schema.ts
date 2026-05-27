import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './schema';

export const mapProgress = sqliteTable('map_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  mapId: text('map_id').notNull(),
  markerId: text('marker_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
