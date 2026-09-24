interface Env {
  MAIN_SITE: Fetcher;
  NTE_SITE?: Fetcher;
  NTE_ENABLED?: string;
  AZUR_PROMILIA_SITE?: Fetcher;
  AZUR_PROMILIA_ENABLED?: string;
  GENSHIN_SITE?: Fetcher;
  GENSHIN_ENABLED?: string;
  PREVIEW_MODE?: string;
  AZUR_PROMILIA_CANARY_COOKIE?: string;
  GENSHIN_CANARY_COOKIE?: string;
}

import { GENERATED_GAME_DEPLOYMENTS } from './generated-game-deployments';

const LOCALES = new Set(['zh', 'en', 'ja']);
const NTE_PAGES = new Set(['characters', 'guides', 'weapons', 'redeem-codes', 'version', 'items', 'disk-sets', 'tier-list', 'download', 'gacha', 'anomalies', 'build', 'teams', 'compare', 'calculator', 'events', 'merchant', 'map']);
const NTE_DETAIL_PAGES = new Set(['characters', 'guides', 'disk-sets', 'weapons']);
const AZUR_PROMILIA_PAGES = new Set(['characters', 'guides', 'weapons', 'tier-list', 'redeem-codes', 'kibo', 'world', 'planner', 'version', 'systems']);
const AZUR_PROMILIA_DETAIL_PAGES = new Set(['characters', 'guides', 'weapons']);
const GENSHIN_PAGES = new Set(['characters', 'guides', 'weapons', 'artifacts', 'items', 'redeem-codes', 'gacha', 'version', 'tier-list', 'download', 'map', 'build', 'teams', 'compare', 'calculator']);
const GENSHIN_DETAIL_PAGES = new Set(['characters', 'guides', 'weapons', 'artifacts', 'items']);

const NTE_DEPLOYMENT = GENERATED_GAME_DEPLOYMENTS.find((deployment) => deployment.id === 'nte');
const AZUR_PROMILIA_DEPLOYMENT = GENERATED_GAME_DEPLOYMENTS.find((deployment) => deployment.id === 'azur-promilia');
const GENSHIN_DEPLOYMENT = GENERATED_GAME_DEPLOYMENTS.find((deployment) => deployment.id === 'genshin');

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

function isGenshinRequest(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const isLocalizedPage = LOCALES.has(segments[0] ?? '') && segments[1] === 'genshin' && (
    segments.length === 2 ||
    (segments.length === 3 && GENSHIN_PAGES.has(segments[2] ?? '')) ||
    (segments.length === 4 && GENSHIN_DETAIL_PAGES.has(segments[2] ?? ''))
  );
  return (
    isLocalizedPage ||
    (segments.length >= 2 && segments[0] === '_games' && segments[1] === 'genshin') ||
    (segments.length >= 2 && segments[0] === 'sitemaps' && segments[1] === 'genshin')
  );
}

function requestForNteWorker(request: Request): Request {
  const url = new URL(request.url);
  if (NTE_DEPLOYMENT && (url.pathname === NTE_DEPLOYMENT.sitemapPath || url.pathname === `${NTE_DEPLOYMENT.sitemapPath}/`)) {
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
  if (AZUR_PROMILIA_DEPLOYMENT && (url.pathname === AZUR_PROMILIA_DEPLOYMENT.sitemapPath || url.pathname === `${AZUR_PROMILIA_DEPLOYMENT.sitemapPath}/`)) {
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

function requestForGenshinWorker(request: Request): Request {
  const url = new URL(request.url);
  if (GENSHIN_DEPLOYMENT && (url.pathname === GENSHIN_DEPLOYMENT.sitemapPath || url.pathname === `${GENSHIN_DEPLOYMENT.sitemapPath}/`)) {
    url.pathname = '/sitemap.xml';
    return new Request(url, request);
  }
  const assetPrefix = '/_games/genshin/_next/';
  if (url.pathname.startsWith(assetPrefix)) {
    url.pathname = `/_next/${url.pathname.slice(assetPrefix.length)}`;
    return new Request(url, request);
  }
  return request;
}

async function fetchWithRouteMarker(worker: Fetcher, request: Request, marker: string): Promise<Response> {
  const response = await worker.fetch(request);
  const headers = new Headers(response.headers);
  const contentType = headers.get('content-type') ?? '';
  const isPublicHtml = request.method === 'GET' && response.status === 200 && contentType.includes('text/html') && !request.headers.has('cookie') && !request.headers.has('authorization');
  if (isPublicHtml && !headers.has('cache-control')) headers.set('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
  if (request.headers.get('x-gachia-route-debug') === '1') headers.set('x-gachia-route-target', marker);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
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
    if (env.NTE_SITE && env.NTE_ENABLED !== 'false' && isNteRequest(url.pathname)) {
      return fetchWithRouteMarker(env.NTE_SITE, requestForNteWorker(request), 'nte');
    }

    if (isEnabled(env.AZUR_PROMILIA_ENABLED) && env.AZUR_PROMILIA_SITE && isAzurPromiliaRequest(url.pathname) && hasCanaryCookie(request, env.AZUR_PROMILIA_CANARY_COOKIE, 'gachia_azur_promilia_canary')) {
      return fetchWithRouteMarker(env.AZUR_PROMILIA_SITE, requestForAzurPromiliaWorker(request), 'azur-promilia');
    }

    if (isEnabled(env.GENSHIN_ENABLED) && env.GENSHIN_SITE && isGenshinRequest(url.pathname) && hasCanaryCookie(request, env.GENSHIN_CANARY_COOKIE, 'gachia_genshin_canary')) {
      return fetchWithRouteMarker(env.GENSHIN_SITE, requestForGenshinWorker(request), 'genshin');
    }

    return env.MAIN_SITE.fetch(request);
  },
} satisfies ExportedHandler<Env>;
