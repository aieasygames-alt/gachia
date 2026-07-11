import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { genshinCharacters, getGenshinCharacterName, getGenshinCharacterImage } from '@gachia/data/games/genshin/characters';
import { starrailCharacters, getStarRailCharacterName, getStarRailCharacterImage } from '@gachia/data/games/starrail/characters';
import { wuwaCharacters, getWuWaCharacterName, getWuWaCharacterImage } from '@gachia/data/games/wuwa/characters';
import { nteCharacters, getNteCharacterName, getNteCharacterImage } from '@gachia/data/games/nte/characters';
import { zzzCharacters, getZzzCharacterName, getZzzCharacterImage } from '@gachia/data/games/zzz/characters';
import { anantaCharacters, getAnantaCharacterName, getAnantaCharacterImage } from '@gachia/data/games/ananta/characters';
import { guihuanCharacters, getGuihuanCharacterName, getGuihuanCharacterImage } from '@gachia/data/games/guihuan/characters';
import { endfieldCharacters, getEndfieldCharacterName, getEndfieldCharacterImage } from '@gachia/data/games/endfield/characters';
import { seaCharacters, getSeaCharacterName, getSeaCharacterImage } from '@gachia/data/games/sea/characters';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { ensureMetaLength } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const CHARACTER_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  wuwa: [
    {
      href: '/wuwa/version',
      title: { zh: '先看版本专题', en: 'Start with version hub', ja: 'まず版本特集へ' },
      description: { zh: '把当前版本、声骸和入坑节奏串起来', en: 'Connect the current version, echo setup, and onboarding flow', ja: '現在の版本、エコー、入門導線を整理', },
    },
    {
      href: '/wuwa/artifacts',
      title: { zh: '再看声骸图鉴', en: 'Browse echo sets', ja: 'エコー図鑑へ' },
      description: { zh: '先把主流声骸套装和适配角色认全', en: 'Review the main echo sets and their best users', ja: '主要エコーセットと適性キャラを確認', },
    },
    {
      href: '/wuwa/guides/roya-frostlands-guide',
      title: { zh: '继续看新区域', en: 'Read the region guide', ja: '新エリア攻略へ' },
      description: { zh: '把地图、刷图和养成路径接起来', en: 'Link the map, farming, and progression paths', ja: 'マップ、周回、育成導線をつなぐ', },
    },
  ],
  zzz: [
    {
      href: '/zzz/version',
      title: { zh: '先看 3.0 专题', en: 'Start with v3.0 hub', ja: 'まずv3.0特集へ' },
      description: { zh: '把版本重点、卡池和热词先看一遍', en: 'Review the version focus, banners, and hot topics first', ja: '版本重点、バナー、注目トピックを先に確認', },
    },
    {
      href: '/zzz/weapons',
      title: { zh: '再看音擎图鉴', en: 'Browse W-Engines', ja: '音擎図鑑へ' },
      description: { zh: '把角色和武器搭配关系补齐', en: 'Match characters with the right weapons', ja: 'キャラと武器の相性を補完', },
    },
    {
      href: '/zzz/drive-discs',
      title: { zh: '再看驱动盘', en: 'Browse drive discs', ja: 'ドライブディスクへ' },
      description: { zh: '补齐主流驱动盘套装与毕业方向', en: 'Cover the main disc sets and endgame builds', ja: '主要ディスクセットと完成形を確認', },
    },
  ],
  endfield: [
    {
      href: '/endfield/version',
      title: { zh: '先看测试专题', en: 'Start with test hub', ja: 'まずテスト特集へ' },
      description: { zh: '先确认测试节奏、下载入口和当前节点', en: 'Check the test timing, download entry, and current status', ja: 'テスト時期、DL導線、現状を確認', },
    },
    {
      href: '/endfield/guides/combat-system-guide',
      title: { zh: '再看战斗系统', en: 'Read combat guide', ja: '戦闘ガイドへ' },
      description: { zh: '把职业、技能和作战逻辑补起来', en: 'Learn roles, skills, and combat flow', ja: '職分、スキル、戦闘の流れを整理', },
    },
    {
      href: '/endfield/items',
      title: { zh: '再看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '把养成材料、职业和配装承接起来', en: 'Connect materials, roles, and build planning', ja: '素材、職分、ビルドをつなぐ', },
    },
  ],
};

const CHAR_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全角色图鉴，覆盖五星、四星角色的属性、技能、突破材料和培养方向，方便你在抽卡和练角前先看清定位。', en: 'Complete Genshin Impact character roster with stats, skills, ascension materials, roles, and build directions for better team and pull planning.', ja: '原神全キャラクター図鑑。属性、スキル、突破素材、役割、育成方針をまとめて確認できます。' },
  starrail: { zh: '崩坏：星穹铁道全角色图鉴，覆盖属性、命途、技能数据和培养方向，帮助你在配队前快速看懂角色定位。', en: 'Complete Honkai: Star Rail character roster with elements, paths, skills, and build directions so you can understand each unit before investing.', ja: 'スターレイル全キャラ図鑑。属性、運命、スキル、育成方針を整理しています。' },
  wuwa: { zh: '鸣潮全角色图鉴，覆盖属性、武器类型、技能数据和培养方向，适合在组队和资源分配前快速查角色定位。', en: 'Complete Wuthering Waves character roster with elements, weapon types, skills, and build directions to help with team and resource planning.', ja: '鳴潮全キャラ図鑑。属性、武器タイプ、スキル、育成方針をまとめています。' },
  nte: { zh: '异环全角色图鉴，覆盖S级、A级角色的数据、定位和培养方向，方便你在抽卡与配队时快速判断是否值得投入。', en: 'Complete Neverness to Everness character roster with S-Rank and A-Rank data, roles, and build directions for pull and team planning.', ja: '異環全キャラ図鑑。S級・A級のデータ、役割、育成方針を整理しています。' },
  zzz: { zh: '绝区零全代理人图鉴，覆盖属性、专精、技能和培养方向，帮助你快速判断角色在当前版本中的用途。', en: "Complete Zenless Zone Zero agent roster with attributes, specialties, skills, and build directions so you can judge each agent's value quickly.", ja: 'ゼンレスゾーンゼロ全エージェント図鑑。属性、専門、スキル、育成方針を整理しています。' },
  ananta: { zh: '无限大全异能者图鉴，覆盖SSR、SR角色数据、异能和配装推荐，方便你在角色选择前快速掌握强度和定位。', en: 'Complete Ananta Esper roster with SSR and SR data, abilities, and build recommendations to help you compare power and role before investing.', ja: 'アナンタ全エスパー図鑑。SSR・SRのデータ、能力、ビルド案をまとめています。' },
  guihuan: { zh: '归环全使灵图鉴，覆盖SSR、SR角色数据、元素和配装推荐，方便你先看清定位，再决定培养顺序。', en: 'Complete Guihuan Spirit roster with SSR and SR data, elements, and build recommendations so you can prioritize the right spirits first.', ja: '帰環全精霊図鑑。SSR・SRのデータ、元素、ビルド案を整理しています。' },
  endfield: { zh: '明日方舟：终末地全干员图鉴，覆盖六星、五星、四星角色数据、元素属性和配装推荐，适合先看定位再进培养页。', en: 'Complete Arknights: Endfield operator roster with 6-Star, 5-Star, and 4-Star data, elements, and build recommendations for fast team planning.', ja: 'エンドフィールド全オペレーター図鑑。★6、★5、★4のデータ、属性、ビルド案を整理しています。' },
  sea: { zh: '遗忘之海全角色图鉴，覆盖属性、配装推荐和培养方向，帮助你在开荒阶段快速找到更适合自己的角色。', en: 'Complete Sea of Remnants character roster with attributes and build recommendations so you can pick the right characters during early progression.', ja: 'シー・オブ・レムナンツ全キャラ図鑑。属性、ビルド案、育成方針を整理しています。' },
};

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

const ZZZ_SPECIALTY_LABELS: Record<string, Record<string, string>> = {
  Attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  Stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  Anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  Support: { zh: '支援', en: 'Support', ja: '支援' },
  Defense: { zh: '防护', en: 'Defense', ja: '防護' },
  Rupture: { zh: '突击', en: 'Rupture', ja: '突撃' },
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
  elation: { zh: '欢愉', en: 'Elation', ja: '愉悦' },
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

const CHARACTER_INTRO: Record<string, Record<SupportedLocale, string>> = {
  genshin: {
    zh: '按属性、武器、星级快速浏览原神角色图鉴，适合在抽卡前先看定位、培养方向和组队思路。',
    en: 'Browse the Genshin Impact character wiki by element, weapon, and rarity to check roles, build direction, and team fit before pulling.',
    ja: '属性、武器、レアリティで原神キャラ図鑑を素早く確認し、役割・育成方針・編成相性を把握できます。',
  },
  starrail: {
    zh: '按属性、命途、星级快速浏览星穹铁道角色图鉴，适合在配队前先看定位、培养顺序和替代方案。',
    en: 'Browse the Honkai: Star Rail character wiki by element, path, and rarity to review roles, build order, and substitutes before team planning.',
    ja: '属性、運命、レアリティでスターレイルキャラ図鑑を確認し、役割・育成順・代替案を把握できます。',
  },
  wuwa: {
    zh: '按属性、武器类型和星级快速浏览鸣潮角色图鉴，适合先看声骸搭配、队伍定位和养成路线。',
    en: 'Browse the Wuthering Waves character wiki by element, weapon type, and rarity to review echo setup, team roles, and progression routes.',
    ja: '属性、武器タイプ、レアリティで鳴潮キャラ図鑑を確認し、声骸、役割、育成導線を把握できます。',
  },
  nte: {
    zh: '按属性、评级和定位快速浏览异环角色图鉴，适合先看抽卡价值、队伍分工和培养优先级。',
    en: 'Browse the Neverness to Everness character wiki by attribute, rank, and role to review pull value, team duties, and upgrade priority.',
    ja: '属性、ランク、役割で異環キャラ図鑑を確認し、ガチャ価値、編成分担、育成優先度を把握できます。',
  },
  zzz: {
    zh: '按属性、专精和星级快速浏览绝区零代理人图鉴，适合先看版本用途、站场逻辑和配队方向。',
    en: 'Browse the Zenless Zone Zero agent wiki by attribute, specialty, and rarity to review patch value, field time, and team fit.',
    ja: '属性、専門、レアリティでゼンゼロ代理人図鑑を確認し、版本用途、立ち回り、編成相性を把握できます。',
  },
  ananta: {
    zh: '按元素、稀有度和职业快速浏览无限大角色图鉴，适合先看强度、定位和培养优先级。',
    en: 'Browse the Ananta esper wiki by element, rarity, and role to review strength, positioning, and build priority.',
    ja: '属性、レアリティ、役割でアナンタ図鑑を確認し、強さ、役割、育成優先度を把握できます。',
  },
  guihuan: {
    zh: '按元素、星级和定位快速浏览归环使灵图鉴，适合先看配装方向、主力选择和培养顺序。',
    en: 'Browse the Guihuan spirit wiki by element, rarity, and role to review build direction, main picks, and upgrade order.',
    ja: '元素、レアリティ、役割で帰環図鑑を確認し、ビルド方向、主力候補、育成順を把握できます。',
  },
  endfield: {
    zh: '按属性、职业和星级快速浏览终末地干员图鉴，适合先看战斗分工、队伍配置和养成路径。',
    en: 'Browse the Arknights: Endfield operator wiki by element, role, and rarity to review combat duties, squad fit, and progression paths.',
    ja: '属性、職分、レアリティでエンドフィールド干員図鑑を確認し、戦闘分担、編成相性、育成導線を把握できます。',
  },
  sea: {
    zh: '按属性和定位快速浏览遗忘之海角色图鉴，适合先看开荒强度、队伍分工和培养路线。',
    en: 'Browse the Sea of Remnants character wiki by attribute and role to review early-game value, team duties, and progression paths.',
    ja: '属性と役割で遺忘之海キャラ図鑑を確認し、開拓強度、編成分担、育成導線を把握できます。',
  },
};

function getCharacterIntro(gameId: string, locale: SupportedLocale) {
  return CHARACTER_INTRO[gameId]?.[locale] ?? CHARACTER_INTRO.genshin?.[locale] ?? '';
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
  const categoryLabel = CATEGORY_LABELS.characters?.[locale] ?? 'Characters';
  const desc = CHAR_DESC[gameId]?.[locale];
  const intro = CHARACTER_INTRO[gameId]?.[locale];
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/characters`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/characters`;

  const title = locale === 'zh'
    ? `${gameName}角色图鉴 — 全角色Wiki、Build、技能与配队`
    : locale === 'ja'
      ? `${gameName}キャラ図鑑 — Wiki、ビルド、スキル、編成`
      : `${gameName} Characters Wiki — Builds, Skills & Team Planning`;

  const description = ensureMetaLength(
    intro ?? desc ?? `${gameName} ${categoryLabel} roster with stats, skills, roles, and build recommendations`,
    locale,
  );

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/characters`, languages },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/characters`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
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
  const gameName = gameConfig?.name[locale] ?? '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: gameName, item: `${BASE_URL}/${locale}/${gameId}` },
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS.characters?.[locale] ?? 'Characters', item: `${BASE_URL}/${locale}/${gameId}/characters` },
    ],
  };
  const ldScript = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;

  if (gameId === 'genshin') {
    return <><GenshinCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'starrail') {
    return <><StarRailCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'nte') {
    return <><NteCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'wuwa') {
    return <><WuWaCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'zzz') {
    return <><ZzzCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'ananta') {
    return <><AnantaCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'guihuan') {
    return <><GuihuanCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'endfield') {
    return <><EndfieldCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  if (gameId === 'sea') {
    return <><SeaCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getCharacterIntro(gameId, locale)}
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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getCharacterIntro(gameId, locale)}
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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getCharacterIntro(gameId, locale)}
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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getCharacterIntro(gameId, locale)}
      </p>

      <NextStepStrip locale={locale} links={CHARACTER_NEXT_STEPS.wuwa} />

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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getCharacterIntro(gameId, locale)}
      </p>

      <NextStepStrip locale={locale} links={CHARACTER_NEXT_STEPS.zzz} />

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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getCharacterIntro(gameId, locale)}
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

// --- Guihuan Characters ---

const GUIHUAN_ELEMENT_COLORS: Record<string, string> = {
  radiance: '#fbbf24', frost: '#67e8f9', flame: '#ef4444',
  void: '#a855f7', gale: '#6ee7b7', thunder: '#8b5cf6',
};

function GuihuanCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.guihuan }) {
  const chars = guihuanCharacters;
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
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getCharacterIntro(gameId, locale)}
      </p>

      {fiveStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            5★ ({fiveStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fiveStar.map((char) => (
              <GuihuanCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
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
              <GuihuanCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GuihuanCharacterCard({ char, locale, gameId }: { char: typeof guihuanCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = GUIHUAN_ELEMENT_COLORS[char.element] || '#888';
  const imageUrl = getGuihuanCharacterImage(char);

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getGuihuanCharacterName(char, locale)}
          element={char.element}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.elementEn}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rarity}★
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getGuihuanCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{char.roleEn}</p>
      </div>
    </Link>
  );
}

// --- Endfield Characters ---

const ENDFIELD_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', heat: '#ef4444', cryo: '#67e8f9', nature: '#4ade80', electric: '#facc15',
};

const SEA_ELEMENT_COLORS: Record<string, string> = {
  str: '#ef4444',
  agi: '#22c55e',
  con: '#f97316',
  int: '#8b5cf6',
  per: '#3b82f6',
  cha: '#ec4899',
};

function EndfieldCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.endfield }) {
  const chars = endfieldCharacters;
  const sixStar = chars.filter((c) => c.rarity === 6);
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

      <NextStepStrip locale={locale} links={CHARACTER_NEXT_STEPS.endfield} />

      {sixStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            6★ ({sixStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sixStar.map((char) => (
              <EndfieldCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {fiveStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            5★ ({fiveStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fiveStar.map((char) => (
              <EndfieldCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
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
              <EndfieldCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EndfieldCharacterCard({ char, locale, gameId }: { char: typeof endfieldCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = ENDFIELD_ELEMENT_COLORS[char.element] || '#888';
  const imageUrl = getEndfieldCharacterImage(char);

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getEndfieldCharacterName(char, locale)}
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
          {getEndfieldCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{char.professionEn}</p>
      </div>
    </Link>
  );
}

// --- Sea Characters ---

function SeaCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.sea }) {
  const chars = seaCharacters;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {chars.length > 0 && (
        <section className="mb-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {chars.map((char) => (
              <SeaCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SeaCharacterCard({ char, locale, gameId }: { char: typeof seaCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = SEA_ELEMENT_COLORS[char.attribute] || '#888';
  const imageUrl = getSeaCharacterImage(char);

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={imageUrl}
          alt={getSeaCharacterName(char, locale)}
          element={char.attribute}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.attribute.charAt(0).toUpperCase() + char.attribute.slice(1)}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getSeaCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{char.roleEn}</p>
      </div>
    </Link>
  );
}

function NextStepStrip({ locale, links }: { locale: SupportedLocale; links?: NextStepLink[] }) {
  if (!links?.length) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '继续往下看' : locale === 'ja' ? '次に見る' : 'Next steps'}
      </h2>
      <div className="grid gap-3 lg:grid-cols-3">
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
