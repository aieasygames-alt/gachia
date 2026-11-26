import { STARRAIL_CMS_MATERIALS } from './starrail-materials';
import { parseStarRailEventSchedule, type StarRailEventSchedule } from './starrail-events';
import { STARRAIL_CMS_EQUIPMENT } from './starrail-equipment';
import { parseStarRailCharacter, STARRAIL_CMS_CHARACTERS, type VerifiedStarRailCharacter } from './starrail-character';
// A deliberately small contract shared by Payload and the website, without a CMS runtime dependency.
export type UpdateLocale = 'zh' | 'en' | 'ja';
export type UpdateKind = 'version' | 'banner' | 'event' | 'character' | 'guide' | 'equipment' | 'material';
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
  characterData?: VerifiedStarRailCharacter;
  eventSchedule?: StarRailEventSchedule;
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
  'https://wiki.biligame.com/sr/%E7%88%BB%E5%85%89',
  'https://starrailstation.com/cn/character/yaoguang',
  'https://wiki.biligame.com/sr/%E9%93%B6%E7%8B%BCLV.999',
  'https://starrailstation.com/cn/character/silverwolflv999',
  'https://wiki.biligame.com/sr/%E7%81%AB%E8%8A%B1',
  'https://starrailstation.com/cn/character/sparxie',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/characters.json',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/character_skills.json',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/character_skill_trees.json',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/character_promotions.json',

  'https://wiki.biligame.com/sr/%E9%9D%92%E9%93%9C%E7%9A%84%E6%89%A7%E7%9D%80',
  'https://wiki.biligame.com/sr/%E5%AF%92%E9%93%81%E7%9A%84%E8%AA%93%E8%A8%80',
  'https://wiki.biligame.com/sr/%E7%90%A5%E7%8F%80%E7%9A%84%E5%9D%9A%E5%AE%88',
  'https://wiki.biligame.com/sr/%E4%B8%B0%E9%A5%B6%E4%B9%8B%E7%A7%8D',
  'https://wiki.biligame.com/sr/%E7%94%9F%E5%91%BD%E4%B9%8B%E8%8A%BD',
  'https://wiki.biligame.com/sr/%E6%B0%B8%E6%81%92%E4%B9%8B%E8%8A%B1',
  'https://wiki.biligame.com/sr/%E6%AD%A5%E7%A6%BB%E7%8A%AC%E7%89%99',
  'https://wiki.biligame.com/sr/%E7%8B%BC%E6%AF%92%E9%94%AF%E7%89%99',
  'https://wiki.biligame.com/sr/%E6%9C%88%E7%8B%82%E7%8D%A0%E7%89%99',
  'https://wiki.biligame.com/sr/%E9%99%A8%E9%93%81%E5%BC%B9%E4%B8%B8',
  'https://wiki.biligame.com/sr/%E5%91%BD%E5%AE%9A%E6%AD%BB%E5%9B%A0',
  'https://wiki.biligame.com/sr/%E9%80%86%E6%97%B6%E4%B8%80%E5%87%BB',
  'https://wiki.biligame.com/sr/%E7%82%BD%E6%83%85%E4%B9%8B%E7%81%B5',
  'https://wiki.biligame.com/sr/%E6%98%9F%E7%81%AB%E4%B9%8B%E7%B2%BE',
  'https://wiki.biligame.com/sr/%E7%84%9A%E5%A4%A9%E4%B9%8B%E9%AD%94',
  'https://wiki.biligame.com/sr/%E4%BF%A1%E7%94%A8%E7%82%B9',
  'https://wiki.biligame.com/sr/%E7%86%84%E7%81%AD%E5%8E%9F%E6%A0%B8',
  'https://wiki.biligame.com/sr/%E5%BE%AE%E5%85%89%E5%8E%9F%E6%A0%B8',
  'https://wiki.biligame.com/sr/%E8%A0%A2%E5%8A%A8%E5%8E%9F%E6%A0%B8',
  'https://wiki.biligame.com/sr/%E5%B7%A5%E9%80%A0%E6%9C%BA%E6%9D%BC',
  'https://wiki.biligame.com/sr/%E5%B7%A5%E9%80%A0%E8%BF%B4%E8%BD%AE',
  'https://wiki.biligame.com/sr/%E5%B7%A5%E9%80%A0%E6%B5%91%E5%BF%83',
  'https://wiki.biligame.com/sr/%E8%93%84%E6%A2%A6%E5%85%83%E4%BB%B6',
  'https://wiki.biligame.com/sr/%E6%B5%81%E6%A2%A6%E9%98%80%E9%97%A8',
  'https://wiki.biligame.com/sr/%E9%80%A0%E6%A2%A6%E9%A9%AC%E8%BE%BE',
  'https://wiki.biligame.com/sr/%E6%B0%B8%E5%AF%BF%E5%B9%BC%E8%8A%BD',
  'https://wiki.biligame.com/sr/%E6%B0%B8%E5%AF%BF%E5%A4%A9%E5%8D%8E',
  'https://wiki.biligame.com/sr/%E6%B0%B8%E5%AF%BF%E8%8D%A3%E6%9E%9D',
  'https://wiki.biligame.com/sr/%E7%A0%B4%E7%A2%8E%E6%AE%8B%E5%88%83',
  'https://wiki.biligame.com/sr/%E6%97%A0%E7%94%9F%E6%AE%8B%E5%88%83',
  'https://wiki.biligame.com/sr/%E5%87%80%E4%B8%96%E6%AE%8B%E5%88%83',
  'https://wiki.biligame.com/sr/%E7%81%B5%E6%84%9F%E4%B9%8B%E9%92%A5',
  'https://wiki.biligame.com/sr/%E5%90%AF%E8%BF%AA%E4%B9%8B%E9%92%A5',
  'https://wiki.biligame.com/sr/%E6%99%BA%E8%AF%86%E4%B9%8B%E9%92%A5',

  'https://wiki.biligame.com/sr/%E5%A4%A9%E6%89%8D%E4%BB%AC%E7%9A%84%E4%BC%91%E6%86%A9',
  'https://wiki.biligame.com/sr/%E9%BB%91%E5%A4%9C%E5%A6%82%E5%BD%B1%E9%9A%8F%E8%A1%8C',
  'https://wiki.biligame.com/sr/%E8%A1%8C%E4%BA%8E%E6%B5%81%E9%80%9D%E7%9A%84%E5%B2%B8',
  'https://wiki.biligame.com/sr/%E6%AF%94%E9%98%B3%E5%85%89%E6%9B%B4%E6%98%8E%E4%BA%AE%E7%9A%84',
  'https://wiki.biligame.com/sr/%E6%8B%82%E6%99%93%E4%B9%8B%E5%89%8D',
  'https://wiki.biligame.com/sr/%E9%93%AD%E8%AE%B0%E4%BA%8E%E5%BF%83%E7%9A%84%E7%BA%A6%E5%AE%9A',
  'https://wiki.biligame.com/sr/%E4%B9%90%E5%9C%AE',
  'https://wiki.biligame.com/sr/%E5%98%89%E6%9E%9C',
  'https://wiki.biligame.com/sr/%E4%BD%99%E7%94%9F%E7%9A%84%E7%AC%AC%E4%B8%80%E5%A4%A9',

  'https://wiki.biligame.com/sr/%E6%AC%A2%E8%BF%8E%E6%9D%A5%E5%88%B0%E9%93%B6%E6%B2%B3%E5%9F%8E',
  'https://wiki.biligame.com/sr/%E8%8A%B1%E8%8A%B1%E4%B8%96%E7%95%8C%E8%BF%B7%E4%BA%BA%E7%9C%BC',
  'https://wiki.biligame.com/sr/%E5%BD%93%E5%A5%B9%E5%86%B3%E5%AE%9A%E7%9C%8B%E8%A7%81',
  'https://wiki.biligame.com/sr/%E5%AE%87%E5%AE%99%E5%B8%82%E5%9C%BA%E8%B6%8B%E5%8A%BF',
  'https://wiki.biligame.com/sr/%E5%A5%B9%E5%B7%B2%E9%97%AD%E4%B8%8A%E5%8F%8C%E7%9C%BC',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/light_cones.json',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/light_cone_ranks.json',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/light_cone_promotions.json',
  'https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/items.json',

  'https://starrailstation.com/cn/relics/329',
  'https://starrailstation.com/cn/relics/330',
  'https://wiki.biligame.com/sr/%E5%BD%93%E7%AC%AC%E4%B8%80%E5%A3%B0%E3%80%8C%E9%98%BF%E5%93%88%E3%80%8D%E5%93%8D%E8%B5%B7',
  'https://wiki.biligame.com/sr/%E7%A5%9E%E7%9A%84%E7%9E%AC%E6%81%AF%E6%AC%A2%E6%84%89',
  'https://wiki.biligame.com/sr/%E4%BA%9A%E7%A9%BA%E5%BC%82%E5%AE%B9%E6%89%80',

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
      !['version', 'banner', 'event', 'character', 'guide', 'equipment', 'material'].includes(String(d.kind)) || !text(d.slug, 100) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug) ||
      !text(d.title, 200) || !text(d.summary, 2000) || !text(d.region, 200) || !text(d.boundary, 2000) || !isContentDate(d.checkedAt)) return null;
  if (!Array.isArray(d.facts) || !d.facts.length || d.facts.length > 20 || !d.facts.every(f => f && text(f.text, 4000))) return null;
  if (!Array.isArray(d.sources) || !d.sources.length || d.sources.length > 10 || !d.sources.every(s => s && isStarRailSource(s.url))) return null;
  if (d.kind === 'version' && (!text(d.currentVersion, 100) || !isContentDate(d.releaseDate))) return null;
  if (d.kind === 'equipment' && !Object.values(STARRAIL_CMS_EQUIPMENT).some(entries => Object.hasOwn(entries, d.slug as string))) return null;
  if (d.kind === 'material' && !Object.hasOwn(STARRAIL_CMS_MATERIALS, d.slug as string)) return null;
  const characterData = d.characterData == null ? undefined : parseStarRailCharacter(d.characterData);
  if (characterData === null || (characterData && (d.kind !== 'character' || d.slug !== STARRAIL_CMS_CHARACTERS[characterData.id]))) return null;
  const cnSources = d.sources.map(s => s.url).filter((url: string) => isOfficialStarRailSource(url) && ['www.miyoushe.com', 'sr.mihoyo.com', 'act.mihoyo.com'].includes(new URL(url).hostname));
  const eventSchedule = d.eventSchedule == null ? undefined : parseStarRailEventSchedule(d.eventSchedule, cnSources);
  if (eventSchedule === null || (eventSchedule && (d.kind !== 'event' || !d.region.includes('国服') || d.region.includes('国际服')))) return null;
  // Strip internal CMS fields, relationships and unknown keys before rendering.
  return {
    gameId: 'starrail', slug: d.slug, locale: d.locale as UpdateLocale, kind: d.kind as UpdateKind,
    title: d.title, summary: d.summary, region: d.region, boundary: d.boundary, checkedAt: d.checkedAt,
    facts: d.facts.map(f => ({ text: f.text })), sources: d.sources.map(s => ({ url: s.url })),
    ...(d.kind === 'version' ? { currentVersion: d.currentVersion as string, releaseDate: d.releaseDate as string } : {}),
    ...(characterData ? { characterData } : {}),
    ...(eventSchedule ? { eventSchedule } : {}),
    _status: 'published',
  };
}
