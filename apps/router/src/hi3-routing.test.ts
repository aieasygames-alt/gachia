import { describe, expect, it } from 'vitest';
import router from './index';

describe('HI3 main Worker routing boundary', () => {
  for (const scenario of ['enabled', 'disabled', 'staging'] as const) {
    it(`keeps HI3 and shared resources on MAIN_SITE with ${scenario} game switches`, async () => {
      const received: Request[] = [];
      const main = { fetch: async (request: Request) => {
        received.push(request); return new Response('main', { status: 207, headers: { 'x-fixture': 'preserved' } });
      }, connect: () => { throw new Error('Unused'); } } as Fetcher;
      const other = { fetch: async () => { throw new Error('HI3 must not reach a game Worker'); },
        connect: () => { throw new Error('Unused'); } } as Fetcher;
      const enabled = scenario === 'enabled' ? 'true' : 'false';
      const env = { MAIN_SITE: main, NTE_SITE: other, AZUR_PROMILIA_SITE: other, GENSHIN_SITE: other, LVMENG_SITE: other,
        NTE_ENABLED: enabled, AZUR_PROMILIA_ENABLED: enabled, GENSHIN_ENABLED: enabled, GENSHIN_FULL_CUTOVER: enabled,
        LVMENG_ENABLED: enabled, PREVIEW_MODE: scenario === 'staging' ? 'true' : 'false',
        AZUR_PROMILIA_CANARY_COOKIE: 'fixture', GENSHIN_CANARY_COOKIE: 'fixture', LVMENG_CANARY_COOKIE: 'fixture' };
      const paths = ['/_next/static/chunks/shared.js', '/images/og/hi3.webp', '/sitemap.xml', '/sitemaps/hi3/index.xml',
        '/_games/hi3/_next/static/app.js', ...['zh', 'en', 'ja'].flatMap((locale) =>
          [`/${locale}/hi3`, `/${locale}/hi3/weapons`, `/${locale}/hi3/weapons/vermillion-liuli`])];
      for (const path of paths) {
        const request = new Request(`https://gachia.com${path}?fixture=1`, { headers: {
          cookie: 'gachia_azur_promilia_canary=fixture; gachia_genshin_canary=fixture; gachia_lvmeng_canary=fixture',
          'x-gachia-route-debug': '1' } });
        const response = await router.fetch(request, env);
        expect(received.at(-1)).toBe(request);
        expect(response.status).toBe(207);
        expect(response.headers.get('x-fixture')).toBe('preserved');
        expect(response.headers.has('x-gachia-route-target')).toBe(false);
        expect(await response.text()).toBe('main');
      }
      expect(received).toHaveLength(paths.length);
    });
  }
});
