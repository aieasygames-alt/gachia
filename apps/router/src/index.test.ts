import { describe, expect, it } from 'vitest';
import router from './index';

function fetcher(marker: string): Fetcher {
  return {
    fetch: async () => new Response(marker),
    connect: () => {
      throw new Error('connect is not used by the router');
    },
  } as Fetcher;
}

describe('gachia router safety defaults', () => {
  it('keeps NTE pages on the main Worker while the migration switch is disabled', async () => {
    const response = await router.fetch(new Request('https://gachia.com/zh/nte/characters'), {
      MAIN_SITE: fetcher('main'),
      NTE_SITE: fetcher('nte'),
      NTE_ENABLED: 'false',
    });

    await expect(response.text()).resolves.toBe('main');
  });

  it('preserves the production robots response while staging can disallow crawling', async () => {
    const production = await router.fetch(new Request('https://gachia.com/robots.txt'), {
      MAIN_SITE: fetcher('main-robots'), NTE_ENABLED: 'true',
    });
    await expect(production.text()).resolves.toBe('main-robots');

    const staging = await router.fetch(new Request('https://gachia-router-staging.aieasygames.workers.dev/robots.txt'), {
      MAIN_SITE: fetcher('main-robots'), NTE_ENABLED: 'true', PREVIEW_MODE: 'true',
    });
    await expect(staging.text()).resolves.toContain('Disallow: /');
  });

  it('keeps production disabled by default even when the NTE binding exists', async () => {
    const response = await router.fetch(new Request('https://gachia.com/zh/nte'), {
      MAIN_SITE: fetcher('production'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'false',
    });
    await expect(response.text()).resolves.toBe('production');
  });

  it('routes only supported locale, asset, and sitemap NTE paths when enabled', async () => {
    const env = { MAIN_SITE: fetcher('main'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'true' };

    for (const pathname of ['/zh/nte', '/zh/nte/map', '/en/nte/characters/aurelia', '/ja/nte/weapons/test-weapon', '/_games/nte/_next/static/app.js', '/sitemaps/nte/index.xml']) {
      const response = await router.fetch(new Request(`https://gachia.com${pathname}`), env);
      await expect(response.text()).resolves.toBe('nte');
    }
  });

  it('keeps the root sitemap on the main worker while routing game sitemap shards', async () => {
    const root = await router.fetch(new Request('https://gachia.com/sitemap.xml'), { MAIN_SITE: fetcher('main'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'true' });
    await expect(root.text()).resolves.toBe('main');
    const shard = await router.fetch(new Request('https://gachia.com/sitemaps/nte/index.xml'), { MAIN_SITE: fetcher('main'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'true' });
    await expect(shard.text()).resolves.toBe('nte');
  });

  it('removes only the external asset namespace before calling the NTE Worker', async () => {
    let receivedPath = '';
    const nteSite: Fetcher = {
      fetch: async (request) => {
        receivedPath = new URL(request instanceof Request ? request.url : String(request)).pathname;
        return new Response('nte');
      },
      connect: () => { throw new Error('connect is not used by the router'); },
    } as Fetcher;
    await router.fetch(new Request('https://gachia.com/_games/nte/_next/static/chunks/app.js'), {
      MAIN_SITE: fetcher('main'),
      NTE_SITE: nteSite,
      NTE_ENABLED: 'true',
    });

    expect(receivedPath).toBe('/_next/static/chunks/app.js');
  });

  it('rewrites game sitemap index paths to each worker sitemap', async () => {
    let ntePath = '';
    let azurPath = '';
    const nte = { fetch: async (request: Request) => { ntePath = new URL(request.url).pathname; return new Response('nte'); }, connect: () => { throw new Error('not used'); } } as Fetcher;
    const azur = { fetch: async (request: Request) => { azurPath = new URL(request.url).pathname; return new Response('azur'); }, connect: () => { throw new Error('not used'); } } as Fetcher;
    await router.fetch(new Request('https://gachia.com/sitemaps/nte/index.xml'), { MAIN_SITE: fetcher('main'), NTE_SITE: nte, NTE_ENABLED: 'true' });
    await router.fetch(new Request('https://gachia.com/sitemaps/azur-promilia/index.xml'), { MAIN_SITE: fetcher('main'), AZUR_PROMILIA_SITE: azur, AZUR_PROMILIA_ENABLED: 'true' });
    expect(ntePath).toBe('/sitemap.xml');
    expect(azurPath).toBe('/sitemap.xml');
  });

  it('keeps sitemap routing exact and independent from the main sitemap', async () => {
    let routed = '';
    const nte = { fetch: async (request: Request) => { routed = new URL(request.url).pathname; return new Response('nte'); }, connect: () => { throw new Error('not used'); } } as Fetcher;
    const env = { MAIN_SITE: fetcher('main'), NTE_SITE: nte, NTE_ENABLED: 'true' };
    const exact = await router.fetch(new Request('https://gachia.com/sitemaps/nte/index.xml?source=search-console'), env);
    await expect(exact.text()).resolves.toBe('nte');
    expect(routed).toBe('/sitemap.xml');
    const trailing = await router.fetch(new Request('https://gachia.com/sitemaps/nte/index.xml/'), env);
    await expect(trailing.text()).resolves.toBe('nte');
    const lookalike = await router.fetch(new Request('https://gachia.com/sitemaps/nte-anything.xml'), env);
    await expect(lookalike.text()).resolves.toBe('main');
  });

  it('exposes an opt-in route marker for production diagnostics', async () => {
    const response = await router.fetch(new Request('https://gachia.com/zh/nte', { headers: { 'x-gachia-route-debug': '1' } }), {
      MAIN_SITE: fetcher('main'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'true',
    });
    expect(response.headers.get('x-gachia-route-target')).toBe('nte');
  });

  it('never routes unknown locale or lookalike paths to NTE', async () => {
    const env = { MAIN_SITE: fetcher('main'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'true' };

    for (const pathname of ['/fr/nte', '/zh/nte-anything', '/zh/nte/characters/aurelia/extra', '/zh/nte/unknown', '/_games/nte-anything/file.js', '/sitemaps/nte-anything.xml']) {
      const response = await router.fetch(new Request(`https://gachia.com${pathname}`), env);
      await expect(response.text()).resolves.toBe('main');
    }
  });

  it('supports an explicit cookie canary without changing the default route', async () => {
    const env = { MAIN_SITE: fetcher('main'), NTE_SITE: fetcher('nte'), NTE_ENABLED: 'false' };
    const response = await router.fetch(new Request('https://gachia.com/zh/nte'), env);
    await expect(response.text()).resolves.toBe('main');
  });

  it('keeps Genshin pages on the main Worker while its routing switch is disabled', async () => {
    const response = await router.fetch(new Request('https://gachia.com/zh/genshin/characters'), {
      MAIN_SITE: fetcher('main'),
      GENSHIN_SITE: fetcher('genshin'),
      GENSHIN_ENABLED: 'false',
    });

    await expect(response.text()).resolves.toBe('main');
  });

  it('routes only approved Genshin URLs for the explicit cookie canary', async () => {
    const env = {
      MAIN_SITE: fetcher('main'),
      GENSHIN_SITE: fetcher('genshin'),
      GENSHIN_ENABLED: 'true',
      GENSHIN_CANARY_COOKIE: 'preview',
    };

    for (const pathname of ['/zh/genshin', '/en/genshin/characters/test', '/ja/genshin/calculator', '/_games/genshin/_next/static/app.js', '/sitemaps/genshin/index.xml']) {
      const request = new Request(`https://gachia.com${pathname}`, { headers: { cookie: 'gachia_genshin_canary=preview' } });
      const response = await router.fetch(request, env);
      await expect(response.text()).resolves.toBe('genshin');
    }

    for (const pathname of ['/zh/genshin', '/fr/genshin', '/zh/genshin/unknown', '/zh/genshin/characters/test/extra', '/_games/genshin-extra/file.js']) {
      const response = await router.fetch(new Request(`https://gachia.com${pathname}`), env);
      await expect(response.text()).resolves.toBe('main');
    }
  });

  it('rewrites only the Genshin sitemap and asset namespaces for its Worker', async () => {
    let receivedPath = '';
    const genshin: Fetcher = {
      fetch: async (request) => {
        receivedPath = new URL(request instanceof Request ? request.url : String(request)).pathname;
        return new Response('genshin');
      },
      connect: () => { throw new Error('connect is not used by the router'); },
    } as Fetcher;
    const env = {
      MAIN_SITE: fetcher('main'),
      GENSHIN_SITE: genshin,
      GENSHIN_ENABLED: 'true',
      GENSHIN_CANARY_COOKIE: '',
    };

    await router.fetch(new Request('https://gachia.com/sitemaps/genshin/index.xml'), env);
    expect(receivedPath).toBe('/sitemap.xml');
    await router.fetch(new Request('https://gachia.com/_games/genshin/_next/static/chunks/app.js'), env);
    expect(receivedPath).toBe('/_next/static/chunks/app.js');
  });

  it('keeps Azur Promilia on the main Worker while its routing switch is disabled', async () => {
    const response = await router.fetch(new Request('https://gachia.com/zh/azur-promilia/characters'), {
      MAIN_SITE: fetcher('main'),
      AZUR_PROMILIA_SITE: fetcher('azur-promilia'),
      AZUR_PROMILIA_ENABLED: 'false',
    });

    await expect(response.text()).resolves.toBe('main');
  });

  it('routes only supported Azur Promilia paths when enabled', async () => {
    const env = { MAIN_SITE: fetcher('main'), AZUR_PROMILIA_SITE: fetcher('azur-promilia'), AZUR_PROMILIA_ENABLED: 'true' };

    for (const pathname of ['/zh/azur-promilia', '/en/azur-promilia/characters/test', '/ja/azur-promilia/tier-list', '/zh/azur-promilia/systems', '/_games/azur-promilia/_next/static/app.js', '/sitemaps/azur-promilia/index.xml']) {
      const response = await router.fetch(new Request(`https://gachia.com${pathname}`), env);
      await expect(response.text()).resolves.toBe('azur-promilia');
    }

    for (const pathname of ['/fr/azur-promilia', '/zh/azur-promilia-extra', '/zh/azur-promilia/unknown', '/zh/azur-promilia/characters/test/extra', '/_games/azur-promilia-extra/file.js']) {
      const response = await router.fetch(new Request(`https://gachia.com${pathname}`), env);
      await expect(response.text()).resolves.toBe('main');
    }
  });

  it('removes only the Azur Promilia external asset namespace', async () => {
    let receivedPath = '';
    const azurPromiliaSite: Fetcher = {
      fetch: async (request) => {
        receivedPath = new URL(request instanceof Request ? request.url : String(request)).pathname;
        return new Response('azur-promilia');
      },
      connect: () => { throw new Error('connect is not used by the router'); },
    } as Fetcher;

    await router.fetch(new Request('https://gachia.com/_games/azur-promilia/_next/static/chunks/app.js'), {
      MAIN_SITE: fetcher('main'),
      AZUR_PROMILIA_SITE: azurPromiliaSite,
      AZUR_PROMILIA_ENABLED: 'true',
    });

    expect(receivedPath).toBe('/_next/static/chunks/app.js');
  });
});
