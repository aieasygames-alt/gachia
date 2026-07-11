import { NextResponse } from 'next/server';
import { z } from 'zod';

const INDEXNOW_KEY = 'gachia2026indexnowkey';
const UrlListSchema = z.object({
  urls: z.array(z.string().url().max(2048)).min(1).max(10000),
});

// IndexNow API endpoint — ping search engines when content changes
export async function POST(request: Request) {
  const authToken = process.env.INDEXNOW_AUTH_TOKEN;
  if (!authToken) {
    console.error('INDEXNOW_AUTH_TOKEN is not configured');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // P1-7: Add authentication to prevent abuse
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsedBody = UrlListSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid urls array' }, { status: 400 });
    }
    const urls = parsedBody.data.urls;

    if (urls.some((url) => {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'gachia.com' || Boolean(parsedUrl.port);
    })) {
      return NextResponse.json({ error: 'Only gachia.com URLs are allowed' }, { status: 400 });
    }

    const body = {
      host: 'gachia.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://gachia.com/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    };

    // Ping all IndexNow-compatible search engines in parallel
    const endpoints = [
      'https://api.indexnow.org/indexnow',
      'https://www.bing.com/indexnow',
      'https://search.seznam.cz/indexnow',
      'https://yandex.com/indexnow',
    ];

    const results = await Promise.allSettled(
      endpoints.map((endpoint) =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then((res) => ({ endpoint, status: res.status }))
      )
    );

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && [200, 202, 204].includes(r.value.status)
    ).length;

    return NextResponse.json({ ok: true, notified: succeeded, total: endpoints.length });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
