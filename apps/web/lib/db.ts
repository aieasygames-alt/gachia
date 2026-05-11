import { createDb } from '@gachia/db';

/**
 * Get the Cloudflare env from OpenNext's AsyncLocalStorage context.
 * OpenNext stores bindings (D1, R2, etc.) here since they're objects
 * and can't be injected into process.env (which only accepts strings).
 */
function getEnv(): CloudflareEnv {
  // Try OpenNext's Cloudflare context first (has D1/R2 bindings)
  const cfContext = (globalThis as Record<symbol, unknown>)[Symbol.for('__cloudflare-context__')] as
    | { env: CloudflareEnv }
    | undefined;
  if (cfContext?.env) return cfContext.env;

  // Fallback to process.env (string secrets like GOOGLE_CLIENT_ID)
  return process.env as unknown as CloudflareEnv;
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
