import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Rate Limit Counters ────────────────────────────────────────

export const rateLimits = sqliteTable('rate_limits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),     // IP + route prefix, e.g. "1.2.3.4:/api/auth"
  count: integer('count').notNull().default(1),
  windowStart: integer('window_start', { mode: 'timestamp' }).notNull(),
});
