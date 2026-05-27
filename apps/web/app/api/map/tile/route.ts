import { NextResponse } from 'next/server';
import { getR2 } from '@/lib/db';

const ALLOWED_HOST = 'act-webstatic.hoyoverse.com';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const mapId = searchParams.get('map_id') || '2';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL domain to prevent open proxy
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsedUrl.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  // Compute R2 key from URL
  const key = `map-tiles/${mapId}/${hashUrl(url)}`;

  try {
    const r2 = getR2();

    // Check R2 cache first
    const cached = await r2.get(key);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch from HoYoLAB
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch tile' }, { status: 502 });
    }

    const body = await res.arrayBuffer();

    // Store to R2 (fire and forget — don't block response)
    r2.put(key, body, {
      httpMetadata: { contentType: 'image/png' },
    }).catch(() => {});

    return new Response(body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    // R2 not available (dev mode) — proxy directly
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch tile' }, { status: 502 });
    }
    const body = await res.arrayBuffer();
    return new Response(body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}

/** Simple hash for R2 key dedup */
function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const chr = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
