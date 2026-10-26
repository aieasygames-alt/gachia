import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getRouteOwner } from '@gachia/core';
import middleware from '../middleware';

const origin = 'https://gachia.com';

function follow(path: string) {
  let url = `${origin}${path}`;
  const seen = new Set<string>();
  for (let hop = 0; hop < 6; hop++) {
    expect(seen.has(url), `redirect cycle at ${url}`).toBe(false);
    seen.add(url);
    const response = middleware(new NextRequest(url));
    const location = response.headers.get('location');
    if (!location) return { url, response };
    expect(new URL(location).origin).toBe(origin);
    url = location;
  }
  throw new Error('Too many redirects');
}

describe('Main pathname normalization with real next-intl', () => {
  it.each(['%', '%G0', '%E0%A4%A', '%C0%AF', '%ED%A0%80', '%2F', '%5c', '%00', '%1F', '%7F', '%20..%20'])('rejects unsafe segment %s without throwing', segment => {
    const response = middleware(new NextRequest(`${origin}/zh/${segment}`));
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('location')).toBeNull();
  });

  it.each(['%E4%BD%A0', '%25', '%252F', '%3F', '%23', '%253A', '..%3Alabel'])('preserves valid escaped segment %s without recursive decoding', segment => {
    expect(follow(`/zh/${segment}`).url).toBe(`${origin}/zh/${segment}`);
    expect(follow(`/zh/nte/items/${segment}`).url).toBe(`${origin}/zh/nte/items/${segment}`);
  });

  it.each([
    ['/zh/%e4%bd%a0', '/zh/%E4%BD%A0'],
    ['/zh/%61bout', '/zh/about'],
    ['/zh/%6Ete/characters', '/zh/nte/characters'],
    ['/zh/hello%20%20world', '/zh/hello-world'],
    ['/zh//%20/about/', '/zh/about'],
    ['/en/en/zzz/weapons/starlight-engine', '/en/zzz/weapons/starlight-engine'],
    ['/zh/starrail/characters/jingyuan', '/zh/starrail/characters/jing-yuan'],
    ['/nte/items/example', '/zh/nte/items/example'],
    ['/sea/guides/spongebob-collab-summer-faq-SpongeBob%E5%A4%8F', '/zh/sea/guides/spongebob-collab-summer-faq'],
    ['/zzz/guides/steam-3-0-start-guide-Steam%E5%85%A5%E9%96%80', '/zh/zzz/guides/steam-3-0-start-guide'],
    ['/zh/nte/items/example%3Alabel', '/zh/nte/items/example'],
    ['/zh/nte/items/example%25%3Alabel', '/zh/nte/items/example%25'],
  ])('converges %s to %s and retains the query', (path, target) => {
    const query = '?q=a%2Fb&x=1&x=2&space=a+b';
    expect(follow(path + query).url).toBe(origin + target + query);
  });

  it('retains dedicated Worker ownership and Main item ownership', () => {
    for (const path of ['/zh/nte/characters', '/zh/nte/items/example', '/zh/genshin/characters', '/zh/lvmeng/characters', '/zh/azur-promilia/characters']) {
      const finalPath = new URL(follow(path).url).pathname;
      expect(finalPath).toBe(path);
      expect(getRouteOwner(finalPath)).toBe(getRouteOwner(path));
    }
    for (const path of ['/zh/nte/characters', '/zh/nte/items/example']) {
      const encodedPath = path.replace('/nte/', '/%6Ete/');
      expect(getRouteOwner(encodedPath)).toBe('main');
      expect(getRouteOwner(new URL(follow(encodedPath).url).pathname)).toBe(getRouteOwner(path));
    }
  });

  it.each(['/en/roco-cn/guides/daily-events-merchant-guide', '/en/lvmeng/characters', '/ja/lvmeng'])('preserves 404 policy for %s', path => {
    expect(follow(path).response.status).toBe(404);
  });

  it('validates sitemap paths and preserves normal XML bypass', () => {
    expect(middleware(new NextRequest(`${origin}/sitemaps/%`)).status).toBe(400);
    expect(middleware(new NextRequest(`${origin}/sitemap.xml`)).headers.get('x-middleware-next')).toBe('1');
  });

  it('keeps preview origins non-indexable, including invalid paths and redirects', () => {
    for (const path of ['/zh/%', '/zh/about', '/zh/%61bout', '/robots.txt']) {
      const response = middleware(new NextRequest(`https://main.example.workers.dev${path}`));
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  });

  it('preserves normal response security headers and root language variance', () => {
    const response = middleware(new NextRequest(`${origin}/zh/about`));
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(middleware(new NextRequest(`${origin}/`)).headers.get('vary')).toContain('Accept-Language');
  });
});
