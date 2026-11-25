// A deliberately small contract shared by Payload and the website, without a CMS runtime dependency.
export type UpdateLocale = 'zh' | 'en' | 'ja';
export type UpdateKind = 'version' | 'banner' | 'event';
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
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && officialHosts.has(url.hostname) && !url.username && !url.password && !url.port;
  } catch { return false; }
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
      !['version', 'banner', 'event'].includes(String(d.kind)) || !text(d.slug, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug) ||
      !text(d.title, 200) || !text(d.summary, 2000) || !text(d.region, 200) || !text(d.boundary, 2000) || !isContentDate(d.checkedAt)) return null;
  if (!Array.isArray(d.facts) || !d.facts.length || d.facts.length > 20 || !d.facts.every(f => f && text(f.text, 4000))) return null;
  if (!Array.isArray(d.sources) || !d.sources.length || d.sources.length > 10 || !d.sources.every(s => s && isOfficialStarRailSource(s.url))) return null;
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
