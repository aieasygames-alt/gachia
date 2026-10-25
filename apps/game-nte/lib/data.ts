import rawCharacterSummaries from '@gachia/data/games/nte/raw-character-summaries.json';
import rawCharacters from '@gachia/data/games/nte/raw-characters.json';
import rawGuides from '@gachia/data/games/nte/raw-guides.json';
import rawWeapons from '@gachia/data/games/nte/raw-weapons.json';
import rawDiskSets from '@gachia/data/games/nte/raw-disk-sets.json';
import rawRedeemCodes from '@gachia/data/games/nte/raw-redeem-codes.json';
import rawMaterials from '@gachia/data/games/nte/raw-materials.json';
import rawGacha from '@gachia/data/games/nte/raw-gacha-system.json';
import rawAnomalies from '@gachia/data/games/nte/raw-anomalies.json';
import rawRegions from '@gachia/data/games/nte/raw-regions.json';
import rawBuilds from '@gachia/data/games/nte/raw-builds.json';
import rawCharacterMaterials from '@gachia/data/games/nte/raw-character-materials.json';
import type { SupportedLocale } from '@gachia/core';

type LocalizedEntry = { name: string; nameEn: string; nameJa?: string; id: string; attribute?: string; rank?: string; roleEn?: string; weaponEn?: string; tierRank?: string; status?: string };
type GuideEntry = { id: string; title: string; titleEn: string; titleJa?: string; content: string; contentEn: string; contentJa?: string; summary?: string; summaryEn?: string; summaryJa?: string };
type CharacterText = { name?: string; nameEn?: string; description?: string; descriptionEn?: string; cooldown?: string; cost?: string; awakenReq?: number; level?: number };
type CharacterFaq = { question?: string; questionZh?: string; answer?: string; answerZh?: string };
type CharacterBuild = { bestWeapon?: string; bestWeaponEn?: string; alternativeWeapons?: Array<string | { id?: string; name?: string; nameEn?: string }>; bestDiskSet?: string; bestDiskSetEn?: string; mainStats?: Record<string, string>; mainStatsEn?: Record<string, string>; subStatPriority?: string[]; subStatPriorityEn?: string[] };
export type NteCharacter = LocalizedEntry & {
  role?: string;
  weapon?: string;
  faction?: string;
  description?: string;
  descriptionEn?: string;
  tierReason?: string;
  tierReasonZh?: string;
  faq?: CharacterFaq[];
  relatedCharacters?: string[];
  skills?: { normalAttack?: CharacterText; skill?: CharacterText; ultimate?: CharacterText; passives?: CharacterText[]; qte?: CharacterText; resonance?: CharacterText[]; awakening?: CharacterText[] };
  recommendedBuild?: CharacterBuild;
  teamComps?: Array<{ name?: string; nameEn?: string; members?: string[]; description?: string; descriptionEn?: string }>;
  cvZh?: string;
  cvJp?: string;
  cvJpEn?: string;
  cvEn?: string;
  acquisitionMethod?: string;
};
export const nteCharacterSummaries = (rawCharacterSummaries as LocalizedEntry[]).filter((entry) => entry.id);
export const nteCharacters = (rawCharacters as NteCharacter[]).filter((entry) => entry.id);
export const guides = rawGuides as GuideEntry[];
export const nteWeapons = rawWeapons as Array<LocalizedEntry & { rank?: string; type?: string; baseAtk?: number; effectDescription?: string; effectDescriptionEn?: string }>;
export const diskSets = rawDiskSets as Array<LocalizedEntry & { element?: string; setDescription2pc?: string; setDescription2pcEn?: string; setDescription4pc?: string; setDescription4pcEn?: string }>;
export const redeemCodes = rawRedeemCodes as Array<{ code: string; reward: string; rewardEn: string; status: string; expiresAt: string; source: string; region: string; revealedAt: string }>;
export const versionCheckRoute = [
  {
    id: 'notice-and-expiry',
    href: 'events',
    title: { zh: '先核对公告与有效期', en: 'Check notices and expiry first', ja: 'まず告知と期限を確認' },
    summary: { zh: '确认 1.4 更新、维护、活动条件和结束时间；过期活动仅作为历史记录。', en: 'Confirm v1.4 updates, maintenance, event requirements, and end times; treat expired events as history only.', ja: 'v1.4更新、メンテナンス、イベント条件、終了時刻を確認し、期限切れイベントは履歴として扱います。' },
  },
  {
    id: 'codes-and-mail',
    href: 'redeem-codes',
    title: { zh: '再核对兑换、邮件与商店', en: 'Then check codes, mail, and shops', ja: '次にコード、メール、ショップを確認' },
    summary: { zh: '逐条确认兑换码地区、状态与到期信息，再检查游戏内邮件和限时商店。', en: 'Verify each code region, status, and expiry, then check in-game mail and limited shops.', ja: '各コードの地域、状態、期限を確認してから、ゲーム内メールと期間限定ショップを確認します。' },
  },
  {
    id: 'pity-and-resources',
    href: 'gacha',
    title: { zh: '最后再安排抽卡与资源', en: 'Plan pulls and resources last', ja: '最後にガチャと資源を計画' },
    summary: { zh: '以当前客户端的池子、剩余时间、抽数和保底显示为准，不用过期福利或社媒转述补足预算。', en: 'Use the live client banner, remaining time, pull count, and pity display; do not pad a budget with expired rewards or social retellings.', ja: '現行クライアントのバナー、残り時間、抽選回数、天井表示を基準にし、期限切れ報酬やSNSの伝聞で予算を補いません。' },
  },
] as const;
export const materials = rawMaterials as Array<LocalizedEntry & { type?: string; typeZh?: string; rarity?: number; source?: string }>;
export const tierLists = [{ locale: 'zh', entries: nteCharacterSummaries.map((item) => ({ characterId: item.id, tier: item.rank ?? 'B', role: 'Character' })) }, { locale: 'en', entries: nteCharacterSummaries.map((item) => ({ characterId: item.id, tier: item.rank ?? 'B', role: 'Character' })) }, { locale: 'ja', entries: nteCharacterSummaries.map((item) => ({ characterId: item.id, tier: item.rank ?? 'B', role: 'Character' })) }];
export const downloadInfo = { officialUrl: 'https://nte.perfectworld.com/', platforms: ['PC', 'iOS / Android', 'PlayStation 5'], specs: { zh: 'PC 建议 SSD 和 16GB 内存起步，移动端建议预留 20GB 以上。', en: 'Use SSD and 16GB RAM on PC; reserve 20GB+ on mobile.', ja: 'PCはSSDと16GB RAM、モバイルは20GB以上推奨。' } };
export const gacha = rawGacha as unknown as { banners: Array<{ id: string; nameZh: string; nameEn: string; descZh: string; descEn: string; sRate?: string; aRate?: string; bRate?: string; hardPity: number; softPity?: number | null; avgPity?: number; no5050: boolean }>; faqs: Array<{ questionZh: string; questionEn?: string; answerZh: string; answerEn?: string }> };
export const anomalies = rawAnomalies as Array<{
  id: string;
  name: string;
  nameEn: string;
  typeZh: string;
  type: string;
  category?: string;
  categoryZh?: string;
  attribute: string;
  attributeEn: string;
  hp?: string;
  weakness?: string;
  weaknessEn?: string;
  mechanics?: string;
  mechanicsEn?: string;
  location?: string;
  locationEn?: string;
  appearance?: string;
  drops?: string[];
  dropsEn?: string[];
  strategy: string;
  strategyEn: string;
}>;
export const regions = rawRegions as Array<{ id: string; name: string; nameEn: string; nameJa?: string; description: string; descriptionEn: string; descriptionJa?: string; highlights: string[]; specialties: string[]; bosses: string[]; domains: string[]; tips: string[]; subRegions: string[] }>;
export const characterBuilds = rawBuilds as Array<{ characterId: string; builds: Array<{ id: string; name: string; nameEn: string; description: string; descriptionEn: string; mainStat: string; mainStatEn: string; subStats: string[]; subStatsEn: string[]; recommendedWeapons: string[]; teamComp: string[]; notes: string; notesEn: string }> }>;
export const characterMaterials = rawCharacterMaterials as Array<{ characterId: string; levelingMaterials: Array<{ levelRange: string; materials: Array<{ id: string; quantity: number }> }>; skillMaterials: Array<{ id: string; quantity: number }> }>;

function hasJapaneseText(value: unknown, minimumLength = 40): value is string {
  return typeof value === 'string' && Array.from(value.trim()).length >= minimumLength && /[\u3040-\u30ff]/.test(value);
}

export function hasJapaneseNteGuideContent(guide: GuideEntry): boolean {
  return hasJapaneseText(guide.titleJa, 8) && hasJapaneseText(guide.summaryJa) && hasJapaneseText(guide.contentJa, 200);
}

export function isNteJapanesePathIndexable(path = ''): boolean {
  const guideMatch = path.match(/^\/guides\/([^/]+)$/);
  if (!guideMatch) return false;
  const guide = guides.find((entry) => entry.id === guideMatch[1]);
  return Boolean(guide && hasJapaneseNteGuideContent(guide));
}

export function isNteLocaleIndexable(locale: SupportedLocale, path = ''): boolean {
  return locale !== 'ja' || isNteJapanesePathIndexable(path);
}

export function localeName(value: { zh: string; en: string; ja: string }, locale: SupportedLocale) {
  return value[locale];
}

export function characterName(character: (typeof nteCharacterSummaries)[number], locale: SupportedLocale) {
  return locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa ?? character.nameEn : character.nameEn;
}

export { characterImage } from './character-media';

export function getNteCharacter(id: string): NteCharacter | undefined {
  return nteCharacters.find((entry) => entry.id === id) ?? nteCharacterSummaries.find((entry) => entry.id === id) as NteCharacter | undefined;
}

export function characterText(entry: { name?: string; nameEn?: string }, locale: SupportedLocale) {
  return locale === 'zh' ? entry.name ?? entry.nameEn ?? '' : entry.nameEn ?? entry.name ?? '';
}

export function characterDescription(character: NteCharacter, locale: SupportedLocale) {
  return locale === 'zh' ? character.description ?? character.descriptionEn ?? '' : character.descriptionEn ?? character.description ?? '';
}

export function getCharacterBuilds(id: string) { return characterBuilds.find((entry) => entry.characterId === id)?.builds ?? []; }
export function getCharacterMaterials(id: string) { return characterMaterials.find((entry) => entry.characterId === id); }

export function getNteWeaponName(weapon: (typeof nteWeapons)[number], locale: SupportedLocale) { return locale === 'zh' ? weapon.name : locale === 'ja' ? weapon.nameJa ?? weapon.nameEn : weapon.nameEn; }
export function getNteDiskSetName(set: (typeof diskSets)[number], locale: SupportedLocale) { return locale === 'zh' ? set.name : locale === 'ja' ? set.nameJa ?? set.nameEn : set.nameEn; }
export function getNteMaterialName(item: (typeof materials)[number], locale: SupportedLocale) { return locale === 'zh' ? item.name : locale === 'ja' ? item.nameJa ?? item.nameEn : item.nameEn; }
export function diskSetEffect(set: (typeof diskSets)[number], piece: 2 | 4, locale: SupportedLocale) { const zh = piece === 2 ? set.setDescription2pc : set.setDescription4pc; const en = piece === 2 ? set.setDescription2pcEn : set.setDescription4pcEn; return locale === 'zh' ? zh ?? '' : en ?? zh ?? ''; }
export function materialType(item: (typeof materials)[number], locale: SupportedLocale) { return locale === 'zh' ? item.typeZh ?? item.type ?? '' : item.type ?? ''; }
export function materialSource(item: (typeof materials)[number], locale: SupportedLocale) { return locale === 'zh' ? item.source ?? '' : ''; }
export function regionName(region: (typeof regions)[number], locale: SupportedLocale) { return locale === 'zh' ? region.name : locale === 'ja' ? region.nameJa ?? region.nameEn : region.nameEn; }
export function regionDescription(region: (typeof regions)[number], locale: SupportedLocale) { return locale === 'zh' ? region.description : locale === 'ja' ? region.descriptionJa ?? region.descriptionEn : region.descriptionEn; }
