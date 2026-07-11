import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getD1 } from '@/lib/db';

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
  const now = Math.floor(Date.now() / 1000);

  let d1: D1Database;
  try {
    d1 = getD1();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('D1 database binding') || message.includes('Cloudflare environment bindings')) {
      return null;
    }
    throw error;
  }

  const counter = await d1.prepare(`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start <= excluded.window_start - ? THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start <= excluded.window_start - ? THEN excluded.window_start
        ELSE rate_limits.window_start
      END
    RETURNING count, window_start
  `).bind(key, now, options.windowSeconds, options.windowSeconds).first<{
    count: number;
    window_start: number;
  }>();

  if (!counter) {
    throw new Error('Rate limit counter update returned no result');
  }

  // Keep cleanup off the request's critical path and use numeric epoch comparison.
  if (Math.random() < 0.01) {
    const cleanup = d1.prepare('DELETE FROM rate_limits WHERE window_start < ?')
      .bind(now - 3600)
      .run()
      .catch((error) => console.error('Failed to clean expired rate limit counters', error));
    getCloudflareContext().ctx.waitUntil(cleanup);
  }

  if (counter.count > options.limit) {
    const retryAfter = Math.max(1, counter.window_start + options.windowSeconds - now);
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  return null;
}
