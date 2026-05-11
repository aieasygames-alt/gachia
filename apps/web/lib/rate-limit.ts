import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { rateLimits, eq, and, gt, sql } from '@gachia/db';

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Key prefix (e.g. '/api/auth') */
  prefix: string;
}

export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || 'unknown';

  const key = `${ip}:${options.prefix}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - options.windowSeconds * 1000);

  const db = getDb();

  // Clean up expired entries
  await db.delete(rateLimits).where(gt(rateLimits.windowStart, sql`datetime('now', '+1 hour')`)).catch(() => {});

  // Find existing counter
  const existing = await db
    .select()
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key)))
    .limit(1);

  if (existing.length > 0) {
    const record = existing[0]!;
    const recordStart = new Date(record.windowStart ?? 0);

    if (recordStart > windowStart) {
      // Within window — check count
      if (record.count >= options.limit) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429, headers: { 'Retry-After': String(options.windowSeconds) } },
        );
      }
      // Increment
      await db
        .update(rateLimits)
        .set({ count: sql`${rateLimits.count} + 1` })
        .where(eq(rateLimits.key, key));
    } else {
      // Window expired — reset
      await db
        .update(rateLimits)
        .set({ count: 1, windowStart: now })
        .where(eq(rateLimits.key, key));
    }
  } else {
    // New entry
    await db.insert(rateLimits).values({ key, count: 1, windowStart: now });
  }

  return null; // No rate limit hit
}
