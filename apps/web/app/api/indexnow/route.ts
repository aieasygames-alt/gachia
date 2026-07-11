import { NextResponse } from 'next/server';

const INDEXNOW_KEY = 'gachia2026indexnowkey';

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
    const { urls } = await request.json() as { urls: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array required' }, { status: 400 });
    }

    if (urls.length > 10000) {
      return NextResponse.json({ error: 'Max 10000 URLs per request' }, { status: 400 });
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
