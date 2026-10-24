import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../middleware';

vi.mock('next-intl/middleware', async () => {
  const { NextResponse } = await import('next/server');
  return { default: () => () => NextResponse.next() };
});

it.each(['zh', 'en', 'ja'])('lets the %s international item list and details reach their notFound boundary', locale => {
  for (const suffix of ['items', 'items/gulu-ball', 'items/not-a-record']) {
    const response = middleware(new NextRequest(`https://gachia.com/${locale}/roco/${suffix}`));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  }
});

it('canonicalizes language-less international item paths without silently substituting a homepage', () => {
  for (const suffix of ['items', 'items/gulu-ball']) {
    const response = middleware(new NextRequest(`https://gachia.com/roco/${suffix}`));
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`https://gachia.com/zh/roco/${suffix}`);
  }
});

it('keeps other disabled-route redirects and the CN item route unchanged', () => {
  for (const [path, target] of [['/en/roco/artifacts', '/en/roco'], ['/en/aniimo/items', '/en/aniimo'], ['/roco/artifacts', '/zh/roco']]) {
    const response = middleware(new NextRequest(`https://gachia.com${path}`));
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`https://gachia.com${target}`);
  }
  expect(middleware(new NextRequest('https://gachia.com/en/roco-cn/items')).headers.get('x-middleware-next')).toBe('1');
});
