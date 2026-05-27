import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import * as rateLimitSchema from './rate-limit-schema';
import * as mapProgressSchema from './map-progress-schema';

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema: { ...schema, ...rateLimitSchema, ...mapProgressSchema } });
}

export { schema };
export * from './schema';
export * from './rate-limit-schema';
export * from './map-progress-schema';
export { eq, and, or, sql, desc, asc, count, gt, lt, gte, lte } from 'drizzle-orm';
