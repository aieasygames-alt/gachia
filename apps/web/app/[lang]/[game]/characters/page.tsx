import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteCharacters, getNteCharacterName, getNteCharacterImage, genshinCharacters, getGenshinCharacterName, getGenshinCharacterImage, starrailCharacters, getStarRailCharacterName, getStarRailCharacterImage, wuwaCharacters, getWuWaCharacterName, getWuWaCharacterImage, zzzCharacters, getZzzCharacterName, getZzzCharacterImage, anantaCharacters, getAnantaCharacterName, getAnantaCharacterImage } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

const BASE_URL = 'https://gachia.com';

const CHAR_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全角色图鉴，包含五星、四星角色数据、技能、突破材料', en: 'Complete Genshin Impact character roster with stats, skills, and ascension materials', ja: '原神全キャラクター図鑑、ステータス、スキル、突破素材' },
  starrail: { zh: '崩坏：星穹铁道全角色图鉴，包含属性、命途、技能数据', en: 'Complete Honkai: Star Rail character roster with elements, paths, and skill data', ja: 'スターレイル全キャラ図鑑、属性、運命、スキルデータ' },
  wuwa: { zh: '鸣潮全角色图鉴，包含属性、武器类型、技能数据', en: 'Complete Wuthering Waves character roster with elements, weapon types, and skill data', ja: '鳴潮全キャラ図鑑、属性、武器タイプ、スキルデータ' },
  nte: { zh: '异环全角色图鉴，包含S级、A级角色数据', en: 'Complete Neverness to Everness character roster with S-Rank and A-Rank data', ja: '異環全キャラ図鑑、S級、A級キャラデータ' },
  zzz: { zh: '绝区零全代理人图鉴，包含属性、专精数据', en: 'Complete Zenless Zone Zero agent roster with attributes and specialties', ja: 'ゼンレスゾーンゼロ全エージェント図鑑、属性、専門データ' },
  ananta: { zh: '无限大全异能者图鉴，包含SSR、SR角色数据、异能、配装推荐', en: 'Complete Ananta Esper roster with SSR, SR data, abilities, and build recommendations', ja: 'アナンタ全エスパー図鑑、SSR、SRキャラデータ' },
};

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
};

const ZZZ_SPECIALTY_LABELS: Record<string, Record<string, string>> = {
  Attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  Stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  Anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  Support: { zh: '支援', en: 'Support', ja: '支援' },
  Defense: { zh: '防护', en: 'Defense', ja: '防護' },
};

const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
};

const STARRAIL_ELEMENT_COLORS: Record<string, string> = {
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
  wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
};

const STARRAIL_PATH_LABELS: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' },
  hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' },
  harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' },
  preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' },
  remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
};

const GENSHIN_WEAPON_LABELS: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const ANANTA_ELEMENT_COLORS: Record<string, string> = {
  chaos: '#8b5cf6', psyche: '#06b6d4', spark: '#f59e0b', surge: '#3b82f6', bloom: '#4ade80', void: '#ec4899',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale];
  const categoryLabel = CATEGORY_LABELS.characters?.[locale] ?? 'Characters';
  const desc = CHAR_DESC[gameId]?.[locale];
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/characters`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/characters`;

  return {
    title: `${categoryLabel} - ${gameName}`,
    description: desc ?? `${categoryLabel} - ${gameName} Wiki`,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/characters`, languages },
  };
}

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId === 'genshin') {
    return <GenshinCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  if (gameId === 'starrail') {
    return <StarRailCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  if (gameId === 'nte') {
    return <NteCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  if (gameId === 'zzz') {
    return <ZzzCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  if (gameId === 'ananta') {
    return <AnantaCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    </div>
  );
}

// --- Genshin Characters ---

function GenshinCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.genshin }) {
  const chars = genshinCharacters;
  const fiveStar = chars.filter((c) => c.rarity === 5);
  const fourStar = chars.filter((c) => c.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {fiveStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            5★ ({fiveStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fiveStar.map((char) => (
              <GenshinCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {fourStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            4★ ({fourStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fourStar.map((char) => (
              <GenshinCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GenshinCharacterCard({ char, locale, gameId }: { char: typeof genshinCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = GENSHIN_ELEMENT_COLORS[char.element] || '#888';
  const imageUrl = getGenshinCharacterImage(char);
  const weaponLabel = GENSHIN_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getGenshinCharacterName(char, locale)}
          element={char.element}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.element.charAt(0).toUpperCase() + char.element.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rarity}★
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getGenshinCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{weaponLabel}</p>
      </div>
    </Link>
  );
}

// --- Star Rail Characters ---

function StarRailCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.starrail }) {
  const chars = starrailCharacters;
  const fiveStar = chars.filter((c) => c.rarity === 5);
  const fourStar = chars.filter((c) => c.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {fiveStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            5★ ({fiveStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fiveStar.map((char) => (
              <StarRailCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {fourStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            4★ ({fourStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fourStar.map((char) => (
              <StarRailCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StarRailCharacterCard({ char, locale, gameId }: { char: typeof starrailCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = STARRAIL_ELEMENT_COLORS[char.element] || '#888';
  const imageUrl = getStarRailCharacterImage(char);
  const pathLabel = STARRAIL_PATH_LABELS[char.path]?.[locale] ?? char.path;

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getStarRailCharacterName(char, locale)}
          element={char.element}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.element.charAt(0).toUpperCase() + char.element.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rarity}★
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getStarRailCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{pathLabel}</p>
      </div>
    </Link>
  );
}

// --- NTE Characters ---

function NteCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.nte }) {
  const chars = nteCharacters;
  const sRank = chars.filter((c) => c.rank === 'S');
  const aRank = chars.filter((c) => c.rank === 'A');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {sRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            S {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({sRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sRank.map((char) => (
              <NteCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {aRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            A {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({aRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {aRank.map((char) => (
              <NteCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NteCharacterCard({ char, locale, gameId }: { char: typeof nteCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = NTE_ELEMENT_COLORS[char.attribute] || '#888';
  const imageUrl = getNteCharacterImage(char);

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getNteCharacterName(char, locale)}
          element={char.attribute}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.attribute.charAt(0).toUpperCase() + char.attribute.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rank}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getNteCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{char.roleEn}</p>
      </div>
    </Link>
  );
}

// --- Wuthering Waves Characters ---

const WUWA_ELEMENT_COLORS: Record<string, string> = {
  glacio: '#67e8f9', fusion: '#ef4444', electro: '#8b5cf6',
  aero: '#6ee7b7', spectro: '#fbbf24', havoc: '#a855f7',
};

const WUWA_WEAPON_LABELS: Record<string, Record<string, string>> = {
  broadblade: { zh: ' broadblade', en: 'Broadblade', ja: '大剣' },
  sword: { zh: '长刃', en: 'Sword', ja: '長刃' },
  pistols: { zh: '佩枪', en: 'Pistols', ja: '銃' },
  gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '腕甲' },
  rectifier: { zh: '音感仪', en: 'Rectifier', ja: '感応儀' },
};

function WuWaCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.wuwa }) {
  const chars = wuwaCharacters;
  const fiveStar = chars.filter((c) => c.rarity === 5);
  const fourStar = chars.filter((c) => c.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {fiveStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            5★ ({fiveStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fiveStar.map((char) => (
              <WuWaCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {fourStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            4★ ({fourStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fourStar.map((char) => (
              <WuWaCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function WuWaCharacterCard({ char, locale, gameId }: { char: typeof wuwaCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = WUWA_ELEMENT_COLORS[char.element] || '#888';
  const imageUrl = getWuWaCharacterImage(char);
  const weaponLabel = WUWA_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getWuWaCharacterName(char, locale)}
          element={char.element}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.element.charAt(0).toUpperCase() + char.element.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rarity}★
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getWuWaCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{weaponLabel}</p>
      </div>
    </Link>
  );
}

// --- ZZZ Characters ---

function ZzzCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.zzz }) {
  const chars = zzzCharacters;
  const sRank = chars.filter((c) => c.rank === 'S');
  const aRank = chars.filter((c) => c.rank === 'A');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {sRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            S {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({sRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sRank.map((char) => (
              <ZzzCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {aRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            A {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({aRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {aRank.map((char) => (
              <ZzzCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ZzzCharacterCard({ char, locale, gameId }: { char: typeof zzzCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = ZZZ_ELEMENT_COLORS[char.attribute] || '#888';
  const imageUrl = getZzzCharacterImage(char);
  const specialtyLabel = ZZZ_SPECIALTY_LABELS[char.specialtyEn]?.[locale] ?? char.specialtyEn;

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getZzzCharacterName(char, locale)}
          element={char.attribute}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.attribute.charAt(0).toUpperCase() + char.attribute.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rank}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getZzzCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{specialtyLabel}</p>
      </div>
    </Link>
  );
}

// --- Ananta Characters ---

function AnantaCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.ananta }) {
  const chars = anantaCharacters;
  const ssr = chars.filter((c) => c.rarity === 5);
  const sr = chars.filter((c) => c.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {ssr.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            SSR ({ssr.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {ssr.map((char) => (
              <AnantaCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {sr.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            SR ({sr.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sr.map((char) => (
              <AnantaCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AnantaCharacterCard({ char, locale, gameId }: { char: typeof anantaCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = ANANTA_ELEMENT_COLORS[char.element] || '#888';
  const imageUrl = getAnantaCharacterImage(char);

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getAnantaCharacterName(char, locale)}
          element={char.element}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.element.charAt(0).toUpperCase() + char.element.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rarity === 5 ? 'SSR' : char.rarity === 4 ? 'SR' : `${char.rarity}★`}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getAnantaCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{char.roleEn}</p>
      </div>
    </Link>
  );
}
