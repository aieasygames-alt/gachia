import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const GAME_IDS = ['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh'] as const;
const LOCALE_IDS = ['zh', 'en', 'ja'] as const;
const DEFAULT_CANONICAL_LOCALE: LocaleId = 'zh';

type GameId = (typeof GAME_IDS)[number];
type LocaleId = (typeof LOCALE_IDS)[number];

const LEGACY_CHARACTER_LIST_REDIRECTS: Partial<Record<GameId, readonly string[]>> = {
  endfield: ['angelina', 'saria', 'amiya', 'surtr', 'hound', 'fang', 'silverash', 'texas', 'orchid', 'exusiai'],
  nte: ['lacrimosa'],
  sea: ['princess', 'gail', 'edward'],
  starrail: ['griseo'],
};

const LEGACY_STARRAIL_ITEM_SLUGS = ['ancient-spar', 'scorched-acorn', 'storm-eye', 'void-cast-iron'] as const;

const INDEXABLE_GAME_ROUTES: Record<GameId, readonly string[]> = {
  genshin: ['characters', 'weapons', 'items', 'tier-list', 'calculator', 'map', 'guides', 'artifacts', 'build', 'version', 'download', 'compare', 'teams', 'redeem-codes'],
  starrail: ['characters', 'weapons', 'items', 'tier-list', 'calculator', 'map', 'guides', 'artifacts', 'build', 'version', 'download', 'compare', 'teams', 'redeem-codes'],
  wuwa: ['characters', 'weapons', 'items', 'tier-list', 'map', 'guides', 'build', 'version', 'download', 'compare', 'teams', 'redeem-codes'],
  nte: ['characters', 'weapons', 'items', 'tier-list', 'map', 'guides', 'disk-sets', 'redeem-codes', 'gacha', 'anomalies', 'build', 'version', 'download'],
  zzz: ['characters', 'weapons', 'items', 'tier-list', 'guides', 'drive-discs', 'build', 'version', 'download', 'compare', 'teams', 'redeem-codes'],
  guihuan: ['characters', 'weapons', 'items', 'tier-list', 'guides', 'build', 'version', 'download', 'compare', 'teams'],
  ananta: ['characters', 'weapons', 'items', 'tier-list', 'guides', 'build', 'version', 'download'],
  endfield: ['characters', 'weapons', 'items', 'tier-list', 'guides', 'build', 'version', 'download', 'compare', 'teams', 'map'],
  sea: ['characters', 'guides', 'items', 'tier-list', 'redeem-codes', 'build', 'version', 'download', 'calculator'],
  skjh: ['weapons', 'guides', 'items', 'redeem-codes', 'calculator', 'teams', 'map', 'build', 'version', 'download'],
};

function asLocale(segment?: string): LocaleId | undefined {
  return LOCALE_IDS.includes(segment as LocaleId) ? (segment as LocaleId) : undefined;
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

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const [firstSegment, secondSegment, thirdSegment, fourthSegment] = segments;
  const locale = asLocale(firstSegment);
  const game = asGame(locale ? secondSegment : firstSegment);

  if (game && !locale) {
    const cleanedSecondSegment = stripLabelSuffix(secondSegment);
    const cleanedThirdSegment = stripLabelSuffix(thirdSegment);

    if (secondSegment && !thirdSegment && cleanedSecondSegment) {
      const indexableRoutes = INDEXABLE_GAME_ROUTES[game];
      if (indexableRoutes.includes(cleanedSecondSegment)) {
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
    const indexableRoutes = INDEXABLE_GAME_ROUTES[game];
    if (!indexableRoutes.includes(thirdSegment)) {
      return redirectTo(request, `/${locale}/${game}`);
    }
  }

  // Redirect legacy lang-less game URLs to one stable canonical locale.
  if (game && !locale) {
    const targetLocale = DEFAULT_CANONICAL_LOCALE;

    if (secondSegment && !thirdSegment) {
      const indexableRoutes = INDEXABLE_GAME_ROUTES[game];
      if (!indexableRoutes.includes(secondSegment)) {
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
  if (!isStaticAsset) {
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

export const config = {
  matcher: [
    '/',
    '/(zh|en|ja)/:path*',
    '/(sitemap|api|privacy|terms|contact)',
    '/(genshin|starrail|wuwa|nte|zzz|guihuan|ananta|endfield|sea|skjh)/:path*',
  ],
};
