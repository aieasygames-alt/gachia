// A deliberately small contract shared by Payload and the website, without a CMS runtime dependency.
export type UpdateLocale = 'zh' | 'en' | 'ja';
export type UpdateKind = 'version' | 'banner' | 'event' | 'character' | 'guide';
export interface StarRailUpdate {
  gameId: 'starrail';
  slug: string;
  locale: UpdateLocale;
  kind: UpdateKind;
  title: string;
  summary: string;
  facts: { text: string }[];
  boundary: string;
  region: string;
  checkedAt: string;
  sources: { url: string }[];
  currentVersion?: string;
  releaseDate?: string;
  _status: 'published';
}

const officialHosts = new Set(['sr.mihoyo.com', 'act.mihoyo.com', 'hsr.hoyoverse.com', 'act.hoyoverse.com']);
export function isOfficialStarRailSource(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (isCommunityStarRailSource(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    // MiYouShe also hosts community posts: editors must verify the official author
    // and announcement section. Only Star Rail article URLs are valid citations.
    if (url.hostname === 'www.miyoushe.com') {
      return /^\/sr\/article\/[1-9]\d*\/?$/.test(url.pathname) && !url.search && !url.hash;
    }
    return officialHosts.has(url.hostname);
  } catch { return false; }
}

// Community-maintained references are explicitly labelled in the UI. Keep this
// list limited to reviewed detail pages; never interpret platform ownership as authorship.
const communitySources = new Set([
  'https://www.prydwen.gg/star-rail/guides/game-modes',
  'https://www.prydwen.gg/star-rail/guides/relic-sets',
  'https://www.prydwen.gg/star-rail/guides/pure-fiction',
  'https://www.prydwen.gg/star-rail/guides/apocalyptic-shadow',
  'https://www.prydwen.gg/star-rail/memory-of-chaos',
  'https://www.prydwen.gg/star-rail/pure-fiction',
  'https://bbs.mihoyo.com/sr/wiki/content/8099/detail',
  'https://www.prydwen.gg/star-rail/characters/aha',
  'https://starrailstation.com/cn/character/nihilux',
  'https://www.miyoushe.com/sr/article/79484786',
  'https://www.miyoushe.com/sr/article/79485999',
  'https://wiki.biligame.com/sr/%E6%98%9F%E7%A5%9E%E2%98%85%E9%98%BF%E5%93%88',
]);
export function isCommunityStarRailSource(value: unknown): value is string {
  return typeof value === 'string' && communitySources.has(value.replace(/\/$/, ''));
}
export function isStarRailSource(value: unknown): value is string {
  return isCommunityStarRailSource(value) || isOfficialStarRailSource(value);
}

export function isContentDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseStarRailUpdate(input: unknown): StarRailUpdate | null {
  if (!input || typeof input !== 'object') return null;
  const d = input as Record<string, unknown>;
  const text = (value: unknown, max = 12000): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (d.gameId !== 'starrail' || d._status !== 'published' || !['zh', 'en', 'ja'].includes(String(d.locale)) ||
      !['version', 'banner', 'event', 'character', 'guide'].includes(String(d.kind)) || !text(d.slug, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug) ||
      !text(d.title, 200) || !text(d.summary, 2000) || !text(d.region, 200) || !text(d.boundary, 2000) || !isContentDate(d.checkedAt)) return null;
  if (!Array.isArray(d.facts) || !d.facts.length || d.facts.length > 20 || !d.facts.every(f => f && text(f.text, 4000))) return null;
  if (!Array.isArray(d.sources) || !d.sources.length || d.sources.length > 10 || !d.sources.every(s => s && isStarRailSource(s.url))) return null;
  if (d.kind === 'version' && (!text(d.currentVersion, 100) || !isContentDate(d.releaseDate))) return null;
  // Strip internal CMS fields, relationships and unknown keys before rendering.
  return {
    gameId: 'starrail', slug: d.slug, locale: d.locale as UpdateLocale, kind: d.kind as UpdateKind,
    title: d.title, summary: d.summary, region: d.region, boundary: d.boundary, checkedAt: d.checkedAt,
    facts: d.facts.map(f => ({ text: f.text })), sources: d.sources.map(s => ({ url: s.url })),
    ...(d.kind === 'version' ? { currentVersion: d.currentVersion as string, releaseDate: d.releaseDate as string } : {}),
    _status: 'published',
  };
}
