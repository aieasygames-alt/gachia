import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getWeaponListData, sortWeaponRanks } from '@/lib/game-data/weapons';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const BASE_URL = 'https://gachia.com';
const ZzzQueuedWeapons = dynamic(() => import('./zzz-queued-weapons').then((mod) => mod.ZzzQueuedWeapons));

const WEAPON_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全武器图鉴，覆盖五星、四星、三星武器的属性、被动效果、适配角色和获取方式，方便你快速筛选毕业武器。', en: 'Complete Genshin Impact weapon list with stats, passive effects, rarity tiers, recommended users, and acquisition methods for faster build planning.', ja: '原神全武器図鑑。ステータス、武器スキル、適性キャラ、入手方法をまとめて、武器選びをしやすくします。' },
  starrail: { zh: '崩坏：星穹铁道全光锥图鉴，覆盖五星、四星光锥的属性、效果、适配命途和获取方式，方便你迅速判断是否值得培养。', en: 'Complete Honkai: Star Rail light cone list with stats, passive effects, path fit, rarity tiers, and acquisition methods for efficient gear decisions.', ja: 'スターレイル全光円錐図鑑。ステータス、効果、命途相性、入手方法をまとめて確認できます。' },
  wuwa: { zh: '鸣潮全武器图鉴，整理五星、四星武器的属性、被动技能、推荐角色和获取来源，帮助你快速找到最适合的武器。', en: 'Complete Wuthering Waves weapon list with stats, passive abilities, best-fit characters, and acquisition routes for quick gearing decisions.', ja: '鳴潮全武器図鑑。ステータス、パッシブ、適性キャラ、入手先を整理して案内します。' },
  nte: { zh: '异环全弧盘图鉴，覆盖S级、A级弧盘的属性、技能效果、推荐角色和获取来源，适合在配装前先看核心加成。', en: 'Complete Neverness to Everness Arc list with S-Rank and A-Rank data, skill effects, best users, and acquisition info for build planning.', ja: '異環全アルク図鑑。S級・A級データ、効果、適性キャラ、入手先をまとめています。' },
  zzz: { zh: '绝区零全音擎图鉴，覆盖S级、A级音擎的属性、被动效果、适配角色和获取方式，方便你快速查出最值得升阶的装备。', en: 'Complete Zenless Zone Zero W-Engine list with S-Rank and A-Rank data, passive effects, best users, and acquisition routes for upgrade planning.', ja: 'ゼンレスゾーンゼロ全Wエンジン図鑑。S級・A級、効果、適性キャラ、入手先を整理しています。' },
  guihuan: { zh: '归环全武器图鉴，覆盖SSR、SR武器的属性、技能和获取方式，帮助你更快判断武器是否适合当前角色。', en: 'Complete Guihuan weapon list with SSR and SR data, passive effects, and acquisition methods to help you compare weapon choices faster.', ja: '帰環全武器図鑑。SSR・SRのステータス、効果、入手方法をまとめて確認できます。' },
  ananta: { zh: '无限大全武器图鉴，覆盖SSR、SR武器的属性、技能和获取方式，方便你在培养角色前先确定武器优先级。', en: 'Complete Ananta weapon list with SSR and SR data, passive effects, and acquisition methods so you can prioritize the right gear first.', ja: 'アナンタ全武器図鑑。SSR・SRのステータス、効果、入手方法を整理しています。' },
  endfield: { zh: '明日方舟：终末地武器图鉴，收录 Pioneer Test 武器属性、效果和适配参考。后续测试与正式版请以官方公告为准。', en: 'Arknights: Endfield weapon roster with Pioneer Test stats, effects, and fit references. Use official announcements for future tests and release data.', ja: 'アークナイツ：エンドフィールド武器図鑑。Pioneer Test の性能、効果、適性参考を収録。今後のテストと正式版は公式発表を基準にしてください。' },
  skjh: { zh: '失控进化武器与工具图鉴，覆盖石斧、石镐、木矛、猎弓和预约外观，方便你区分开荒工具、战斗武器和外观奖励。', en: 'Ashfall Evolution weapon and tool list with stone tools, spear, bow, and reservation cosmetics, covering early-game tools, combat gear, and rewards.', ja: '失控進化の武器・道具一覧。石斧、石つるはし、槍、弓、予約外観を整理しています。' },
  'roco-cn': { zh: '洛克王国：世界国服魔法杖图鉴，覆盖 S1/S2/S3 赛季战令限定与活动赠送的法杖，整理每把法杖的施法特效、变身表现与获取方式，方便你规划外观收集。', en: 'Roco Kingdom: World CN magic staff list covering S1/S2/S3 battle-pass and event staves, with casting effects, transformation looks, and how to obtain them for collection planning.', ja: 'ロコ・キングダム：ワールド中国版の魔法杖図鑑。S1/S2/S3バトルパスとイベントの杖を網羅し、演出・変身見た目・入手方法を整理。' },
  'roco': { zh: '洛克王国：世界国际服魔法杖图鉴，覆盖赛季战令限定与活动赠送的法杖，整理每把法杖的施法特效、变身表现与获取方式，方便你规划外观收集。', en: 'Roco Kingdom: World global magic staff list covering battle-pass and event staves, with casting effects, transformation looks, and how to obtain them for collection planning.', ja: 'ロコ・キングダム：ワールド国際版の魔法杖図鑑。バトルパスとイベントの杖を網羅し、演出・変身見た目・入手方法を整理。' },
};

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
    zh: '按类型、星级和适配干员浏览终末地 Pioneer Test 武器参考；属性、被动和配装路线需在后续测试或正式版以官方信息复核。',
    en: 'Browse Pioneer Test Arknights: Endfield weapon references by type, rarity, and fit. Recheck stats, passives, and build routes against official future-test or release information.',
    ja: 'タイプ、レアリティ、適性干員でエンドフィールド Pioneer Test の武器参考を確認できます。性能、効果、ビルドは今後のテストまたは正式版の公式情報で再確認してください。',
  },
  skjh: {
    zh: '按工具、近战、远程和外观分类快速浏览失控进化武器图鉴，适合区分开荒工具、战斗装备和预约奖励。',
    en: 'Browse the Ashfall Evolution weapon and tool wiki by category to separate early-game tools, combat gear, and reservation rewards.',
    ja: 'ツール、近接、遠距離、外観で失控進化武器図鑑を確認し、序盤道具、戦闘装備、予約報酬を区別できます。',
  },
  'roco-cn': {
    zh: '按稀有度和获取方式快速浏览洛克王国：世界国服法杖图鉴，适合先看每把法杖的施法特效与变身表现，再决定外观收集优先级。',
    en: 'Browse the Roco Kingdom: World CN staff wiki by rarity and source to review each staff’s casting effect and transformation look before prioritizing your collection.',
    ja: 'ロコ・キングダム：ワールド中国版の杖図鑑をレアリティ・入手先で確認し、演出と変身見た目を把握してから収集優先度を決められます。',
  },
  'roco': {
    zh: '按稀有度和获取方式快速浏览洛克王国：世界国际服法杖图鉴，适合先看每把法杖的施法特效与变身表现，再决定外观收集优先级。',
    en: 'Browse the Roco Kingdom: World global staff wiki by rarity and source to review each staff’s casting effect and transformation look before prioritizing your collection.',
    ja: 'ロコ・キングダム：ワールド国際版の杖図鑑をレアリティ・入手先で確認し、演出と変身見た目を把握してから収集優先度を決められます。',
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

  const desc = WEAPON_DESC[gameId]?.[locale] ?? `${gameName} ${categoryLabel} database with cosmetic effects, visual transformations, and acquisition methods`;
  const intro = WEAPON_INTRO[gameId]?.[locale];

  const title = locale === 'zh'
    ? `${gameName}武器图鉴 — 外观法杖Wiki、特效与获取方式`
    : locale === 'ja'
      ? `${gameName}武器図鑑 — 杖Wiki、演出効果、入手方法`
      : `${gameName} Weapons Wiki — Cosmetic Staffs, Effects & Sources`;

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
  const ldScript = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;

  if (gameId === 'sea') notFound();

  const weapons = await getWeaponListData(gameId, locale);
  if (weapons.length > 0) return <><WeaponListPage gameId={gameId} locale={locale} weapons={weapons} />{ldScript}</>;

  notFound();
}

type WeaponCardEntry = Awaited<ReturnType<typeof getWeaponListData>>[number];
type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const WEAPON_RANK_COLORS: Record<string, string> = {
  S: '#eab308', A: '#a855f7', B: '#60a5fa',
  '6★': '#ef4444', '5★': '#eab308', '4★': '#a855f7', '3★': '#60a5fa', '2★': '#4ade80', '1★': '#9ca3af',
};

const TYPE_LABELS: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
  broadblade: { zh: '大刃', en: 'Broadblade', ja: '大剣' },
  pistols: { zh: '佩枪', en: 'Pistols', ja: '銃' },
  gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '腕甲' },
  rectifier: { zh: '音感仪', en: 'Rectifier', ja: '感応儀' },
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' },
  hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' },
  harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' },
  preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' },
  remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
  elation: { zh: '欢愉', en: 'Elation', ja: '愉悦' },
  solid: { zh: '固体', en: 'Solid', ja: 'ソリッド' },
  synthesis: { zh: '合成', en: 'Synthesis', ja: 'シンセシス' },
  gas: { zh: '气体', en: 'Gas', ja: 'ガス' },
  Attack: { zh: '强攻', en: 'Attack', ja: '強攻' },
  Stun: { zh: '击破', en: 'Stun', ja: '撃破' },
  Anomaly: { zh: '异常', en: 'Anomaly', ja: '異常' },
  Support: { zh: '支援', en: 'Support', ja: '支援' },
  Defense: { zh: '防护', en: 'Defense', ja: '防護' },
  Rupture: { zh: '突击', en: 'Rupture', ja: '突撃' },
  gauntlet: { zh: '拳套', en: 'Gauntlet', ja: 'ガントレット' },
  Gauntlet: { zh: '拳套', en: 'Gauntlet', ja: 'ガントレット' },
  hammer: { zh: '重锤', en: 'Hammer', ja: 'ハンマー' },
  Hammer: { zh: '重锤', en: 'Hammer', ja: 'ハンマー' },
  'yo-yo': { zh: '溜溜球', en: 'Yo-yo', ja: 'ヨーヨー' },
  blade: { zh: '刃', en: 'Blade', ja: 'ブレード' },
  Blade: { zh: '刃', en: 'Blade', ja: 'ブレード' },
  Instrument: { zh: '乐器', en: 'Instrument', ja: '楽器' },
  Spear: { zh: '长枪', en: 'Spear', ja: '槍' },
  Greatsword: { zh: '大剑', en: 'Greatsword', ja: '大剣' },
  Shield: { zh: '盾', en: 'Shield', ja: '盾' },
  Staff: { zh: '法杖', en: 'Staff', ja: '杖' },
  tool: { zh: '采集工具', en: 'Tool', ja: '採集道具' },
  melee: { zh: '近战武器', en: 'Melee', ja: '近接武器' },
  ranged: { zh: '远程武器', en: 'Ranged', ja: '遠距離武器' },
  skin: { zh: '外观奖励', en: 'Cosmetic', ja: '外観報酬' },
};

const WUWA_WEAPON_NEXT_STEPS: NextStepLink[] = [
  { href: '/wuwa/version', title: { zh: '先看版本专题', en: 'Start with version hub', ja: 'まず版本特集へ' }, description: { zh: '把当前版本、福利和热词先看一遍', en: 'Review the current version, rewards, and hot topics', ja: '版本、報酬、注目トピックを確認' } },
  { href: '/wuwa/characters', title: { zh: '继续看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' }, description: { zh: '按角色反查武器适配和毕业方向', en: 'Check which characters want which weapons', ja: 'キャラ別の適性と完成形を見る' } },
  { href: '/wuwa/guides/v3-7-live-route', title: { zh: '看 3.7 上线后路线', en: 'Read the v3.7 live route', ja: 'Ver.3.7実装後ルートへ' }, description: { zh: '把梦枢天罗、材料与养成路径接起来', en: 'Connect the Simulacrum Nexus, materials, and progression', ja: '夢枢天羅、素材、育成導線を接続' } },
];

const ZZZ_WEAPON_NEXT_STEPS: NextStepLink[] = [
  { href: '/zzz/version', title: { zh: '先看 3.3 观察入口', en: 'Start with the v3.3 watch hub', ja: 'v3.3観察入口へ' }, description: { zh: '3.3 观察、3.2 回顾、卡池和热词都在这里', en: 'v3.3 watch items, v3.2 recap, banners, and hot topics live here', ja: 'v3.3観察、v3.2回顧、バナー、注目トピックを確認' } },
  { href: '/zzz/characters', title: { zh: '继续看代理人图鉴', en: 'Browse agents', ja: '代理人図鑑へ' }, description: { zh: '按代理人反查音擎适配和毕业配置', en: 'Match W-Engines to the right agents', ja: '代理人ごとの適性を確認' } },
  { href: '/zzz/drive-discs', title: { zh: '看驱动盘图鉴', en: 'Browse drive discs', ja: 'ドライブディスクへ' }, description: { zh: '把驱动盘套装和成型思路补齐', en: 'Complete disc sets and build paths', ja: 'セット効果と完成形を整理' } },
];

const ENDFIELD_WEAPON_NEXT_STEPS: NextStepLink[] = [
  { href: '/endfield/events', title: { zh: '先看测试后状态', en: 'Start with post-test status', ja: 'まずテスト後状態へ' }, description: { zh: '先确认测试后行动、官方观察项和当前节点', en: 'Check post-test actions, official watch items, and the current state', ja: 'テスト後の行動、公式確認項目、現状を確認' } },
  { href: '/endfield/characters', title: { zh: '继续看干员图鉴', en: 'Browse characters', ja: '干員図鑑へ' }, description: { zh: '按干员回看武器适配和队伍分工', en: 'Revisit weapon fit and team roles by operator', ja: '干員ごとの武器適性と役割を確認' } },
  { href: '/endfield/guides/combat-system-guide', title: { zh: '看战斗系统', en: 'Read combat guide', ja: '戦闘ガイドへ' }, description: { zh: '把武器、职业和战斗逻辑串起来', en: 'Connect weapons, roles, and combat flow', ja: '武器、職分、戦闘理解を接続' } },
];

function weaponDisplayName(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'starrail') return locale === 'zh' ? '光锥' : locale === 'ja' ? '光円錐' : 'Light Cones';
  if (gameId === 'nte') return locale === 'zh' ? '弧盘' : locale === 'ja' ? 'アルク' : 'Arcs';
  if (gameId === 'zzz') return locale === 'zh' ? '音擎' : locale === 'ja' ? 'W-エンジン' : 'W-Engines';
  if (gameId === 'roco-cn' || gameId === 'roco') return locale === 'zh' ? '法杖' : locale === 'ja' ? '杖' : 'Staves';
  return CATEGORY_LABELS.weapons?.[locale] ?? 'Weapons';
}

function weaponCountLabel(gameId: GameId, count: number, locale: SupportedLocale) {
  if (gameId === 'starrail') return locale === 'zh' ? `共 ${count} 件光锥` : locale === 'ja' ? `${count} 個の光円錐` : `${count} Light Cones`;
  if (gameId === 'nte') return locale === 'zh' ? `共 ${count} 件弧盘` : locale === 'ja' ? `${count} 個のアルク` : `${count} Arcs`;
  if (gameId === 'zzz') return locale === 'zh' ? `共 ${count} 件音擎` : locale === 'ja' ? `${count} 個のW-エンジン` : `${count} W-Engines`;
  if (gameId === 'skjh') return locale === 'zh' ? `共 ${count} 件武器与工具` : locale === 'ja' ? `${count} 個の武器・道具` : `${count} weapons and tools`;
  if (gameId === 'roco-cn' || gameId === 'roco') return locale === 'zh' ? `共 ${count} 把法杖` : locale === 'ja' ? `${count} 本の杖` : `${count} Staves`;
  return locale === 'zh' ? `共 ${count} 件武器` : locale === 'ja' ? `${count} 個の武器` : `${count} Weapons`;
}

function localTypeLabel(type: string, locale: SupportedLocale) {
  return TYPE_LABELS[type]?.[locale] ?? type;
}

function getWeaponSections(gameId: GameId, weapons: WeaponCardEntry[]) {
  const groups = new Map<string, WeaponCardEntry[]>();
  for (const weapon of weapons) {
    const key = gameId === 'skjh' ? weapon.typeGroup : weapon.rankGroup;
    groups.set(key, [...(groups.get(key) ?? []), weapon]);
  }
  return [...groups.entries()]
    .map(([key, entries]) => ({ key, entries }))
    .sort((a, b) => gameId === 'skjh' ? 0 : sortWeaponRanks(a.key, b.key));
}

const ROCO_CN_WEAPON_NEXT_STEPS: NextStepLink[] = [
  { href: '/roco-cn/characters', title: { zh: '看精灵图鉴', en: 'Browse sprites', ja: 'スプライト図鑑へ' }, description: { zh: '先看精灵属性、技能与种族值', en: 'Review sprite stats, skills, and base stats', ja: 'スプライトの属性・スキル・種族値を見る' } },
  { href: '/roco-cn/tier-list', title: { zh: '看节奏榜', en: 'Open tier list', ja: 'Tierリストへ' }, description: { zh: '按强度优先级决定先养谁', en: 'Pick which sprites to build first by tier', ja: 'Tierで育成優先度を決める' } },
  { href: '/roco-cn/guides', title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' }, description: { zh: '继续看版本与养成攻略', en: 'Continue with version and build guides', ja: '版本・育成ガイドへ進む' } },
];

const ROCO_WEAPON_NEXT_STEPS: NextStepLink[] = [
  { href: '/roco/characters', title: { zh: '看精灵图鉴', en: 'Browse sprites', ja: 'スプライト図鑑へ' }, description: { zh: '先看精灵属性、技能与种族值', en: 'Review sprite stats, skills, and base stats', ja: 'スプライトの属性・スキル・種族値を見る' } },
  { href: '/roco/tier-list', title: { zh: '看节奏榜', en: 'Open tier list', ja: 'Tierリストへ' }, description: { zh: '按强度优先级决定先养谁', en: 'Pick which sprites to build first by tier', ja: 'Tierで育成優先度を決める' } },
  { href: '/roco/guides', title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' }, description: { zh: '继续看版本与养成攻略', en: 'Continue with version and build guides', ja: '版本・育成ガイドへ進む' } },
];

function getWeaponNextSteps(gameId: GameId) {
  if (gameId === 'wuwa') return WUWA_WEAPON_NEXT_STEPS;
  if (gameId === 'zzz') return ZZZ_WEAPON_NEXT_STEPS;
  if (gameId === 'endfield') return ENDFIELD_WEAPON_NEXT_STEPS;
  if (gameId === 'roco-cn') return ROCO_CN_WEAPON_NEXT_STEPS;
  if (gameId === 'roco') return ROCO_WEAPON_NEXT_STEPS;
  return undefined;
}

function WeaponListPage({ gameId, locale, weapons }: { gameId: GameId; locale: SupportedLocale; weapons: WeaponCardEntry[] }) {
  const gameConfig = GAMES[gameId];
  const sections = getWeaponSections(gameId, weapons);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {weaponDisplayName(gameId, locale)}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {weaponCountLabel(gameId, weapons.length, locale)}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getWeaponIntro(gameId, locale)}
      </p>

      {gameId === 'endfield' && <div className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-game-text-muted"><strong className="mr-1 text-game-text">{locale === 'zh' ? '资料状态' : locale === 'ja' ? 'データ状態' : 'Data status'}:</strong>{locale === 'zh' ? '本页武器属性、效果与来源来自 Pioneer Test 资料快照；未来测试与正式版的数值、配方、获取方式仅以官方公告为准。' : locale === 'ja' ? '本ページの武器性能、効果、入手先は Pioneer Test 資料のスナップショットです。今後のテストと正式版の数値、レシピ、入手方法は公式発表のみを基準にしてください。' : 'Weapon stats, effects, and sources on this page are Pioneer Test snapshots. Use official announcements only for future-test and release values, recipes, and availability.'}</div>}

      {gameId === 'zzz' && <ZzzQueuedWeapons locale={locale} />}

      {sections.map(({ key, entries }) => {
        const title = gameId === 'skjh' ? localTypeLabel(key, locale) : key;
        return (
          <section key={key} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {title}{gameId !== 'skjh' && !title.endsWith('Rank') ? '' : ''} ({entries.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((weapon) => (
                <WeaponCard key={weapon.id} weapon={weapon} locale={locale} />
              ))}
            </div>
          </section>
        );
      })}

      <NextStepStrip locale={locale} links={getWeaponNextSteps(gameId)} />
    </div>
  );
}

function WeaponCard({ weapon, locale }: { weapon: WeaponCardEntry; locale: SupportedLocale }) {
  const typeLabel = localTypeLabel(weapon.typeLabel, locale);
  const rankColor = WEAPON_RANK_COLORS[weapon.rankLabel] || WEAPON_RANK_COLORS[weapon.rankGroup] || '#888';

  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base font-bold" style={{ color: rankColor }}>{weapon.rankLabel}</span>
        <h3 className="font-semibold text-game-text">{weapon.name}</h3>
        <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{typeLabel}</span>
      </div>
      {weapon.stats.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-3 text-sm text-game-text-muted">
          {weapon.stats.map((stat) => <span key={stat}>{stat}</span>)}
        </div>
      )}
      {weapon.source && <p className="mb-2 text-xs leading-relaxed text-game-text-muted">{weapon.source}</p>}
      {weapon.effectDescription && (
        weapon.effectName ? (
          <div className="rounded bg-game-surface-alt p-3">
            <div className="mb-1 text-xs font-semibold text-game-primary">{weapon.effectName}</div>
            <p className="text-xs leading-relaxed text-game-text-muted">{weapon.effectDescription}</p>
          </div>
        ) : (
          <p className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{weapon.effectDescription}</p>
        )
      )}
      {weapon.signatureCharacter && (
        <p className="mt-2 text-xs text-game-primary">
          {locale === 'zh' ? '专属' : locale === 'ja' ? '専用' : 'Signature'}: {weapon.signatureCharacter}
        </p>
      )}
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
