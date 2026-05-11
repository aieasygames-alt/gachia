import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ─── Users (Better Auth managed) ─────────────────────────────────

export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ─── User Favorites ──────────────────────────────────────────────

export const userFavorites = sqliteTable('user_favorites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  gameId: text('game_id').notNull(),
  characterId: text('character_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ─── User Characters (Character Box) ─────────────────────────────

export const userCharacters = sqliteTable('user_characters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id),
  gameId: text('game_id').notNull(),
  characterId: text('character_id').notNull(),
  level: integer('level').default(1),
  constellation: integer('constellation').default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ─── Shared Builds ───────────────────────────────────────────────

export const sharedBuilds = sqliteTable('shared_builds', {
  id: text('id').primaryKey(), // nanoid
  userId: text('user_id').references(() => users.id),
  gameId: text('game_id').notNull(),
  characterId: text('character_id').notNull(),
  buildData: text('build_data').notNull(), // JSON string
  viewCount: integer('view_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // null = permanent
});

// ─── Sessions (Better Auth managed) ─────────────────────────────

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ─── Accounts (Better Auth managed) ─────────────────────────────

export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ─── Verifications (Better Auth managed) ────────────────────────

export const verifications = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
