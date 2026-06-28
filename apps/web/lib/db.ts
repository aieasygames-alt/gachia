import { createDb } from '@gachia/db';

/**
 * Check if running in local development environment
 */
export function isLocalDevelopment(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
}

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

  if (cfContext?.env) {
    // CRITICAL FIX: Validate that required bindings exist
    if (!cfContext.env.DB) {
      throw new Error('D1 database binding (DB) not found in Cloudflare context');
    }
    if (!cfContext.env.IMAGES) {
      throw new Error('R2 bucket binding (IMAGES) not found in Cloudflare context');
    }
    return cfContext.env;
  }

  // CRITICAL FIX: Better fallback for local development
  if (isLocalDevelopment()) {
    console.warn('Running in local development mode - database bindings may be unavailable');
    // Return a minimal environment object for local dev
    return {
      DB: null as any, // Local dev needs special handling
      IMAGES: null as any,
    } as CloudflareEnv;
  }

  throw new Error('Cannot find Cloudflare environment bindings. Are you running in Cloudflare Workers?');
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

/**
 * Get the R2 bucket for image/tile storage.
 */
export function getR2(): R2Bucket {
  const env = getEnv();
  if (!env?.IMAGES) {
    throw new Error('R2 bucket binding (IMAGES) not found. Are you running in Cloudflare Workers?');
  }
  return env.IMAGES;
}
