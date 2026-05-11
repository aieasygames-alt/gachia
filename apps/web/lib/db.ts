import { createDb } from '@gachia/db';

function getEnv(): CloudflareEnv {
  // In Cloudflare Workers, OpenNext injects bindings into process.env
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, unknown>;
  return env as unknown as CloudflareEnv;
}

/**
 * Get the Drizzle ORM instance from the Cloudflare Workers request context.
 */
export function getDb() {
  const env = getEnv();
  if (!env?.DB) {
    throw new Error('D1 database binding (DB) not found. Are you running in Cloudflare Workers?');
  }
  return createDb(env.DB);
}

/**
 * Get the D1 database directly (for raw queries or Better Auth).
 */
export function getD1(): D1Database {
  const env = getEnv();
  if (!env?.DB) {
    throw new Error('D1 database binding (DB) not found. Are you running in Cloudflare Workers?');
  }
  return env.DB;
}
