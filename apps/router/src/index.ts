interface Env {
  MAIN_SITE: Fetcher;
  NTE_SITE?: Fetcher;
  AZUR_PROMILIA_SITE?: Fetcher;
  NTE_ENABLED?: string;
  AZUR_PROMILIA_ENABLED?: string;
  PREVIEW_MODE?: string;
  NTE_CANARY_COOKIE?: string;
  AZUR_PROMILIA_CANARY_COOKIE?: string;
}

const LOCALES = new Set(['zh', 'en', 'ja']);
const NTE_PAGES = new Set(['characters', 'guides', 'weapons', 'redeem-codes', 'version', 'items', 'disk-sets', 'tier-list', 'download', 'gacha', 'anomalies', 'build', 'teams', 'compare', 'calculator', 'events', 'merchant', 'map']);
const NTE_DETAIL_PAGES = new Set(['characters', 'guides', 'disk-sets', 'weapons']);
const AZUR_PROMILIA_PAGES = new Set(['characters', 'guides', 'weapons', 'tier-list', 'redeem-codes', 'kibo', 'world']);
const AZUR_PROMILIA_DETAIL_PAGES = new Set(['characters', 'guides', 'weapons']);

function isEnabled(value: string | undefined): boolean {
  return value === 'true';
}

function hasCanaryCookie(request: Request, expected: string | undefined, cookieName: string): boolean {
  if (!expected) return true;
  const cookies = request.headers.get('cookie') ?? '';
  return cookies.split(';').some((part) => part.trim() === `${cookieName}=${expected}`);
}

function isNteRequest(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const isLocalizedPage = LOCALES.has(segments[0] ?? '') && segments[1] === 'nte' && (
    segments.length === 2 ||
    (segments.length === 3 && NTE_PAGES.has(segments[2] ?? '')) ||
    (segments.length === 4 && NTE_DETAIL_PAGES.has(segments[2] ?? ''))
  );
  return (
    isLocalizedPage ||
    (segments.length >= 2 && segments[0] === '_games' && segments[1] === 'nte') ||
    (segments.length >= 2 && segments[0] === 'sitemaps' && segments[1] === 'nte')
  );
}

function isAzurPromiliaRequest(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const isLocalizedPage = LOCALES.has(segments[0] ?? '') && segments[1] === 'azur-promilia' && (
    segments.length === 2 ||
    (segments.length === 3 && AZUR_PROMILIA_PAGES.has(segments[2] ?? '')) ||
    (segments.length === 4 && AZUR_PROMILIA_DETAIL_PAGES.has(segments[2] ?? ''))
  );
  return (
    isLocalizedPage ||
    (segments.length >= 2 && segments[0] === '_games' && segments[1] === 'azur-promilia') ||
    (segments.length >= 2 && segments[0] === 'sitemaps' && segments[1] === 'azur-promilia')
  );
}

function requestForNteWorker(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname === '/sitemaps/nte/index.xml') {
    url.pathname = '/sitemap.xml';
    return new Request(url, request);
  }
  const assetPrefix = '/_games/nte/_next/';
  if (url.pathname.startsWith(assetPrefix)) {
    url.pathname = `/_next/${url.pathname.slice(assetPrefix.length)}`;
    return new Request(url, request);
  }
  return request;
}

function requestForAzurPromiliaWorker(request: Request): Request {
  const url = new URL(request.url);
  if (url.pathname === '/sitemaps/azur-promilia/index.xml') {
    url.pathname = '/sitemap.xml';
    return new Request(url, request);
  }
  const assetPrefix = '/_games/azur-promilia/_next/';
  if (url.pathname.startsWith(assetPrefix)) {
    url.pathname = `/_next/${url.pathname.slice(assetPrefix.length)}`;
    return new Request(url, request);
  }
  return request;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Preview hosts must stay out of search indexes; production keeps its existing robots file.
    if (env.PREVIEW_MODE === 'true' && url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex' },
      });
    }

    // This remains false until preview and SEO parity checks have passed.
    // Falling back preserves all current production behavior and URLs.
    if (isEnabled(env.NTE_ENABLED) && env.NTE_SITE && isNteRequest(url.pathname) && hasCanaryCookie(request, env.NTE_CANARY_COOKIE, 'gachia_nte_canary')) {
      return env.NTE_SITE.fetch(requestForNteWorker(request));
    }

    if (isEnabled(env.AZUR_PROMILIA_ENABLED) && env.AZUR_PROMILIA_SITE && isAzurPromiliaRequest(url.pathname) && hasCanaryCookie(request, env.AZUR_PROMILIA_CANARY_COOKIE, 'gachia_azur_promilia_canary')) {
      return env.AZUR_PROMILIA_SITE.fetch(requestForAzurPromiliaWorker(request));
    }

    return env.MAIN_SITE.fetch(request);
  },
} satisfies ExportedHandler<Env>;
