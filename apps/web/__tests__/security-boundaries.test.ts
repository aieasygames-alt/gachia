import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const first = vi.fn();
const bind = vi.fn(() => ({ first }));
const prepare = vi.fn((_query: string) => ({ bind }));

vi.mock('@/lib/db', () => ({ getD1: () => ({ prepare }) }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({ ctx: { waitUntil: vi.fn() } }),
}));

import { checkRateLimit } from '@/lib/rate-limit';
import { BatchSchema } from '@/lib/map-validation';
import { GET as getMap } from '@/app/api/map/route';
import { GET as getTile } from '@/app/api/map/tile/route';
import { POST as postIndexNow } from '@/app/api/indexnow/route';

describe('rate limiting', () => {
  beforeEach(() => {
    prepare.mockClear();
    bind.mockClear();
    first.mockReset();
    vi.spyOn(Math, 'random').mockReturnValue(1);
  });

  it('uses one atomic UPSERT for the counter', async () => {
    first.mockResolvedValue({ count: 1, window_start: 100 });
    const request = new NextRequest('https://gachia.com/api/auth', {
      headers: { 'cf-connecting-ip': '192.0.2.1' },
    });

    await expect(checkRateLimit(request, { limit: 20, windowSeconds: 60, prefix: '/api/auth' }))
      .resolves.toBeNull();
    expect(prepare).toHaveBeenCalledOnce();
    expect(prepare.mock.calls[0]?.[0]).toContain('ON CONFLICT(key) DO UPDATE');
    expect(bind).toHaveBeenCalledWith('192.0.2.1:/api/auth', expect.any(Number), 60, 60);
  });

  it('returns 429 after the atomic counter exceeds the limit', async () => {
    first.mockResolvedValue({ count: 21, window_start: Math.floor(Date.now() / 1000) });
    const response = await checkRateLimit(
      new NextRequest('https://gachia.com/api/auth'),
      { limit: 20, windowSeconds: 60, prefix: '/api/auth' },
    );

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('request resource boundaries', () => {
  it('rejects unknown map IDs before calling the upstream API', async () => {
    const response = await getMap(new Request('https://gachia.com/api/map?map_id=unbounded'));
    expect(response.status).toBe(400);
  });

  it('rejects tile URLs outside the exact HoYoLAB tile path', async () => {
    const url = encodeURIComponent('https://act-webstatic.hoyoverse.com/arbitrary-large-file.bin');
    const response = await getTile(new Request(`https://gachia.com/api/map/tile?map_id=2&url=${url}`));
    expect(response.status).toBe(403);
  });

  it('limits a map progress batch to 500 total changes', () => {
    const markerIds = Array.from({ length: 501 }, (_, index) => `marker-${index}`);
    expect(BatchSchema.safeParse({ mapId: 'teyvat', collected: markerIds }).success).toBe(false);
  });

  it('rejects IndexNow calls without the internal token', async () => {
    const response = await postIndexNow(new Request('https://gachia.com/api/indexnow', {
      method: 'POST',
      body: JSON.stringify({ urls: ['https://gachia.com/zh'] }),
    }));
    expect(response.status).toBe(503);
  });
});
