import { NextResponse } from 'next/server';
import { INDEXNOW_POLICY, normalizeIndexNowUrls } from '@gachia/core/indexnow-policy.mjs';

export async function POST(request: Request) {
  const authToken = process.env.INDEXNOW_AUTH_TOKEN;
  if (!authToken) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${authToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let urls: string[];
  try {
    const payload: unknown = await request.json();
    urls = normalizeIndexNowUrls(payload && typeof payload === 'object' && 'urls' in payload ? payload.urls : undefined);
    // The API accepts full canonical URLs only; relative paths are for local helpers.
    if ((payload as { urls: string[] }).urls.some(value => !value.startsWith('https://'))) throw new Error('Expected absolute URLs');
  } catch {
    return NextResponse.json({ error: 'Invalid canonical production urls array' }, { status: 400 });
  }

  // Authentication is not content approval. No outbound implementation while paused.
  return NextResponse.json({
    ok: false,
    error: 'IndexNow submission paused',
    reason: INDEXNOW_POLICY.reason,
    candidates: urls.length,
    submissionApproved: false,
  }, { status: 503 });
}
