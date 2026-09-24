import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const BASE_URL = 'https://gachia.com';

type MetaCopy = { title: string; description: string };

const mainMetaBaseline: Record<string, Record<SupportedLocale, MetaCopy>> = {
  '': {
    zh: { title: '原神攻略Wiki — 角色图鉴/武器/圣遗物/攻略 | Gachia', description: '原神角色图鉴、武器数据库、圣遗物推荐与攻略百科，覆盖 6.x Nod-Krai 区域，整理 116+ 角色属性、技能、突破材料、命座、配队推荐、材料路线、交互地图和版本热点，方便你快速查资料、规划培养并持续跟进版本变化，同时附版本专题和实用入口。同时收录版本专题、图鉴页、攻略页和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Wiki — Characters, Weapons, Builds & Guides | Gachia', description: 'Genshin Impact character builds, weapon database, artifact recommendations, and guides up to v6.x Nod-Krai. Browse 116+ characters, team comps, maps, materials, and version topics for faster farming and build planning.' },
    ja: { title: '原神攻略Wiki — キャラ/武器/ガイド | Gachia', description: '原神のキャラビルド、武器データベース、聖遺物おすすめ、攻略百科をまとめ、v6.x Nod-Krai まで対応。116+ キャラの性能、突破素材、命ノ星座、編成、素材ルート、インタラクティブマップ、版本トピックを一度に確認でき、育成計画にも役立ちます。版本特集と実用導線も整理済みです。さらに版本特集、図鑑、攻略、実用ツールへの導線もまとめています。' },
  },
  characters: {
    zh: { title: '原神角色图鉴 — 全角色Wiki、Build、技能与配队', description: '按属性、武器、星级快速浏览原神角色图鉴，适合在抽卡前先看定位、培养方向和组队思路。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Characters Wiki — Builds, Skills & Team Planning', description: 'Browse the Genshin Impact character wiki by element, weapon, and rarity to check roles, build direction, and team fit before pulling. It also links to characters, weapons, guides, and useful tools for deeper browsing.' },
    ja: { title: '原神キャラ図鑑 — Wiki、ビルド、スキル、編成', description: '属性、武器、レアリティで原神キャラ図鑑を素早く確認し、役割・育成方針・編成相性を把握できます。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  weapons: {
    zh: { title: '原神武器图鉴 — 外观法杖Wiki、特效与获取方式', description: '按武器类型、稀有度和适配角色快速浏览原神武器图鉴，适合在配装前先看主词条、特效和毕业选择。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Weapons Wiki — Cosmetic Staffs, Effects & Sources', description: 'Browse the Genshin Impact weapon wiki by type, rarity, and best users to review main stats, passives, and endgame picks before building. It also links to characters, weapons, guides, and useful tools for deeper browsing.' },
    ja: { title: '原神武器図鑑 — 杖Wiki、演出効果、入手方法', description: '武器種別、レアリティ、適性キャラで原神武器図鑑を確認し、メインステ、効果、最終候補を把握できます。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  artifacts: {
    zh: { title: '圣遗物 - 原神 Wiki', description: '原神圣遗物图鉴大全，包含40套圣遗物的2件套/4件套效果及推荐角色' },
    en: { title: 'Artifacts - Genshin Impact Wiki', description: 'Complete Genshin Impact Artifact guide with 40 sets, 2pc/4pc bonuses and recommended characters' },
    ja: { title: '聖遺物 - 原神 Wiki', description: '原神聖遺物図鑑、40セットの2セット/4セット効果とおすすめキャラ' },
  },
  items: {
    zh: { title: '原神材料图鉴 — 突破材料、天赋书、Boss掉落与刷取路线', description: '按突破材料、天赋书、Boss 掉落和区域特产快速浏览原神材料图鉴，适合在养角色前先看来源与刷取路线。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Materials Wiki — Talent Books, Boss Drops & Farming Routes', description: 'Browse the Genshin Impact materials wiki by ascension items, talent books, weekly boss drops, local specialties, enemy drops, locations, and farming routes before upgrading characters.' },
    ja: { title: '原神素材図鑑 — 突破素材、天賦本、ボス素材、周回', description: '突破素材、天賦本、ボスドロップ、地域特産品で原神素材図鑑を確認し、入手先と周回ルートを把握できます。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  guides: {
    zh: { title: '原神攻略大全 — 当前祈愿、Nod-Krai、月反应、配队与材料', description: '原神攻略百科，覆盖新手开荒、角色培养、配队推荐、深渊挑战、版本专题与热点攻略，帮助你快速找到当前版本最实用的下一步。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Guides — Current Banner, Nod-Krai, Lunar Reactions & Builds', description: 'Genshin Impact guides for current banners, Luna VIII/Nod-Krai, Lunar reactions, character builds, teams, materials, boss strategies, codes, and Primogem planning.' },
    ja: { title: '原神攻略 — バナー、Nod-Krai、月反応、編成、素材', description: '原神攻略百科。初心者向け、キャラ育成、編成、深境螺旋、版本特集までまとめて、今知りたい攻略へすぐ進めます。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  'redeem-codes': {
    zh: { title: '原神兑换码大全｜最新礼包码与领取方法', description: '原神兑换码大全，整理前瞻直播、活动福利、永久码和领取方法，帮助你快速查看当前可用礼包并及时兑换原石、经验书和摩拉。' },
    en: { title: 'Genshin Impact Redeem Codes, Gift Codes & Rewards', description: 'Genshin Impact redeem code tracker covering livestream codes, event rewards, permanent codes, and redemption steps so you can claim Primogems and resources quickly.' },
    ja: { title: '原神 交換コード一覧｜最新特典と受け取り方法', description: '原神の交換コード一覧。生放送コード、イベント報酬、恒常コード、受け取り方法を整理し、原石や育成素材を素早く回収できます。' },
  },
  version: {
    zh: { title: '原神 7.1 前瞻专题：直播码、Snezhnaya 与卡池', description: '追踪原神 7.1 前瞻、Luna II、Snezhnaya、Sandrone、直播码、当前/下期卡池、Nod-Krai 长尾和原石规划。' },
    en: { title: 'Genshin v7.1 Watch: Livestream Codes, Snezhnaya & Banners', description: 'Track Genshin v7.1 watch, Luna II, Snezhnaya, Sandrone, livestream codes, current and next banners, Nod-Krai long-tail intent, and Primogem planning.' },
    ja: { title: '原神 v7.1 注目：配信コード、Snezhnaya、バナー', description: '原神 v7.1、Luna II、Snezhnaya、Sandrone、配信コード、現在/次回バナー、Nod-Krai長尾、原石計画を確認できます。' },
  },
  gacha: {
    zh: { title: '原神 Wiki | Gachia', description: '原神角色图鉴、武器数据、圣遗物推荐、攻略百科 — Gachia' },
    en: { title: 'Genshin Impact Wiki | Gachia', description: 'Genshin Impact character guide, weapon database, artifact builds, wiki — Gachia' },
    ja: { title: '原神 Wiki | Gachia', description: '原神キャラ図鑑、武器データ、聖遺物おすすめ、攻略百科 — Gachia' },
  },
  build: {
    zh: { title: '原神 配装推荐', description: '原神 角色配装推荐、最佳武器、圣遗物搭配，整理毕业思路、词条优先级、常见阵容与版本答案，帮助你快速完成养成决策。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Build', description: 'Genshin Impact character build recommendations, best weapons, artifact sets, stat priorities, common team setups, and endgame build paths to help you make the right upgrade decisions.' },
    ja: { title: '原神 ビルド', description: '原神 キャラビルドおすすめ、最適武器、聖遺物組み合わせ、育成優先度、主要編成、完成形の考え方をまとめた実用ガイドです。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  teams: {
    zh: { title: '原神 配队模拟器', description: '原神 角色配队模拟器，查看最佳阵容搭配' },
    en: { title: 'Genshin Impact Team Builder', description: 'Genshin Impact team builder - best team compositions and synergies' },
    ja: { title: '原神 パーティ編成', description: '原神 パーティ編成シミュレーター、おすすめ編成' },
  },
  'tier-list': {
    zh: { title: '原神角色强度排行 — SS/S/A/B分级 | 攻略', description: '原神角色强度参考，按深渊、大世界与队伍依赖整理 SS 至 B 分级。结构化数据最后更新于 2026-06-28，抽卡或养成前请核对当前版本与配队条件。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Character Tier Reference — Roles, Teams & Data Date', description: 'Genshin Impact character tier reference with SS to B groups for Spiral Abyss, overworld, and team dependence. Structured data was last updated on 2026-06-28; verify current patch and teams before investing.' },
    ja: { title: '原神キャラTierリスト 2026 — SS/S/A/B評価', description: '原神キャラ評価の参考。深境螺旋、大世界、編成依存をSSからBで整理。構造化データは2026-06-28更新のため、育成前に現行版本と編成条件を確認してください。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  compare: {
    zh: { title: '原神角色对比｜X vs Y 强度、定位与培养优先级', description: '原神 角色对比工具，适合做 X vs Y 强度比较、定位分析、配装差异判断和培养优先级筛选，帮助你在抽卡和组队前先选对角色。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Character Compare | X vs Y, Roles, Builds & Priority', description: 'Genshin Impact character comparison tool for X vs Y stat checks, role matching, build differences, and upgrade priority so you can choose the right unit before pulling or investing.' },
    ja: { title: '原神キャラ比較｜X vs Y の性能、役割、育成優先度', description: '原神 のキャラ比較ツールです。X vs Y の性能差、役割、ビルド差、育成優先度をまとめて確認できます。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  calculator: {
    zh: { title: '计算器 - 原神', description: '原神角色养成计算器，计算升级、突破所需材料数量，支持材料库存管理' },
    en: { title: 'Calculator - Genshin Impact', description: 'Genshin Impact character upgrade calculator — compute ascension materials, level-up costs, and track your inventory' },
    ja: { title: '計算機 - 原神', description: '原神キャラ育成計算機、昇格素材・レベルアップ必要数を計算、在庫管理対応' },
  },
  map: {
    zh: { title: '原神互动地图 — 传送锚点、宝箱、收集品', description: '原神互动地图攻略：传送锚点位置、宝箱分布、材料采集点、世界任务标记。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Interactive Map — Teleports, Chests & Collectibles', description: 'Genshin Impact interactive map guide: teleport waypoints, chest locations, material farming spots, and world quest markers. It also links to characters, weapons, guides, and useful tools for deeper browsing.' },
    ja: { title: '原神マップ — テレポート、宝箱、コレクション', description: '原神マップ攻略：テレポート位置、宝箱分布、素材採集ポイント。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  download: {
    zh: { title: '原神下载｜官网入口、官网下载与配置要求', description: '这个页面先帮你确认原神官网、下载、云游戏、配置要求和兑换码入口，再继续查看版本、地图和养成路线。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Download, Official Site & System Requirements', description: 'This page captures official site, download, cloud gaming, specs, and code intent, then routes you into patches, maps, and build planning. It also links to characters, weapons, guides, and useful tools for deeper browsing.' },
    ja: { title: '原神 DL・公式入口・必要環境', description: '公式、DL、クラウド、推奨環境、コード検索を受け、版本、マップ、育成導線へつなぎます。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  'characters/hu-tao': {
    zh: { title: '胡桃配装攻略 — 原神角色、武器与配队推荐', description: '胡桃（Pyro Polearm）配装攻略：角色定位、推荐武器、套装、材料、技能、配队和培养优先级。SS Tier。 往生堂第七十七代堂主，性格古灵精怪，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Hu Tao Build Guide — Genshin Impact Character, Weapons & Teams', description: 'Hu Tao (Pyro Polearm) build guide for Genshin Impact: role, best weapons, sets, materials, skills, teams, and investment priority. SS tier. It also links to characters, weapons, guides, and useful tools for deeper browsing.' },
    ja: { title: 'Hu Taoビルド攻略 — 原神キャラ・武器・編成', description: 'Hu Tao (Pyro Polearm) のビルド攻略。役割、武器、セット、素材、スキル、編成、育成優先度を整理。SS Tier. 77th Director of the Wangsheng Funeral Parlorさらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  'weapons/sacrificial-jade': {
    zh: { title: '遗祀玉珑攻略：属性、适用角色与配装推荐', description: '原神遗祀玉珑属性解析：4星法器，满级暴击率36.8%，离场提升生命值与元素精通，查看适用角色和配装思路。' },
    en: { title: 'Sacrificial Jade Genshin: Stats, Best Users & Builds', description: 'Sacrificial Jade guide for Genshin Impact: 4-star Catalyst, CRIT Rate 36.8% at Lv.90, HP and EM passive, best users, and builds.' },
    ja: { title: 'Sacrificial Jade (CRIT Rate 36.8%) — 原神武器評価 | スキルとおすすめキャラ', description: '★4, Base ATK 42, Lv.90 CRIT Rate 36.8%. Off-field, increase HP and EM おすすめキャラ、入手方法、実戦での役割を補足し、育成優先度の判断に役立てます。' },
  },
  'artifacts/gladiators-finale': {
    zh: { title: '角斗士的终幕礼 - 原神 Wiki', description: '角斗士的终幕礼. 攻击力提高18%. 推荐: 优菈, 雷泽, 刻晴, 神里绫华，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: "Gladiator's Finale - Genshin Impact Wiki", description: "Gladiator's Finale. ATK +18%. Best for: Eula, Razor, Keqing, Kamisato Ayaka It also links to characters, weapons, guides, and useful tools for deeper browsing." },
    ja: { title: "Gladiator's Finale - 原神 Wiki", description: 'Gladiator\'s Finale. ATK +18%. おすすめ: Eula, Razor, Keqing, Kamisato Ayakaさらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
  'guides/banner-schedule-guide': {
    zh: { title: '原神卡池时间表 2026：当前、下一个祈愿与复刻', description: '查看原神当前卡池、下一个祈愿、复刻预测、结束时间和原石规划。按版本持续更新，抽卡前快速确认目标。，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。' },
    en: { title: 'Genshin Impact Banner Schedule 2026: Current, Next & Reruns', description: 'Check the current Genshin Impact banners, next wishes, reruns, end dates, and Primogem planning. Updated for each version before you pull. It also links to characters, weapons, guides, and useful tools for deeper browsing.' },
    ja: { title: '原神バナー予定 2026：現在・次回・復刻', description: '原神の現在・次回・復刻バナー、終了日、原石計画を確認。バージョンごとに更新します。さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。' },
  },
};

export function genshinMetadata(locale: SupportedLocale, path: string, title: string, description: string): Metadata {
  const normalized = path ? `/${path.replace(/^\/+/, '')}` : '';
  const url = `${BASE_URL}/${locale}/genshin${normalized}`;
  const baseline = mainMetaBaseline[path]?.[locale];
  const resolvedTitle = baseline?.title ?? title;
  const resolvedDescription = baseline?.description ?? description;
  const legacyHubCanonical = path === 'gacha';
  const legacyNoAlternates = path === 'redeem-codes';
  const legacyNoJapaneseAlternate = path === 'guides/banner-schedule-guide';
  const canonicalUrl = legacyHubCanonical ? `${BASE_URL}/${locale}/genshin` : url;
  const languages = legacyNoAlternates ? undefined : {
    'zh-Hans': `${BASE_URL}/zh/genshin${normalized}`,
    en: `${BASE_URL}/en/genshin${normalized}`,
    ...(legacyNoJapaneseAlternate ? {} : { ja: `${BASE_URL}/ja/genshin${normalized}` }),
    'x-default': `${BASE_URL}/zh/genshin${normalized}`,
  };
  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: {
      canonical: canonicalUrl,
      ...(languages ? { languages } : {}),
    },
    openGraph: { title: resolvedTitle, description: resolvedDescription, url, siteName: 'Gachia', type: 'website', images: [{ url: `${BASE_URL}/images/og/genshin.webp`, width: 1200, height: 630, alt: resolvedTitle }] },
    twitter: { card: 'summary_large_image', title: resolvedTitle, description: resolvedDescription, images: [`${BASE_URL}/images/og/genshin.webp`] },
  };
}

export function entityJsonLd(locale: SupportedLocale, path: string, name: string, description: string, category: string, image?: string) {
  const url = `${BASE_URL}/${locale}/genshin/${path}`;
  const categoryUrl = `${BASE_URL}/${locale}/genshin/${category}`;
  const home = locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home';
  const game = locale === 'en' ? 'Genshin Impact' : '原神';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: home, item: `${BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: game, item: `${BASE_URL}/${locale}/genshin` },
        { '@type': 'ListItem', position: 3, name: category, item: categoryUrl },
        { '@type': 'ListItem', position: 4, name },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: name,
      description,
      url,
      articleSection: category,
      isPartOf: { '@type': 'CollectionPage', name: `${game} ${category}`, url: categoryUrl },
      publisher: { '@type': 'Organization', name: 'Gachia', url: BASE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name,
      description,
      url,
      mainEntity: { '@type': 'Thing', name, description, url, ...(image ? { image } : {}) },
    },
  ];
}

export function breadcrumbJsonLd(locale: SupportedLocale, path: string, current: string) {
  const segments = path.split('/').filter(Boolean);
  const items = [
    { '@type': 'ListItem', position: 1, name: locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home', item: `${BASE_URL}/${locale}` },
    { '@type': 'ListItem', position: 2, name: locale === 'en' ? 'Genshin Impact' : '原神', item: `${BASE_URL}/${locale}/genshin` },
  ];
  if (segments.length > 0) items.push({ '@type': 'ListItem', position: 3, name: current, item: `${BASE_URL}/${locale}/genshin/${path}` });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}
