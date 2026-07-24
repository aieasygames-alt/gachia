import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { genshinWeapons, getGenshinWeaponName, getGenshinWeaponEffect } from '@gachia/data/games/genshin/weapons';
import { starrailLightCones, getStarRailLightConeName, getStarRailLightConeEffect } from '@gachia/data/games/starrail/weapons';
import { wuwaWeapons, getWuWaWeaponName, getWuWaWeaponEffect } from '@gachia/data/games/wuwa/weapons';
import { nteWeapons, getNteWeaponName, getNteWeaponEffect } from '@gachia/data/games/nte/weapons';
import { zzzWeapons, getZzzWeaponName, getZzzWeaponEffect } from '@gachia/data/games/zzz/weapons';
import { anantaWeapons, getAnantaWeaponName, getAnantaWeaponEffect } from '@gachia/data/games/ananta/weapons';
import { guihuanWeapons, getGuihuanWeaponName, getGuihuanWeaponEffect } from '@gachia/data/games/guihuan/weapons';
import { endfieldWeapons, getEndfieldWeaponName, getEndfieldWeaponEffect } from '@gachia/data/games/endfield/weapons';
import { skjhWeapons, getSkjhWeaponName, getSkjhWeaponEffect, getSkjhWeaponSource } from '@gachia/data/games/skjh/weapons';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

const WEAPON_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全武器图鉴，覆盖五星、四星、三星武器的属性、被动效果、适配角色和获取方式，方便你快速筛选毕业武器。', en: 'Complete Genshin Impact weapon list with stats, passive effects, rarity tiers, recommended users, and acquisition methods for faster build planning.', ja: '原神全武器図鑑。ステータス、武器スキル、適性キャラ、入手方法をまとめて、武器選びをしやすくします。' },
  starrail: { zh: '崩坏：星穹铁道全光锥图鉴，覆盖五星、四星光锥的属性、效果、适配命途和获取方式，方便你迅速判断是否值得培养。', en: 'Complete Honkai: Star Rail light cone list with stats, passive effects, path fit, rarity tiers, and acquisition methods for efficient gear decisions.', ja: 'スターレイル全光円錐図鑑。ステータス、効果、命途相性、入手方法をまとめて確認できます。' },
  wuwa: { zh: '鸣潮全武器图鉴，整理五星、四星武器的属性、被动技能、推荐角色和获取来源，帮助你快速找到最适合的武器。', en: 'Complete Wuthering Waves weapon list with stats, passive abilities, best-fit characters, and acquisition routes for quick gearing decisions.', ja: '鳴潮全武器図鑑。ステータス、パッシブ、適性キャラ、入手先を整理して案内します。' },
  nte: { zh: '异环全弧盘图鉴，覆盖S级、A级弧盘的属性、技能效果、推荐角色和获取来源，适合在配装前先看核心加成。', en: 'Complete Neverness to Everness Arc list with S-Rank and A-Rank data, skill effects, best users, and acquisition info for build planning.', ja: '異環全アルク図鑑。S級・A級データ、効果、適性キャラ、入手先をまとめています。' },
  zzz: { zh: '绝区零全音擎图鉴，覆盖S级、A级音擎的属性、被动效果、适配角色和获取方式，方便你快速查出最值得升阶的装备。', en: 'Complete Zenless Zone Zero W-Engine list with S-Rank and A-Rank data, passive effects, best users, and acquisition routes for upgrade planning.', ja: 'ゼンレスゾーンゼロ全Wエンジン図鑑。S級・A級、効果、適性キャラ、入手先を整理しています。' },
  guihuan: { zh: '归环全武器图鉴，覆盖SSR、SR武器的属性、技能和获取方式，帮助你更快判断武器是否适合当前角色。', en: 'Complete Guihuan weapon list with SSR and SR data, passive effects, and acquisition methods to help you compare weapon choices faster.', ja: '帰環全武器図鑑。SSR・SRのステータス、効果、入手方法をまとめて確認できます。' },
  ananta: { zh: '无限大全武器图鉴，覆盖SSR、SR武器的属性、技能和获取方式，方便你在培养角色前先确定武器优先级。', en: 'Complete Ananta weapon list with SSR and SR data, passive effects, and acquisition methods so you can prioritize the right gear first.', ja: 'アナンタ全武器図鑑。SSR・SRのステータス、効果、入手方法を整理しています。' },
  endfield: { zh: '明日方舟：终末地全武器图鉴，覆盖六星、五星、四星武器的属性、效果和适配方向，适合提前规划配装。', en: 'Complete Arknights: Endfield weapon list with 6-star, 5-star, and 4-star data, passive effects, and best-fit roles for build planning.', ja: 'アークナイツ：エンドフィールド全武器図鑑。6星・5星・4星の性能、効果、適性をまとめています。' },
  skjh: { zh: '失控进化武器与工具图鉴，覆盖石斧、石镐、木矛、猎弓和预约外观，方便你区分开荒工具、战斗武器和外观奖励。', en: 'Ashfall Evolution weapon and tool list with stone tools, spear, bow, and reservation cosmetics, covering early-game tools, combat gear, and rewards.', ja: '失控進化の武器・道具一覧。石斧、石つるはし、槍、弓、予約外観を整理しています。' },
};

const NTE_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  solid: { zh: '固体', en: 'Solid', ja: 'ソリッド' },
  synthesis: { zh: '合成', en: 'Synthesis', ja: 'シンセシス' },
  gas: { zh: '气体', en: 'Gas', ja: 'ガス' },
};

const NTE_RANK_COLORS: Record<string, string> = { S: '#eab308', A: '#a855f7', B: '#60a5fa' };

const GENSHIN_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const GENSHIN_RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };
const SKJH_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  tool: { zh: '采集工具', en: 'Tool', ja: '採集道具' },
  melee: { zh: '近战武器', en: 'Melee', ja: '近接武器' },
  ranged: { zh: '远程武器', en: 'Ranged', ja: '遠距離武器' },
  skin: { zh: '外观奖励', en: 'Cosmetic', ja: '外観報酬' },
};
const SKJH_RARITY_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#4ade80', 3: '#60a5fa', 4: '#f97316' };

const WEAPON_INTRO: Record<string, Record<SupportedLocale, string>> = {
  genshin: {
    zh: '按武器类型、稀有度和适配角色快速浏览原神武器图鉴，适合在配装前先看主词条、特效和毕业选择。',
    en: 'Browse the Genshin Impact weapon wiki by type, rarity, and best users to review main stats, passives, and endgame picks before building.',
    ja: '武器種別、レアリティ、適性キャラで原神武器図鑑を確認し、メインステ、効果、最終候補を把握できます。',
  },
  starrail: {
    zh: '按命途、星级和适配角色快速浏览星穹铁道光锥图鉴，适合在配装前先看效果、替代品和培养价值。',
    en: 'Browse the Honkai: Star Rail light cone wiki by path, rarity, and best users to review effects, alternatives, and upgrade value before building.',
    ja: '運命、レアリティ、適性キャラでスターレイル光円錐図鑑を確認し、効果、代替品、育成価値を把握できます。',
  },
  wuwa: {
    zh: '按武器类型、稀有度和适配角色快速浏览鸣潮武器图鉴，适合先看面板、被动和声骸配装方向。',
    en: 'Browse the Wuthering Waves weapon wiki by weapon type, rarity, and best users to review stats, passives, and echo build direction.',
    ja: '武器種別、レアリティ、適性キャラで鳴潮武器図鑑を確認し、性能、パッシブ、声骸ビルドを把握できます。',
  },
  nte: {
    zh: '按弧盘类型、评级和适配角色快速浏览异环弧盘图鉴，适合先看核心加成、推荐角色和配装取舍。',
    en: 'Browse the Neverness to Everness Arc wiki by type, rank, and best users to review core bonuses, recommended roles, and build tradeoffs.',
    ja: 'タイプ、ランク、適性キャラで異環アルク図鑑を確認し、コア加成、推奨役割、配装判断を把握できます。',
  },
  zzz: {
    zh: '按音擎类型、评级和适配代理人快速浏览绝区零音擎图鉴，适合先看被动、定位和升阶优先级。',
    en: 'Browse the Zenless Zone Zero W-Engine wiki by type, rank, and best agents to review passives, roles, and upgrade priority.',
    ja: 'タイプ、ランク、適性エージェントでゼンゼロW-エンジン図鑑を確認し、効果、役割、昇格優先度を把握できます。',
  },
  ananta: {
    zh: '按武器类型、稀有度和适配角色快速浏览无限大武器图鉴，适合先看定位、面板和培养优先级。',
    en: 'Browse the Ananta weapon wiki by type, rarity, and best users to review role fit, stats, and build priority.',
    ja: '武器種別、レアリティ、適性キャラでアナンタ武器図鑑を確認し、役割、性能、育成優先度を把握できます。',
  },
  guihuan: {
    zh: '按武器类型、稀有度和适配角色快速浏览归环武器图鉴，适合先看效果、职业适配和毕业方向。',
    en: 'Browse the Guihuan weapon wiki by type, rarity, and best users to review effects, class fit, and endgame direction.',
    ja: '武器種別、レアリティ、適性キャラで帰環武器図鑑を確認し、効果、職分適性、最終方向を把握できます。',
  },
  endfield: {
    zh: '按武器类型、星级和适配干员快速浏览终末地武器图鉴，适合先看属性、被动和配装路线。',
    en: 'Browse the Arknights: Endfield weapon wiki by type, rarity, and best operators to review stats, passives, and build routes.',
    ja: '武器種別、レアリティ、適性オペレーターでエンドフィールド武器図鑑を確認し、性能、効果、配装導線を把握できます。',
  },
  skjh: {
    zh: '按工具、近战、远程和外观分类快速浏览失控进化武器图鉴，适合区分开荒工具、战斗装备和预约奖励。',
    en: 'Browse the Ashfall Evolution weapon and tool wiki by category to separate early-game tools, combat gear, and reservation rewards.',
    ja: 'ツール、近接、遠距離、外観で失控進化武器図鑑を確認し、序盤道具、戦闘装備、予約報酬を区別できます。',
  },
};

function getWeaponIntro(gameId: string, locale: SupportedLocale) {
  return WEAPON_INTRO[gameId]?.[locale] ?? WEAPON_INTRO.genshin?.[locale] ?? '';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale];
  const categoryLabel = CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons';
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/weapons`, LOCALES);

  const desc = WEAPON_DESC[gameId]?.[locale] ?? `${gameName} ${categoryLabel} database with stats, effects, recommended users, and acquisition methods`;
  const intro = WEAPON_INTRO[gameId]?.[locale];

  const title = locale === 'zh'
    ? `${gameName}武器图鉴 — 全武器Wiki、数据与技能效果`
    : locale === 'ja'
      ? `${gameName}武器図鑑 — Wiki、ステータス、スキル効果`
      : `${gameName} Weapons Wiki — Complete Stats, Skills & Best Picks`;

  const description = ensureMetaLength(intro ?? desc, locale);

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/weapons`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function WeaponsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];
  const gameName = gameConfig?.name[locale] ?? '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons', item: `${BASE_URL}/${locale}/${gameId}/weapons` },
    ],
  };

  if (gameId === 'genshin') {
    return <><GenshinWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'starrail') {
    return <><StarRailWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'nte') {
    return <><NteWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'wuwa') {
    return <><WuWaWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'zzz') {
    return <><ZzzWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'ananta') {
    return <><AnantaWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'guihuan') {
    return <><GuihuanWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'endfield') {
    return <><EndfieldWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'skjh') {
    return <><SkjhWeaponsPage locale={locale} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'sea') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
        </h1>
        <div className="rounded-lg border border-dashed border-game-border bg-game-surface p-8 text-center text-sm text-game-text-muted">
          {locale === 'zh' ? '该游戏没有武器系统' : locale === 'ja' ? 'このゲームには武器システムがありません' : 'This game does not have a weapon system'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">Coming Soon</div>
      </div>
    </div>
  );
}

// --- Genshin Weapons ---

function GenshinWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = genshinWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.genshin.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('genshin', locale)}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getGenshinWeaponEffect(w, locale);
                const typeLabel = GENSHIN_WEAPON_TYPE_LABELS[w.weaponType]?.[locale] ?? w.weaponType;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: GENSHIN_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getGenshinWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.subStatValue} {w.subStat}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (
                      <p className="mt-2 text-xs text-game-primary">
                        {locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Star Rail Light Cones ---

const STARRAIL_PATH_LABELS: Record<string, Record<string, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' },
  hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' },
  harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' },
  preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' },
  remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
  elation: { zh: '欢愉', en: 'Elation', ja: '愉悦' },
};

function StarRailWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = starrailLightCones;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  const label = locale === 'zh' ? '光锥' : locale === 'ja' ? '光円錐' : 'Light Cones';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.starrail.theme.primary }}>
        {label}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件光锥` : locale === 'ja' ? `${weapons.length} 個の光円錐` : `${weapons.length} Light Cones`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('starrail', locale)}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getStarRailLightConeEffect(w, locale);
                const pathLabel = STARRAIL_PATH_LABELS[w.path]?.[locale] ?? w.path;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: rarity === 5 ? '#eab308' : rarity === 4 ? '#a855f7' : '#60a5fa' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getStarRailLightConeName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{pathLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>HP {w.baseHp}</span>
                      <span>ATK {w.baseAtk}</span>
                      <span>DEF {w.baseDef}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (
                      <p className="mt-2 text-xs text-game-primary">
                        {locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- NTE Weapons ---

function NteWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = nteWeapons;
  const grouped = groupByRank(weapons);
  const ranks = ['S', 'A', 'B'] as const;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.nte.theme.primary }}>
        {locale === 'zh' ? '弧盘' : locale === 'ja' ? 'アルク' : 'Arcs'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件弧盘` : locale === 'ja' ? `${weapons.length} 個のアルク` : `${weapons.length} Arcs`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('nte', locale)}
      </p>

      {ranks.map((rank) => {
        const list = grouped[rank];
        if (!list || list.length === 0) return null;
        return (
          <section key={rank} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{rank}-Rank ({list.length})</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getNteWeaponEffect(w, locale);
                const typeLabel = NTE_WEAPON_TYPE_LABELS[w.type]?.[locale] ?? w.type;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: NTE_RANK_COLORS[w.rank] || '#888' }}>{w.rank}</span>
                      <h3 className="font-semibold text-game-text">{getNteWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substat}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>
                    {w.signatureCharacter && (<p className="mt-2 text-xs text-game-primary">{locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}</p>)}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Wuthering Waves Weapons ---

const WUWA_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  broadblade: { zh: '大刃', en: 'Broadblade', ja: '大剣' },
  sword: { zh: '长刃', en: 'Sword', ja: '長刃' },
  pistols: { zh: '佩枪', en: 'Pistols', ja: '銃' },
  gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '腕甲' },
  rectifier: { zh: '音感仪', en: 'Rectifier', ja: '感応儀' },
};

const WUWA_RARITY_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#4ade80', 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

function WuWaWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = wuwaWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.wuwa.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('wuwa', locale)}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getWuWaWeaponEffect(w, locale);
                const typeLabel = WUWA_WEAPON_TYPE_LABELS[w.weaponType]?.[locale] ?? w.weaponType;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: WUWA_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getWuWaWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      {w.subStat && <span>{w.subStat.value} {w.subStat.name}</span>}
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (
                      <p className="mt-2 text-xs text-game-primary">
                        {locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <NextStepStrip locale={locale} links={WUWA_WEAPON_NEXT_STEPS} />
    </div>
  );
}

function groupByRank<T extends { rank: string }>(arr: T[]): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    (acc[item.rank] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// --- ZZZ W-Engines ---

const ZZZ_RANK_COLORS: Record<string, string> = { S: '#eab308', A: '#a855f7', B: '#60a5fa' };

const ZZZ_SPECIALTY_LABELS: Record<string, Record<string, string>> = {
  Attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  Stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  Anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  Support: { zh: '支援', en: 'Support', ja: '支援' },
  Defense: { zh: '防护', en: 'Defense', ja: '防護' },
  Rupture: { zh: '突击', en: 'Rupture', ja: '突撃' },
};

function ZzzWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = zzzWeapons;
  const grouped = groupByRank(weapons);
  const ranks = ['S', 'A', 'B'] as const;

  const label = locale === 'zh' ? '音擎' : locale === 'ja' ? 'W-エンジン' : 'W-Engines';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.zzz.theme.primary }}>
        {label}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件音擎` : locale === 'ja' ? `${weapons.length} 個のW-エンジン` : `${weapons.length} W-Engines`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('zzz', locale)}
      </p>

      {ranks.map((rank) => {
        const list = grouped[rank];
        if (!list || list.length === 0) return null;
        return (
          <section key={rank} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{rank}-Rank ({list.length})</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getZzzWeaponEffect(w, locale);
                const specialtyLabel = ZZZ_SPECIALTY_LABELS[w.specialtyEn]?.[locale] ?? w.specialtyEn;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: ZZZ_RANK_COLORS[w.rank] || '#888' }}>{w.rank}</span>
                      <h3 className="font-semibold text-game-text">{getZzzWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{specialtyLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substat}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                    {w.signatureCharacter && (<p className="mt-2 text-xs text-game-primary">{locale === 'zh' ? '专属' : 'Signature'}: {w.signatureCharacter}</p>)}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <NextStepStrip locale={locale} links={ZZZ_WEAPON_NEXT_STEPS} />
    </div>
  );
}

// --- Ananta Weapons ---

const ANANTA_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  gauntlet: { zh: '拳套', en: 'Gauntlet', ja: 'ガントレット' },
  hammer: { zh: '重锤', en: 'Hammer', ja: 'ハンマー' },
  'yo-yo': { zh: '溜溜球', en: 'Yo-yo', ja: 'ヨーヨー' },
  blade: { zh: '刃', en: 'Blade', ja: 'ブレード' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '触媒' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  spear: { zh: '长枪', en: 'Spear', ja: '槍' },
};

const ANANTA_RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };

function AnantaWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = anantaWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);
  const threeStar = weapons.filter((w) => w.rarity === 3);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.ananta.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('ananta', locale)}
      </p>

      {[fiveStar, fourStar, threeStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getAnantaWeaponEffect(w, locale);
                const typeLabel = ANANTA_WEAPON_TYPE_LABELS[w.weaponTypeEn]?.[locale] ?? w.weaponTypeEn;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: ANANTA_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getAnantaWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substat}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Guihuan Weapons ---

const GUIHUAN_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  Sword: { zh: '剑', en: 'Sword', ja: '剣' },
  Gauntlet: { zh: '拳套', en: 'Gauntlet', ja: 'ガントレット' },
  Blade: { zh: '刃', en: 'Blade', ja: 'ブレード' },
  Catalyst: { zh: '法器', en: 'Catalyst', ja: '触媒' },
  Instrument: { zh: '乐器', en: 'Instrument', ja: '楽器' },
  Hammer: { zh: '重锤', en: 'Hammer', ja: 'ハンマー' },
  Bow: { zh: '弓', en: 'Bow', ja: '弓' },
  Spear: { zh: '长枪', en: 'Spear', ja: '槍' },
};

function GuihuanWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = guihuanWeapons;
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.guihuan.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('guihuan', locale)}
      </p>

      {[fiveStar, fourStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getGuihuanWeaponEffect(w, locale);
                const typeLabel = GUIHUAN_WEAPON_TYPE_LABELS[w.weaponTypeEn]?.[locale] ?? w.weaponTypeEn;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: rarity === 5 ? '#eab308' : '#a855f7' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getGuihuanWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substatEn}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Endfield Weapons ---

const ENDFIELD_WEAPON_TYPE_LABELS: Record<string, Record<string, string>> = {
  Sword: { zh: '剑', en: 'Sword', ja: '剣' },
  Greatsword: { zh: '大剑', en: 'Greatsword', ja: '大剣' },
  Spear: { zh: '长枪', en: 'Spear', ja: '槍' },
  Shield: { zh: '盾', en: 'Shield', ja: '盾' },
  Staff: { zh: '法杖', en: 'Staff', ja: '杖' },
};

const ENDFIELD_RARITY_COLORS: Record<number, string> = { 4: '#a855f7', 5: '#eab308', 6: '#ef4444' };
type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const WUWA_WEAPON_NEXT_STEPS: NextStepLink[] = [
  {
    href: '/wuwa/version',
    title: { zh: '先看版本专题', en: 'Start with version hub', ja: 'まず版本特集へ' },
    description: { zh: '把当前版本、福利和热词先看一遍', en: 'Review the current version, rewards, and hot topics', ja: '版本、報酬、注目トピックを確認', },
  },
  {
    href: '/wuwa/characters',
    title: { zh: '继续看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
    description: { zh: '按角色反查武器适配和毕业方向', en: 'Check which characters want which weapons', ja: 'キャラ別の適性と完成形を見る', },
  },
  {
    href: '/wuwa/guides/roya-frostlands-guide',
    title: { zh: '看新区域攻略', en: 'Read region guide', ja: '新エリア攻略へ' },
    description: { zh: '把刷图、材料和养成路径接起来', en: 'Connect farming, materials, and progression', ja: '周回、素材、育成導線を接続', },
  },
];

const ZZZ_WEAPON_NEXT_STEPS: NextStepLink[] = [
  {
    href: '/zzz/version',
    title: { zh: '先看 3.0 专题', en: 'Start with v3.0 hub', ja: 'まずv3.0特集へ' },
    description: { zh: '版本重点、卡池和热词都在这里', en: 'Version focus, banners, and hot topics live here', ja: '版本重点、バナー、注目トピックを確認', },
  },
  {
    href: '/zzz/characters',
    title: { zh: '继续看代理人图鉴', en: 'Browse agents', ja: '代理人図鑑へ' },
    description: { zh: '按代理人反查音擎适配和毕业配置', en: 'Match W-Engines to the right agents', ja: '代理人ごとの適性を確認', },
  },
  {
    href: '/zzz/drive-discs',
    title: { zh: '看驱动盘图鉴', en: 'Browse drive discs', ja: 'ドライブディスクへ' },
    description: { zh: '把驱动盘套装和成型思路补齐', en: 'Complete disc sets and build paths', ja: 'セット効果と完成形を整理', },
  },
];

const ENDFIELD_WEAPON_NEXT_STEPS: NextStepLink[] = [
  {
    href: '/endfield/version',
    title: { zh: '先看测试专题', en: 'Start with test hub', ja: 'まずテスト特集へ' },
    description: { zh: '先确认测试节奏、入口和当前节点', en: 'Check the test cadence, entry, and current status', ja: 'テスト時期、入口、進行状況を確認', },
  },
  {
    href: '/endfield/characters',
    title: { zh: '继续看干员图鉴', en: 'Browse characters', ja: '干員図鑑へ' },
    description: { zh: '按干员回看武器适配和队伍分工', en: 'Revisit weapon fit and team roles by operator', ja: '干員ごとの武器適性と役割を確認', },
  },
  {
    href: '/endfield/guides/combat-system-guide',
    title: { zh: '看战斗系统', en: 'Read combat guide', ja: '戦闘ガイドへ' },
    description: { zh: '把武器、职业和战斗逻辑串起来', en: 'Connect weapons, roles, and combat flow', ja: '武器、職分、戦闘理解を接続', },
  },
];

function EndfieldWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = endfieldWeapons;
  const sixStar = weapons.filter((w) => w.rarity === 6);
  const fiveStar = weapons.filter((w) => w.rarity === 5);
  const fourStar = weapons.filter((w) => w.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.endfield.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器` : locale === 'ja' ? `${weapons.length} 個の武器` : `${weapons.length} Weapons`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('endfield', locale)}
      </p>

      {[sixStar, fiveStar, fourStar].map((list) => {
        if (list.length === 0) return null;
        const rarity = list[0]!.rarity;
        return (
          <section key={rarity} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {rarity}★ ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getEndfieldWeaponEffect(w, locale);
                const typeLabel = ENDFIELD_WEAPON_TYPE_LABELS[w.weaponTypeEn]?.[locale] ?? w.weaponTypeEn;
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: ENDFIELD_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getEndfieldWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <div className="mb-2 flex gap-3 text-sm text-game-text-muted">
                      <span>ATK {w.baseAtk}</span>
                      <span>{w.substatValue} {w.substatEn}</span>
                    </div>
                    {effect.description && <p className="text-xs leading-relaxed text-game-text-muted line-clamp-2">{effect.description}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <NextStepStrip locale={locale} links={ENDFIELD_WEAPON_NEXT_STEPS} />
    </div>
  );
}

// --- Ashfall Evolution Weapons ---

function SkjhWeaponsPage({ locale }: { locale: SupportedLocale }) {
  const weapons = skjhWeapons;
  const typeOrder = ['tool', 'melee', 'ranged', 'skin'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.skjh.theme.primary }}>
        {CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${weapons.length} 件武器与工具` : locale === 'ja' ? `${weapons.length} 個の武器・道具` : `${weapons.length} weapons and tools`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro('skjh', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = weapons.filter((w) => w.weaponType === type);
        if (list.length === 0) return null;
        const typeLabel = SKJH_WEAPON_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {typeLabel} ({list.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((w) => {
                const effect = getSkjhWeaponEffect(w, locale);
                return (
                  <div key={w.id} className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-base font-bold" style={{ color: SKJH_RARITY_COLORS[w.rarity] || '#888' }}>{w.rarity}★</span>
                      <h3 className="font-semibold text-game-text">{getSkjhWeaponName(w, locale)}</h3>
                      <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
                    </div>
                    <p className="mb-2 text-xs leading-relaxed text-game-text-muted">{getSkjhWeaponSource(w, locale)}</p>
                    {effect.description && (
                      <div className="rounded bg-game-surface-alt p-3">
                        <div className="mb-1 text-xs font-semibold text-game-primary">{effect.name}</div>
                        <p className="text-xs leading-relaxed text-game-text-muted">{effect.description}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function NextStepStrip({ locale, links }: { locale: SupportedLocale; links?: NextStepLink[] }) {
  if (!links?.length) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '继续往下看' : locale === 'ja' ? '次に見る' : 'Next steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary"
          >
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">
              {link.title[locale]}
            </h3>
            <p className="text-xs text-game-text-muted line-clamp-2">
              {link.description[locale]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
