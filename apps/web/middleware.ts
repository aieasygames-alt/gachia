import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';
import { GAME_IDS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { isWorkerPreviewOrigin } from './lib/preview-origin';
import { isRetiredPage } from './lib/retired-pages';

const intlMiddleware = createMiddleware(routing);

const DEFAULT_CANONICAL_LOCALE: LocaleId = 'zh';

type LocaleId = SupportedLocale;

const LEGACY_CHARACTER_LIST_REDIRECTS: Partial<Record<GameId, readonly string[]>> = {
  endfield: ['angelina', 'saria', 'amiya', 'surtr', 'hound', 'fang', 'silverash', 'texas', 'orchid', 'exusiai'],
  nte: ['lacrimosa'],
  sea: ['princess', 'gail', 'edward'],
  starrail: ['griseo'],
};

const LEGACY_STARRAIL_ITEM_SLUGS = ['ancient-spar', 'scorched-acorn', 'storm-eye', 'void-cast-iron'] as const;

const LEGACY_ROOT_ROUTES: Record<string, string> = {
  about: '/zh/about',
  calendar: '/zh/calendar',
  characters: '/zh/games',
  eggs: '/zh/roco/eggs',
  games: '/zh/games',
  guides: '/zh/games',
  map: '/zh/games',
  merchant: '/zh/roco/merchant',
  'pull-planner': '/zh/tools/pull-planner',
  'redeem-codes': '/zh/games',
  'tier-list': '/zh/games',
  'type-chart': '/zh/roco/type-chart',
  'update-radar': '/zh/update-radar',
};

const LEGACY_PATH_REDIRECTS: Record<string, string> = {
  '/tools/pull-planner': '/zh/tools/pull-planner',
  '/sea/guides/spongebob-collab-summer-faq-SpongeBob夏': '/zh/sea/guides/spongebob-collab-summer-faq',
  '/zzz/guides/steam-3-0-start-guide-Steam入門': '/zh/zzz/guides/steam-3-0-start-guide',
};

const GAME_ROUTE_DENYLIST: Partial<Record<GameId, readonly string[]>> = {
  aniimo: ['weapons', 'items', 'tier-list', 'build', 'compare', 'teams', 'artifacts', 'drive-discs', 'disk-sets', 'calculator', 'gacha', 'anomalies'],
  skjh: ['characters', 'tier-list', 'artifacts', 'drive-discs', 'disk-sets', 'compare', 'gacha', 'anomalies'],
  roco: ['items', 'artifacts', 'drive-discs', 'disk-sets', 'calculator', 'compare', 'teams', 'gacha', 'anomalies'],
  sea: ['weapons', 'artifacts', 'drive-discs', 'disk-sets', 'compare', 'teams', 'gacha', 'anomalies', 'map'],
};

function isIndexableRoute(game: GameId, route: string): boolean {
  return !GAME_ROUTE_DENYLIST[game]?.includes(route);
}

const GAME_ROUTE_ALLOWLIST: Partial<Record<GameId, readonly string[]>> = {
  nte: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'map', 'guides', 'disk-sets', 'redeem-codes', 'gacha', 'anomalies'],
  zzz: ['characters', 'weapons', 'items', 'tier-list', 'version', 'download', 'guides', 'drive-discs', 'build', 'compare', 'teams', 'redeem-codes', 'events'],
};

const LVMENG_ROUTES = new Set([
  'characters',
  'guides',
  'starter-guide',
  'world',
  'map',
  'progression',
  'news',
  'version',
  'download',
  'redeem-codes',
  'faq',
  'roadmap',
]);

function isUnsupportedGameRoute(game: GameId, route: string): boolean {
  const allowedRoutes = GAME_ROUTE_ALLOWLIST[game];
  return Boolean(allowedRoutes && !allowedRoutes.includes(route));
}

function asLocale(segment?: string): LocaleId | undefined {
  return LOCALES.includes(segment as LocaleId) ? (segment as LocaleId) : undefined;
}

function asGame(segment?: string): GameId | undefined {
  return GAME_IDS.includes(segment as GameId) ? (segment as GameId) : undefined;
}

function redirectTo(request: NextRequest, pathname: string, clearSearch = false) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  if (clearSearch) url.search = '';
  return NextResponse.redirect(url, 301);
}

function stripLabelSuffix(segment?: string) {
  if (!segment) return undefined;
  const stripped = decodeURIComponent(segment)
    .replace(/[：:].*$/, '')
    .replace(/[-\s]*[^\x00-\x7F].*$/, '')
    .trim()
    .replace(/-+$/, '');
  return stripped && stripped !== segment ? stripped : undefined;
}

function routeMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/robots.txt') return NextResponse.next();
  const decodedPathname = decodeURIComponent(pathname);
  const segments = pathname.split('/').filter(Boolean);
  const [firstSegment, secondSegment, thirdSegment, fourthSegment] = segments;
  const locale = asLocale(firstSegment);
  const game = asGame(locale ? secondSegment : firstSegment);

  const legacyPathTarget = LEGACY_PATH_REDIRECTS[decodedPathname];
  if (legacyPathTarget) return redirectTo(request, legacyPathTarget);

  if (isRetiredPage(decodedPathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const legacyRootRoute = firstSegment ? LEGACY_ROOT_ROUTES[firstSegment] : undefined;
  if (!locale && !game && segments.length === 1 && legacyRootRoute) {
    return redirectTo(request, legacyRootRoute);
  }

  // Lvmeng is served exclusively by its Chinese dedicated Worker. Never let the
  // main site generate localized or unknown-path fallback pages for it.
  if (game === 'lvmeng') {
    const isSupportedChinesePage = locale === 'zh' && (
      !thirdSegment ||
      LVMENG_ROUTES.has(thirdSegment) ||
      (thirdSegment === 'characters' && Boolean(fourthSegment) && segments.length === 4)
    );
    if (!isSupportedChinesePage) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (locale && game && thirdSegment && fourthSegment) {
    const cleanedDetailSegment = stripLabelSuffix(fourthSegment);
    if (cleanedDetailSegment) {
      return redirectTo(request, `/${locale}/${game}/${thirdSegment}/${cleanedDetailSegment}`);
    }
  }

  if (game && !locale) {
    const cleanedSecondSegment = stripLabelSuffix(secondSegment);
    const cleanedThirdSegment = stripLabelSuffix(thirdSegment);

    if (secondSegment && !thirdSegment && cleanedSecondSegment) {
      if (isIndexableRoute(game, cleanedSecondSegment)) {
        return redirectTo(request, `/${DEFAULT_CANONICAL_LOCALE}/${game}/${cleanedSecondSegment}`);
      }
    }

    if (secondSegment && thirdSegment && cleanedThirdSegment) {
      return redirectTo(request, `/${DEFAULT_CANONICAL_LOCALE}/${game}/${secondSegment}/${cleanedThirdSegment}`);
    }
  }

  const normalizedSegments = segments.map((segment) =>
    decodeURIComponent(segment).trim().replace(/\s+/g, '-')
  );
  const normalizedPathname = `/${normalizedSegments.join('/')}`;
  if (normalizedPathname !== pathname) {
    return redirectTo(request, normalizedPathname);
  }

  // Normalize accidental double-locale URLs, e.g. /en/en/zzz/weapons/starlight-engine.
  if (locale && asLocale(secondSegment)) {
    return redirectTo(request, `/${locale}/${segments.slice(2).join('/')}`);
  }

  // The site does not have a public search-results route. Keep stale schema URLs indexable-safe.
  if (locale && secondSegment === 'search') {
    return redirectTo(request, `/${locale}`, true);
  }

  // Repair historical URLs that dropped the game segment.
  if (locale && secondSegment === 'items' && thirdSegment && (thirdSegment === 'stagnant-shadow-shape-of-abundance' || LEGACY_STARRAIL_ITEM_SLUGS.includes(thirdSegment as typeof LEGACY_STARRAIL_ITEM_SLUGS[number]))) {
    return redirectTo(request, `/${locale}/starrail/items/${thirdSegment}`);
  }

  if (locale && secondSegment === 'guides' && thirdSegment === 'detailed-tier-list') {
    return redirectTo(request, `/${locale}/nte/guides/${thirdSegment}`);
  }

  // Old Star Rail slug without the canonical hyphen.
  if (locale && secondSegment === 'starrail' && thirdSegment === 'characters' && fourthSegment === 'jingyuan') {
    return redirectTo(request, `/${locale}/starrail/characters/jing-yuan`);
  }

  if (locale && secondSegment === 'starrail' && thirdSegment === 'characters' && fourthSegment === 'preservation-trailblazer') {
    return redirectTo(request, `/${locale}/starrail/characters`);
  }

  if (locale && secondSegment === 'starrail' && thirdSegment === 'characters' && fourthSegment === 'harmony-trailblazer') {
    return redirectTo(request, `/${locale}/starrail/characters`);
  }

  // Wuthering Waves echo detail pages are live, but there is no standalone echo index.
  if (locale && secondSegment === 'wuwa' && thirdSegment === 'echoes' && !fourthSegment) {
    return redirectTo(request, `/${locale}/wuwa`);
  }

  if (locale && game && thirdSegment === 'characters' && fourthSegment) {
    const legacySlugs = LEGACY_CHARACTER_LIST_REDIRECTS[game];
    if (legacySlugs?.includes(fourthSegment)) {
      return redirectTo(request, `/${locale}/${game}/characters`);
    }
  }

  if (locale && game && thirdSegment && !fourthSegment) {
    if (!isIndexableRoute(game, thirdSegment) || isUnsupportedGameRoute(game, thirdSegment)) {
      return redirectTo(request, `/${locale}/${game}`);
    }
  }

  // Redirect legacy lang-less game URLs to one stable canonical locale.
  if (game && !locale) {
    const targetLocale = DEFAULT_CANONICAL_LOCALE;

    if (secondSegment && !thirdSegment) {
      if (!isIndexableRoute(game, secondSegment)) {
        return redirectTo(request, `/${targetLocale}/${game}`);
      }
    }

    if (game === 'wuwa' && secondSegment === 'echoes' && !thirdSegment) {
      return redirectTo(request, `/${targetLocale}/wuwa`);
    }

    if (game === 'starrail' && secondSegment === 'characters' && thirdSegment === 'jingyuan') {
      return redirectTo(request, `/${targetLocale}/starrail/characters/jing-yuan`);
    }

    if (secondSegment === 'characters' && thirdSegment) {
      const legacySlugs = LEGACY_CHARACTER_LIST_REDIRECTS[game];
      if (legacySlugs?.includes(thirdSegment)) {
        return redirectTo(request, `/${targetLocale}/${game}/characters`);
      }
    }

    return redirectTo(request, `/${targetLocale}${pathname}`);
  }

  const response = intlMiddleware(request);

  // Override cache-control for public pages to allow Googlebot caching
  const isStaticAsset = pathname.startsWith('/_next') || pathname.startsWith('/images');
  const isApiRoute = pathname.startsWith('/api/');
  if (!isStaticAsset && !isApiRoute) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    );
  }

  // CRITICAL FIX: Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  if (pathname === '/') {
    const vary = response.headers.get('Vary');
    response.headers.set('Vary', vary ? `${vary}, Accept-Language` : 'Accept-Language');
  }

  return response;
}

export default function middleware(request: NextRequest) {
  if (!isWorkerPreviewOrigin(request.nextUrl.origin)) return routeMiddleware(request);
  const response = request.nextUrl.pathname === '/robots.txt'
    ? new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    : routeMiddleware(request);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    '/',
    '/robots.txt',
    '/about',
    '/calendar',
    '/characters',
    '/eggs',
    '/games',
    '/guides',
    '/map',
    '/merchant',
    '/pull-planner',
    '/redeem-codes',
    '/tier-list',
    '/tools/pull-planner',
    '/type-chart',
    '/update-radar',
    '/(zh|en|ja)/:path*',
    '/(sitemap|api|privacy|terms|contact)',
    '/(genshin|starrail|wuwa|nte|zzz|guihuan|ananta|endfield|sea|skjh|roco|roco-cn|aniimo)/:path*',
  ],
};
