import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import middleware, { config } from '../middleware';
import { isWorkerPreviewOrigin } from '../lib/preview-origin';

vi.mock('next-intl/middleware', async () => {
  const { NextResponse } = await import('next/server');
  return { default: () => () => NextResponse.next() };
});

it('applies preview noindex using the runtime hostname, not shared build-time flags', async () => {
  for (const origin of ['https://gachia-staging.aieasygames.workers.dev', 'https://gachia.aieasygames.workers.dev']) {
    expect(isWorkerPreviewOrigin(origin)).toBe(true);
    const robots = middleware(new NextRequest(`${origin}/robots.txt`));
    expect(robots.status).toBe(200);
    expect(await robots.text()).toBe('User-agent: *\nDisallow: /\n');
    expect(robots.headers.get('x-robots-tag')).toContain('noindex');
    const page = middleware(new NextRequest(`${origin}/zh/hi3/weapons`));
    expect(page.headers.get('x-robots-tag')).toContain('noindex');
    const redirect = middleware(new NextRequest(`${origin}/hi3/weapons`));
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get('x-robots-tag')).toContain('noindex');
  }
  for (const origin of ['https://gachia.com', 'https://workers.dev.evil.test', 'http://localhost:3000', 'invalid']) expect(isWorkerPreviewOrigin(origin)).toBe(false);
});

it('does not change public robots or indexability', () => {
  const response = middleware(new NextRequest('https://gachia.com/robots.txt'));
  expect(response.headers.get('x-middleware-next')).toBe('1');
  expect(response.headers.get('x-robots-tag')).toBeNull();
  expect(middleware(new NextRequest('https://gachia.com/zh/hi3/weapons')).headers.get('x-robots-tag')).toBeNull();
});

it('matches XML routes and applies preview-only noindex without locale redirects', () => {
  for (const path of ['/sitemap.xml', '/sitemaps/main/sitemap.xml', '/sitemaps/genshin/index.xml']) {
    for (const origin of ['https://gachia.com', 'https://gachia-staging.aieasygames.workers.dev']) {
      const url = origin + path;
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
      const response = middleware(new NextRequest(url));
      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('x-robots-tag')).toBe(origin.includes('.workers.dev') ? 'noindex, nofollow' : null);
    }
  }
  expect(unstable_doesMiddlewareMatch({ config, url: 'https://gachia.com/_next/static/runtime.js' })).toBe(false);
});
