import fallbackData from './starrail-snapshot.json';
import { parseStarRailUpdate, type StarRailUpdate, type UpdateLocale } from './starrail-updates';
import { STARRAIL_LOCALE_LIMIT } from './starrail-limits';

export type UpdateResult = { source: 'cms' | 'snapshot'; updates: StarRailUpdate[] };

export async function readStarRailUpdates(
  locale: UpdateLocale,
  cmsOrigin?: string,
  fetcher: typeof fetch = fetch,
): Promise<UpdateResult> {
  const fallback = (): UpdateResult => ({
    source: 'snapshot',
    updates: fallbackData.map(parseStarRailUpdate).filter((d): d is StarRailUpdate => Boolean(d) && d?.locale === locale),
  });
  if (!cmsOrigin) return fallback();
  try {
    const origin = new URL(cmsOrigin);
    if (!['https:', 'http:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') return fallback();
    const url = new URL('/api/game-updates', origin);
    url.search = new URLSearchParams({
      'where[and][0][gameId][equals]': 'starrail',
      'where[and][1][locale][equals]': locale,
      'where[and][2][_status][equals]': 'published',
      sort: '-checkedAt,-updatedAt', limit: String(STARRAIL_LOCALE_LIMIT), depth: '0', draft: 'false',
    }).toString();
    const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!response.ok) return fallback();
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('docs' in body) || !Array.isArray(body.docs) ||
        ('hasNextPage' in body && body.hasNextPage) || body.docs.length > STARRAIL_LOCALE_LIMIT) return fallback();
    const updates = body.docs.map(parseStarRailUpdate);
    if (updates.some((d: StarRailUpdate | null) => !d || d.locale !== locale)) return fallback();
    // An empty published collection intentionally hides the local snapshot (e.g. after unpublishing).
    return { source: 'cms', updates: updates as StarRailUpdate[] };
  } catch { return fallback(); }
}
