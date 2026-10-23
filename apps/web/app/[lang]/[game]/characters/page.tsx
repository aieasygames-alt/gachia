import { serializeJsonLd } from '@/lib/jsonld-script';
import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getCharacterListData } from '@/lib/game-data/characters';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import { notFound } from 'next/navigation';
import { ROCO_LIST_REVIEW } from '@/lib/roco-public-review';

const BASE_URL = 'https://gachia.com';

type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const CHARACTER_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  hi3: [
    { href: '/hi3/version', title: { zh: '查看版本档案', en: 'Version archive', ja: 'バージョン資料' }, description: { zh: '关联人偶、武器、圣痕与材料资料', en: 'Connect AstralOps, weapons, stigmata, and materials', ja: '人偶、武器、聖痕、素材資料を確認' } },
    { href: '/hi3/guides', title: { zh: '查看攻略目录', en: 'Guide directory', ja: 'ガイド一覧' }, description: { zh: '选择版本总览、新手回归与资源核对', en: 'Choose the overview, returnee route, or resource checks', ja: '総覧、復帰ルート、資源チェックを選択' } },
  ],
  nte: [
    {
      href: '/nte',
      title: { zh: '异环 Wiki 首页', en: 'NTE wiki hub', ja: 'NTE Wikiホーム' },
      description: { zh: '回到官网、下载、兑换码、版本和攻略入口', en: 'Return to official, download, codes, version, and guide routes', ja: '公式、DL、コード、版本、攻略へ戻る', },
    },
    {
      href: '/nte/tier-list',
      title: { zh: '角色强度排行', en: 'Character tier list', ja: 'キャラTier' },
      description: { zh: '先看 S/A 分级、定位和培养优先级', en: 'Compare S/A ranks, roles, and upgrade priority', ja: 'S/A評価、役割、育成優先度を確認', },
    },
    {
      href: '/nte/guides/shinku-iroi-pull-plan',
      title: { zh: 'Shinku / Iroi 抽卡规划', en: 'Shinku / Iroi pull plan', ja: 'Shinku / Iroi ガチャ計画' },
      description: { zh: '把当前角色热度和资源保底放在一起判断', en: 'Judge current character hype against pity and resources', ja: '現在キャラと保証資源を一緒に判断', },
    },
  ],
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
      href: '/wuwa/guides/v3-7-live-route',
      title: { zh: '查看 3.7 上线后路线', en: 'Read the v3.7 live route', ja: 'Ver.3.7実装後ルートを見る' },
      description: { zh: '把区域解锁、活动、抽取和养成路径接起来', en: 'Connect region unlocks, events, pulling, and progression paths', ja: 'エリア解放、イベント、集音、育成導線をつなぐ', },
    },
  ],
  zzz: [
    {
      href: '/zzz/version',
      title: { zh: '先看 3.3 观察入口', en: 'Start with the v3.3 watch hub', ja: 'v3.3観察入口へ' },
      description: { zh: '先看 3.3 观察、3.2 回顾及官方确认后的卡池信息', en: 'Review the v3.3 watchlist, v3.2 recap, and officially confirmed banner information first', ja: 'v3.3観察、v3.2回顧、公式確認済みバナー情報を確認', },
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
    {
      href: '/zzz/guides/banner-schedule-guide',
      title: { zh: '官方卡池与复刻', en: 'Official banners and reruns', ja: '公式バナーと復刻' },
      description: { zh: '节目后核对官方代理人、阶段时间和菲林预算。', en: 'Verify official agents, phase timing, and Polychrome budget after the program.', ja: '番組後に公式代理人、期間、ポリクローム予算を確認。', },
    },
  ],
  endfield: [
    {
      href: '/endfield/events',
      title: { zh: '先看测试后状态', en: 'Start with post-test status', ja: 'まずテスト後状態へ' },
      description: { zh: '先确认测试后状态、官方观察项和当前节点', en: 'Check post-test status, official watch items, and the current state', ja: 'テスト後状態、公式確認項目、現状を確認', },
    },
    {
      href: '/endfield/guides/combat-system-guide',
      title: { zh: '再看战斗系统', en: 'Read combat guide', ja: '戦闘ガイドへ' },
      description: { zh: '把职业、技能和作战逻辑补起来', en: 'Learn roles, skills, and combat flow', ja: '職分、スキル、戦闘の流れを整理', },
    },
    {
      href: '/endfield/items',
      title: { zh: '再看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '把养成材料、职业和配装放在一起看', en: 'Review materials, roles, and build planning together', ja: '素材、職分、ビルドをつなぐ', },
    },
  ],
};

const CHAR_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全角色图鉴，覆盖五星、四星角色的属性、技能、突破材料和培养方向，方便你在抽卡和练角前先看清定位。', en: 'Complete Genshin Impact character roster with stats, skills, ascension materials, roles, and build directions for better team and pull planning.', ja: '原神全キャラクター図鑑。属性、スキル、突破素材、役割、育成方針をまとめて確認できます。' },
  starrail: { zh: '崩坏：星穹铁道全角色图鉴，覆盖属性、命途、技能数据和培养方向，帮助你在配队前快速看懂角色定位。', en: 'Complete Honkai: Star Rail character roster with elements, paths, skills, and build directions so you can understand each unit before investing.', ja: 'スターレイル全キャラ図鑑。属性、運命、スキル、育成方針を整理しています。' },
  wuwa: { zh: '鸣潮全角色图鉴，覆盖属性、武器类型、技能数据和培养方向，适合在组队和资源分配前快速查角色定位。', en: 'Complete Wuthering Waves character roster with elements, weapon types, skills, and build directions to help with team and resource planning.', ja: '鳴潮全キャラ図鑑。属性、武器タイプ、スキル、育成方針をまとめています。' },
  nte: { zh: '异环全角色图鉴，覆盖S级、A级角色的数据、定位和培养方向，方便你在抽卡与配队时快速判断是否值得投入。', en: 'Complete Neverness to Everness character roster with S-Rank and A-Rank data, roles, and build directions for pull and team planning.', ja: '異環全キャラ図鑑。S級・A級のデータ、役割、育成方針を整理しています。' },
  zzz: { zh: '绝区零角色图鉴 Wiki，覆盖全代理人属性、专精、阵营、技能、音擎、驱动盘、官方卡池信息和配队方向，帮助你判断已有角色的培养与配队优先级。', en: "Zenless Zone Zero characters wiki covering every agent's attribute, specialty, faction, skills, W-Engines, Drive Discs, officially confirmed banners, and team direction.", ja: 'ゼンレスゾーンゼロキャラWiki。全エージェントの属性、専門、陣営、スキル、Wエンジン、ドライブ、公式確認済みバナーを整理。' },
  ananta: { zh: '无限大全异能者图鉴，覆盖SSR、SR角色数据、异能和配装推荐，方便你在角色选择前快速掌握强度和定位。', en: 'Complete Ananta Esper roster with SSR and SR data, abilities, and build recommendations to help you compare power and role before investing.', ja: 'アナンタ全エスパー図鑑。SSR・SRのデータ、能力、ビルド案をまとめています。' },
  guihuan: { zh: '归环全使灵图鉴，覆盖SSR、SR角色数据、元素和配装推荐，方便你先看清定位，再决定培养顺序。', en: 'Complete Guihuan Spirit roster with SSR and SR data, elements, and build recommendations so you can prioritize the right spirits first.', ja: '帰環全精霊図鑑。SSR・SRのデータ、元素、ビルド案を整理しています。' },
  endfield: { zh: '明日方舟：终末地干员图鉴，收录 Pioneer Test 角色、元素属性和配装参考。后续测试与正式版本请以官方公告为准。', en: 'Arknights: Endfield operator roster with Pioneer Test character, element, and build references. Use official announcements for future tests and release data.', ja: 'エンドフィールド干員図鑑。Pioneer Test のキャラ、属性、ビルド参考を収録。今後のテストと正式版は公式発表を基準にしてください。' },
  sea: { zh: '遗忘之海角色图鉴 Wiki，覆盖 Traveler、Ais、Little Axe、Princess、Molly 等角色属性、定位、强度、配队和开荒培养顺序。', en: 'Sea of Remnants characters wiki with Traveler, Ais, Little Axe, Princess, Molly, roles, attributes, tier notes, teams, and early progression picks.', ja: 'シー・オブ・レムナンツキャラWiki。Traveler、Ais、Little Axe、Princess、Molly、役割、属性、Tier、育成順を整理。' },
  'roco-cn': { zh: '《洛克王国：世界》国服精灵图鉴，覆盖 S2 赛季已登场精灵的属性、技能、进化链和培养方向，适合先查图鉴再决定捕捉与培养顺序。', en: 'Roco Kingdom CN character encyclopedia, covering S2 season Jinies\' attributes, skills, evolution chains, and build directions for capture and progression planning.', ja: 'ロコキングダム中国版のジニー図鑑。S2 シーズンのジニー属性、スキル、進化、育成方針を整理。' },
};

const CHARACTER_INTRO: Record<string, Record<SupportedLocale, string>> = {
  hi3: {
    zh: '当前收录浮生·渡尘与瑟莉姆的版本资料，包含女武神与协同人偶的已公开定位。角色技能数值、补给与当前配队请在游戏内核对。',
    en: 'Current coverage records Fenghuang of Vicissitude and Senadina, including published battlesuit and AstralOp roles. Check skill values, supplies, and current teams in-game.',
    ja: '浮生・渡塵とセナディナのバージョン資料を収録し、戦乙女と人偶の公開済み役割を整理。スキル数値、補給、現在の編成はゲーム内で確認してください。',
  },
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
    zh: '按属性、专精、星级和阵营快速浏览绝区零角色图鉴 Wiki，适合先看已有代理人定位、音擎、驱动盘和配队方向；未公告卡池以官方节目后信息为准。',
    en: 'Browse the Zenless Zone Zero characters wiki by attribute, specialty, rarity, and faction to review owned-agent roles, W-Engines, Drive Discs, and team fit; use post-program official information for unannounced banners.',
    ja: '属性、専門、レアリティ、陣営でゼンゼロキャラWikiを確認し、所持代理人の役割、Wエンジン、ドライブ、編成相性を把握できます。未発表バナーは番組後の公式情報を基準にしてください。',
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
    zh: '按属性、职业和星级浏览终末地 Pioneer Test 干员参考，战斗分工、队伍配置和养成内容需在后续测试或正式版以官方信息复核。',
    en: 'Browse Pioneer Test Arknights: Endfield operator references by element, role, and rarity. Recheck combat, squad, and progression data against official future-test or release information.',
    ja: '属性、職分、レアリティでエンドフィールド Pioneer Test の干員参考を確認できます。戦闘、編成、育成情報は今後のテストまたは正式版の公式情報で再確認してください。',
  },
  sea: {
    zh: '按属性、定位和强度快速浏览遗忘之海角色图鉴 Wiki，适合先看开荒强度、队伍分工、节奏榜和培养路线。',
    en: 'Browse the Sea of Remnants characters wiki by attribute, role, and tier value to review early-game picks, team duties, tier list context, and progression paths.',
    ja: '属性、役割、Tier価値でSea of RemnantsキャラWikiを確認し、序盤候補、編成分担、育成導線を把握できます。',
  },
  'roco-cn': {
    zh: '按属性、稀有度浏览《洛克王国：世界》国服精灵图鉴，S2 赛季优先看已登场精灵的捕捉位置、进化链和培养路线。',
    en: 'Browse the Roco Kingdom CN character wiki by element and rarity. Focus on S2 live Jinies\' capture spots, evolution chains, and progression routes.',
    ja: '属性・レアリティでロコキングダム中国版のジニー図鑑を確認。S2 シーズンの登場ジニー、捕獲場所、進化、育成導線を優先。',
  },
};

function getCharacterIntro(gameId: string, locale: SupportedLocale) {
  if (gameId === 'roco') return ROCO_LIST_REVIEW.characters[locale].description;
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
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/characters`, LOCALES);

  const title = gameId === 'roco' ? ROCO_LIST_REVIEW.characters[locale].title : gameId === 'hi3'
    ? { zh: '崩坏3女武神与人偶资料 — 定位与版本档案', en: 'HI3 Battlesuit and AstralOp Entries — Roles and Version Archive', ja: '崩壊3rd 戦乙女・人偶資料 — 役割とバージョン' }[locale]
    : gameId === 'sea'
    ? locale === 'zh'
      ? '遗忘之海角色图鉴 Wiki — 全角色、强度排行与开荒推荐'
      : locale === 'ja'
        ? 'Sea of Remnants キャラWiki — 全キャラ、Tier、育成'
        : 'Sea of Remnants Characters Wiki — All Characters, Tier List & Best Picks'
    : gameId === 'zzz'
      ? locale === 'zh'
        ? '绝区零角色图鉴 Wiki｜全代理人、音擎、驱动盘与配队'
        : locale === 'ja'
          ? 'ゼンゼロキャラWiki｜全代理人、Wエンジン、ドライブ'
          : 'Zenless Zone Zero Characters Wiki — Agents, W-Engines & Drive Discs'
      : locale === 'zh'
        ? `${gameName}角色图鉴 — 全角色Wiki、Build、技能与配队`
        : locale === 'ja'
          ? `${gameName}キャラ図鑑 — Wiki、ビルド、スキル、編成`
          : `${gameName} Characters Wiki — Builds, Skills & Team Planning`;

  const description = gameId === 'roco' ? ROCO_LIST_REVIEW.characters[locale].description : ensureMetaLength(
    intro ?? desc ?? `${gameName} ${categoryLabel} roster with stats, skills, roles, and build recommendations`,
    locale,
  );

  return {
    title,
    description,
    alternates,
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
  const ldScript = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />;
  const chars = await getCharacterListData(gameId, locale);

  if (chars.length > 0) {
    return <><CharacterListPage chars={chars} locale={locale} gameId={gameId} gameConfig={gameConfig} />{ldScript}</>;
  }

  notFound();
}

const ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6', cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
  fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6', wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
  glacio: '#67e8f9', fusion: '#ef4444', aero: '#6ee7b7', spectro: '#fbbf24', havoc: '#a855f7',
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6', incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
  ether: '#ec4899', electric: '#8b5cf6', 'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0',
  spark: '#f59e0b', surge: '#3b82f6', bloom: '#4ade80', void: '#ec4899',
  radiance: '#fbbf24', frost: '#67e8f9', flame: '#ef4444', gale: '#6ee7b7', thunder: '#8b5cf6',
  heat: '#ef4444', nature: '#4ade80',
  str: '#ef4444', agi: '#22c55e', con: '#f97316', int: '#8b5cf6', per: '#3b82f6', cha: '#ec4899',
  grass: '#4ade80', rock: '#f59e0b', holy: '#fbbf24', unknown: '#9ca3af', dark: '#64748b',
};

const ROCO_ELEMENT_COLORS: Record<string, string> = {
  grass: '#4ade80', fire: '#f97316', water: '#38bdf8', electric: '#facc15', normal: '#a3a3a3',
  ice: '#7dd3fc', poison: '#a78bfa', ground: '#d97706', flying: '#93c5fd', bug: '#84cc16',
  light: '#fde047', dark: '#64748b',
};

type CharacterCardEntry = Awaited<ReturnType<typeof getCharacterListData>>[number];

function rankSortValue(rank: string) {
  if (rank === 'SSR' || rank === 'S' || rank === '6★') return 6;
  if (rank === 'SR' || rank === 'A' || rank === '5★') return 5;
  if (rank === '4★') return 4;
  return 0;
}

function getCharacterSections(chars: CharacterCardEntry[]) {
  const groups = new Map<string, CharacterCardEntry[]>();
  for (const char of chars) {
    const key = char.rankGroup;
    groups.set(key, [...(groups.get(key) ?? []), char]);
  }
  return [...groups.entries()]
    .map(([rank, entries]) => ({ rank, entries }))
    .sort((a, b) => rankSortValue(b.rank) - rankSortValue(a.rank));
}

function rankHeading(rank: string, count: number, locale: SupportedLocale) {
  if (rank === 'all') return null;
  if (rank === 'S' || rank === 'A') {
    return `${rank} ${locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} (${count})`;
  }
  return `${rank} (${count})`;
}

function SearchIntentLinks({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  const zzzLinks = CHARACTER_NEXT_STEPS.zzz ?? [];
  const seaLinks: NextStepLink[] = [
    {
      href: '/sea',
      title: { zh: '遗忘之海 Wiki 首页', en: 'Sea of Remnants Wiki', ja: 'Sea of Remnants Wiki' },
      description: { zh: '先回到总览，看下载、攻略、福利和版本入口。', en: 'Start from the wiki hub for download, guides, rewards, and version routes.', ja: 'DL、攻略、報酬、版本入口をまとめて確認。' },
    },
    {
      href: '/sea/tier-list',
      title: { zh: '角色强度排行', en: 'Character Tier List', ja: 'キャラTierリスト' },
      description: { zh: '对比 SS/S/A/B 分级，决定先养谁。', en: 'Compare SS/S/A/B rankings before investing materials.', ja: 'SS/S/A/B評価で育成優先度を確認。' },
    },
    {
      href: '/sea/guides/molly-starter-team-guide',
      title: { zh: '茉莉开荒队伍', en: 'Molly Starter Team', ja: 'Molly序盤編成' },
      description: { zh: '用治疗和主攻路线快速搭开荒队。', en: 'Build an early team around healing, DPS, and safe progression.', ja: '回復と火力軸で序盤編成を組む。' },
    },
  ];
  const nteLinks = CHARACTER_NEXT_STEPS.nte ?? [];
  const links = gameId === 'nte' ? nteLinks : gameId === 'zzz' ? zzzLinks : seaLinks;

  return (
    <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-4">
      <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
        {gameId === 'nte'
          ? locale === 'zh'
            ? '如果你搜索的是“异环角色图鉴 / 异环 wiki / 异环角色”，先从 Nanally、Sakiri、Fadia、Chiz、Aurelia 这些高频角色看起，再进入强度排行、兑换码和抽卡规划。'
            : locale === 'ja'
              ? 'NTE characters / wiki 検索なら、Nanally、Sakiri、Fadia、Chiz、Aureliaから確認し、Tierとガチャ計画へ進みます。'
              : 'If you searched for NTE characters or wiki, start with Nanally, Sakiri, Fadia, Chiz, and Aurelia, then move into the tier list and pull plan.'
          : gameId === 'zzz'
            ? locale === 'zh'
              ? '如果你搜索的是“绝区零角色 / 绝区零角色图鉴 / 绝区零 wiki”，先从已有代理人的阵营、属性和专精确认定位，再进入音擎、驱动盘、官方卡池和配队页面。'
              : locale === 'ja'
                ? 'ゼンゼロキャラ / Wiki 検索なら、現在版本の代理人、陣営、属性、専門を確認し、Wエンジン、ドライブ、バナー、編成へ進みます。'
                : 'If you searched for ZZZ characters or Zenless Zone Zero wiki, start with live-patch agents, factions, attributes, and specialties, then continue into W-Engines, Drive Discs, banners, and teams.'
          : locale === 'zh'
            ? '如果你搜索的是“遗忘之海 wiki / Sea of Remnants characters”，先从 Traveler、Ais、Little Axe、Princess、Molly 这些高频角色看起，再进入节奏榜和开荒队伍。'
            : locale === 'ja'
              ? 'Sea of Remnants characters / wiki 検索なら、Traveler、Ais、Little Axe、Princess、Molly から確認し、Tierと序盤編成へ進みます。'
              : 'If you searched for Sea of Remnants characters or wiki, start with Traveler, Ais, Little Axe, Princess, and Molly, then move into the tier list and starter-team guide.'}
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href as '/'} className="rounded-md border border-game-border bg-game-surface-alt p-3 transition-colors hover:border-game-primary">
            <span className="mb-1 block text-sm font-semibold text-game-text">{link.title[locale]}</span>
            <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description[locale]}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CharacterListPage({ chars, locale, gameId, gameConfig }: { chars: CharacterCardEntry[]; locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES[GameId] }) {
  const sections = getCharacterSections(chars);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {gameId === 'roco' ? ROCO_LIST_REVIEW.characters[locale].title : gameId === 'sea' || gameId === 'nte' || gameId === 'zzz'
          ? gameId === 'nte'
            ? locale === 'zh' ? '异环角色图鉴 Wiki' : locale === 'ja' ? 'NTE キャラWiki' : 'NTE Characters Wiki'
            : gameId === 'zzz'
              ? locale === 'zh' ? '绝区零角色图鉴 Wiki' : locale === 'ja' ? 'ゼンゼロキャラWiki' : 'Zenless Zone Zero Characters Wiki'
              : locale === 'zh' ? '遗忘之海角色图鉴 Wiki' : locale === 'ja' ? 'Sea of Remnants キャラWiki' : 'Sea of Remnants Characters Wiki'
          : CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {gameId === 'roco' ? { zh: `${chars.length} 条历史导航记录`, en: `${chars.length} legacy navigation records`, ja: `${chars.length} 件の過去のナビゲーション記録` }[locale] : gameId === 'sea' || gameId === 'nte' || gameId === 'zzz'
          ? gameId === 'nte'
            ? locale === 'zh'
              ? `共 ${chars.length} 名异环角色，覆盖属性、定位、强度排行、抽卡价值和培养优先级。`
              : locale === 'ja'
                ? `${chars.length} 名のNTEキャラクター。属性、役割、Tier、ガチャ価値、育成順を整理。`
                : `${chars.length} NTE characters with attributes, roles, tier context, pull value, and progression notes.`
            : gameId === 'zzz'
              ? locale === 'zh'
                ? `共 ${chars.length} 名绝区零代理人，覆盖属性、专精、阵营、音擎、驱动盘、当前版本用途和配队方向。`
                : locale === 'ja'
                  ? `${chars.length} 名のゼンゼロ代理人。属性、専門、陣営、Wエンジン、ドライブ、版本価値を整理。`
                  : `${chars.length} ZZZ agents with attributes, specialties, factions, W-Engines, Drive Discs, patch value, and team notes.`
            : locale === 'zh'
              ? `共 ${chars.length} 名角色，覆盖属性、定位、强度排行和开荒培养顺序。`
              : locale === 'ja'
                ? `${chars.length} 名のキャラクター。属性、役割、Tier、育成順を整理。`
                : `${chars.length} characters with attributes, roles, tier context, and early progression notes.`
          : locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>
      {gameId !== 'sea' && gameId !== 'nte' && gameId !== 'zzz' && (
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
          {getCharacterIntro(gameId, locale)}
        </p>
      )}

      {gameId === 'sea' || gameId === 'nte' || gameId === 'zzz' ? <SearchIntentLinks locale={locale} gameId={gameId} /> : <><CoverageNote locale={locale} gameId={gameId} /><NextStepStrip locale={locale} links={CHARACTER_NEXT_STEPS[gameId]} /></>}

      {sections.map(({ rank, entries }) => {
        const heading = rankHeading(rank, entries.length, locale);
        return (
          <section key={rank} className="mb-8">
            {heading && <h2 className="mb-4 text-lg font-semibold text-game-text">{heading}</h2>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {entries.map((char) => (
                <CharacterCard key={char.id} char={char} gameId={gameId} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CoverageNote({ locale, gameId }: { locale: SupportedLocale; gameId: GameId }) {
  if (gameId === 'roco') return <aside data-roco-list-review="characters" className="mb-6 rounded-md border border-game-border bg-game-surface px-4 py-3 text-sm leading-relaxed text-game-text-muted">{ROCO_LIST_REVIEW.characters[locale].notice}</aside>;
  const copy = gameId === 'wuwa'
    ? {
        zh: '鸣潮角色页优先展示已有完整属性、武器、等级属性、材料与已核验强度信息。3.7 的心/锁暝已在版本路线与活动看板中标注上线信息；完整技能、材料、数值和配队资料仅在结构化数据核验后加入图鉴与计算器。',
        en: 'WuWa pages prioritize characters with complete verified attributes, weapons, stats, materials, and tier context. Hsin and Suoming are covered as live v3.7 content in the version route and event board; full skills, materials, values, and teams enter the index and calculator only after structured-data verification.',
        ja: '鳴潮キャラページは、属性、武器、ステータス、素材、検証済みTierが揃ったキャラを優先掲載します。心/鎖暝はVer.3.7実装情報としてバージョンルートとイベントボードで案内し、スキル、素材、数値、編成は構造化データの確認後に図鑑と計算機へ追加します。',
      }
    : gameId === 'endfield'
      ? {
          zh: '终末地角色、技能、材料、武器与配队内容均为 Pioneer Test 资料参考，并非正式版定案；后续测试、数值、获取方式与版本节奏仅以官方公告复核。',
          en: 'Endfield character, skill, material, weapon, and team content is Pioneer Test reference material, not final release data. Verify future tests, values, availability, and timing through official announcements only.',
          ja: 'エンドフィールドのキャラ、スキル、素材、武器、編成は Pioneer Test の参考資料であり、正式版の確定情報ではありません。今後のテスト、数値、入手方法、時期は公式発表のみで確認してください。',
        }
      : {
        zh: '角色定位、技能、配装、配队和培养建议按版本持续复核；抽卡前请结合当前版本和自己的队伍缺口判断。',
        en: 'Roles, skills, builds, teams, and investment advice are reviewed by patch. Check the current version and your roster gaps before pulling.',
        ja: '役割、スキル、ビルド、編成、育成情報はバージョンごとに確認。引く前に現在版本と手持ちの不足を確認してください。',
      };
  return <div className="mb-6 rounded-md border border-game-border bg-game-surface px-4 py-3 text-xs leading-relaxed text-game-text-muted"><strong className="mr-1 text-game-text">{locale === 'zh' ? '内容覆盖说明' : locale === 'ja' ? 'データ範囲' : 'Coverage note'}:</strong>{copy[locale]}</div>;
}

function CharacterCard({ char, gameId }: { char: CharacterCardEntry; gameId: GameId }) {
  const colorMap = gameId === 'roco' || gameId === 'roco-cn' ? ROCO_ELEMENT_COLORS : ELEMENT_COLORS;
  const elementColor = colorMap[char.element] || '#888';

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        <CharacterAvatar
          src={char.image}
          alt={char.name}
          element={char.element}
          className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.elementLabel}
        </span>
        {char.rarityLabel && (
          <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
            {char.rarityLabel}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="truncate text-sm font-semibold text-game-text group-hover:text-game-primary">
          {char.name}
        </h3>
        <p className="truncate text-xs text-game-text-muted">{char.subtitle}</p>
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
