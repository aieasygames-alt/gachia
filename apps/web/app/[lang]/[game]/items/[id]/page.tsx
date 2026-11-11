import { serializeJsonLd } from '@/lib/jsonld-script';
import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { getCharactersNeedingMaterial, getItemData, getItemsForStaticParams } from '@/lib/game-data/items';
import { buildItemJsonLd } from '@/lib/jsonld';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';

const RARITY_COLORS = ['', '#9ca3af', '#4ade80', '#60a5fa', '#a855f7', '#eab308'];

type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const ITEM_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  hi3: [
    {
      href: '/hi3/version',
      title: { zh: '圣痕与装备档案', en: 'Stigma and gear archive', ja: '聖痕・装備資料' },
      description: { zh: '对照圣痕套装、武器与资源用途', en: 'Compare stigma sets, weapons, and resource uses', ja: '聖痕セット、武器、資源用途を確認' },
    },
    {
      href: '/hi3/guides/v9-0-resource-returnee-checklist',
      title: { zh: '资源与回归支援', en: 'Resources and returnee support', ja: '資源・復帰支援' },
      description: { zh: '核对已有部位、锻造成本与领取资格', en: 'Check owned pieces, crafting costs, and eligibility', ja: '所持部位、鍛造コスト、受取資格を確認' },
    },
    {
      href: '/hi3/items',
      title: { zh: '返回材料与奖励列表', en: 'Materials and rewards', ja: '素材・報酬一覧へ' },
      description: { zh: '继续查看源晶、以太燃素与自选箱', en: 'Browse Source Prisms, Ether Fuel, and the selector', ja: '源晶、エーテル燃料、選択箱を見る' },
    },
  ],
  starrail: [
    {
      href: '/starrail/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '把材料和需求角色对上', en: 'Match materials to the characters that need them', ja: '素材と必要キャラを確認' },
    },
    {
      href: '/starrail/weapons',
      title: { zh: '看光锥图鉴', en: 'Browse light cones', ja: '光円錐図鑑へ' },
      description: { zh: '继续看武器与养成材料', en: 'Continue with light cone and upgrade materials', ja: '光円錐と育成素材を確認' },
    },
    {
      href: '/starrail/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看配队、版本和抽卡专题', en: 'Continue with teams, version, and pull guides', ja: '編成・版本・ガチャへ' },
    },
  ],
  wuwa: [
    {
      href: '/wuwa/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看哪些角色要这个材料', en: 'See which characters need this material', ja: '必要キャラを確認' },
    },
    {
      href: '/wuwa/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '把角色突破和武器升级路线接起来', en: 'Connect character ascension with weapon upgrade paths', ja: 'キャラ昇格と武器強化を接続' },
    },
    {
      href: '/wuwa/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看声骸、版本和刷取专题', en: 'Continue with echo, version, and farming guides', ja: '声骸・版本・周回へ' },
    },
  ],
  nte: [
    {
      href: '/nte/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '把材料和角色需求直接对接', en: 'Directly connect materials with character needs', ja: '素材と必要キャラを接続' },
    },
    {
      href: '/nte/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '继续看武器培养材料', en: 'Continue with weapon upgrade materials', ja: '武器強化素材を確認' },
    },
    {
      href: '/nte/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看 Boss、伤害和新手专题', en: 'Continue with boss, damage, and beginner guides', ja: 'ボス・ダメージ・初心者へ' },
    },
  ],
  zzz: [
    {
      href: '/zzz/characters',
      title: { zh: '看代理人图鉴', en: 'Browse agents', ja: 'エージェント図鑑へ' },
      description: { zh: '先看哪些代理人会消耗这个材料', en: 'See which agents consume this material', ja: '消費するエージェントを確認' },
    },
    {
      href: '/zzz/weapons',
      title: { zh: '看音擎图鉴', en: 'Browse W-Engines', ja: '音擎図鑑へ' },
      description: { zh: '把材料和武器培养一起规划', en: 'Plan materials alongside weapon growth', ja: '素材と武器育成を一緒に計画' },
    },
    {
      href: '/zzz/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看版本、配队和驱动盘专题', en: 'Continue with version, teams, and disc guides', ja: '版本・編成・ディスクへ' },
    },
  ],
  guihuan: [
    {
      href: '/guihuan/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看哪些角色需要这些材料', en: 'See which characters need these materials', ja: '必要キャラを確認' },
    },
    {
      href: '/guihuan/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '把角色和武器培养一起看', en: 'Review character and weapon growth together', ja: 'キャラと武器育成を確認' },
    },
    {
      href: '/guihuan/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看玩法和系统攻略', en: 'Continue with gameplay and system guides', ja: '遊び方とシステム攻略へ' },
    },
  ],
  ananta: [
    {
      href: '/ananta/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看材料会被谁消耗', en: 'See which characters consume the material', ja: '消費するキャラを確認' },
    },
    {
      href: '/ananta/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '把材料需求和武器需求一起规划', en: 'Plan material and weapon needs together', ja: '素材と武器の需要を一緒に計画' },
    },
    {
      href: '/ananta/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看版本和养成专题', en: 'Continue with version and build guides', ja: '版本・育成へ' },
    },
  ],
  endfield: [
    {
      href: '/endfield/characters',
      title: { zh: '看干员图鉴', en: 'Browse operators', ja: 'オペレーター図鑑へ' },
      description: { zh: '先看哪些干员需要这个材料', en: 'See which operators need this material', ja: '必要オペレーターを確認' },
    },
    {
      href: '/endfield/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '把升级材料和武器培养一起看', en: 'Review upgrade materials and weapon growth together', ja: '強化素材と武器育成を確認' },
    },
    {
      href: '/endfield/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看测试、系统和版本内容', en: 'Continue with test, system, and version guides', ja: 'テスト・システム・版本へ' },
    },
  ],
  sea: [
    {
      href: '/sea/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看哪些角色会消耗这个材料', en: 'See which characters consume this material', ja: '消費するキャラを確認' },
    },
    {
      href: '/sea/version',
      title: { zh: '看版本专题', en: 'Version hub', ja: 'バージョン特集へ' },
      description: { zh: '先回到版本中心看开服节点', en: 'Return to the version hub for launch timing', ja: '版本中心で開服ノードを確認' },
    },
    {
      href: '/sea/guides/open-beta-version-center',
      title: { zh: '看公测中心', en: 'Open beta center', ja: '公測センターへ' },
      description: { zh: '继续接公测总览和首月路线', en: 'Continue into the beta overview and first-month routing', ja: '公測概要と初月ルートへ' },
    },
  ],
  skjh: [
    {
      href: '/skjh/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看哪些角色需要这些材料', en: 'See which characters need these materials', ja: '必要キャラを確認' },
    },
    {
      href: '/skjh/weapons',
      title: { zh: '看武器图鉴', en: 'Browse weapons', ja: '武器図鑑へ' },
      description: { zh: '把材料与武器培养串起来', en: 'Connect materials with weapon growth', ja: '素材と武器育成を接続' },
    },
    {
      href: '/skjh/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看专题攻略', en: 'Continue with guide content', ja: '攻略コンテンツへ進む' },
    },
  ],
  'roco-cn': [
    {
      href: '/roco-cn/characters',
      title: { zh: '看精灵图鉴', en: 'Browse Jinies', ja: 'ジニー図鑑へ' },
      description: { zh: '先看精灵技能与种族值，再规划培养', en: 'Review Jinie skills and base stats before training', ja: 'ジニーのスキルと種族値を確認' },
    },
    {
      href: '/roco-cn/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看新手、捕捉和养成专题', en: 'Continue with beginner, capture, and training guides', ja: '初心者・捕獲・育成ガイドへ' },
    },
    {
      href: '/roco-cn/redeem-codes',
      title: { zh: '看兑换码', en: 'Redeem codes', ja: '引き換えコード' },
      description: { zh: '领完兑换码再补材料缺口', en: 'Claim redeem codes to cover material gaps', ja: 'コードで素材を補充' },
    },
  ],
};

const TYPE_LABELS: Record<string, Record<string, string>> = {
  'character-ascension': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  'talent-book': { zh: '天赋书', en: 'Talent Book', ja: '天賦本' },
  'boss-drop': { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  'weekly-boss': { zh: '周本材料', en: 'Weekly Boss', ja: '週ボス素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  'common-drop': { zh: '普通掉落', en: 'Common Drop', ja: '一般ドロップ' },
  'exp-material': { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  special: { zh: '特殊材料', en: 'Special', ja: '特殊素材' },
  trace: { zh: '行迹材料', en: 'Trace Material', ja: '軌跡素材' },
  boss: { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  common: { zh: '普通材料', en: 'Common Material', ja: '一般素材' },
  'skill-material': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'boss-material': { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  'chaos-exp': { zh: '混沌经验', en: 'Chaos EXP', ja: 'カオスEXP' },
  'spirit-exp': { zh: '灵能经验', en: 'Spirit EXP', ja: 'スピリットEXP' },
  guide: { zh: '猎手指南', en: 'Hunter Guide', ja: 'ハンターガイド' },
  'arc-exp': { zh: '弧盘经验', en: 'Arc EXP', ja: 'アルクEXP' },
  'module-exp': { zh: '模块经验', en: 'Module EXP', ja: 'モジュールEXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
  manual: { zh: '技能手册', en: 'Skill Manual', ja: 'スキルマニュアル' },
  'ship-upgrade': { zh: '船只升级材料', en: 'Ship Upgrade', ja: '船強化素材' },
  craft: { zh: '制造材料', en: 'Crafting', ja: '製作素材' },
  consumable: { zh: '消耗品', en: 'Consumable', ja: '消耗品' },
  fragment: { zh: '碎片 / 记忆', en: 'Fragment / Memory', ja: '欠片 / 記憶' },
  resource: { zh: '生存资源', en: 'Survival Resource', ja: '生存資源' },
  base: { zh: '基地设施', en: 'Base Facility', ja: '拠点設備' },
  reward: { zh: '福利奖励', en: 'Reward', ja: '報酬' },
  capture: { zh: '咕噜球', en: 'Gulu Ball', ja: 'グルーボール' },
  exp: { zh: '经验果', en: 'EXP Fruit', ja: '経験値フルーツ' },
  evolution: { zh: '进化材料', en: 'Evolution Material', ja: '進化素材' },
};

type LocaleMeta = Partial<Record<SupportedLocale, { title: string; description: string }>>;

type ItemIntentContent = {
  summary: Record<SupportedLocale, string>;
  checks: Record<SupportedLocale, string[]>;
};

const ITEM_INTENT_CONTENT: Record<string, ItemIntentContent> = {
  'wuwa/violet-coral': {
    summary: {
      zh: '紫珊瑚是鸣潮的区域特产材料。先在角色需求列表确认是否为当前培养目标所需，再用地图和野外采集路线集中收集；没有明确角色需求时，不必优先占用探索时间。',
      en: 'Violet Coral is a Wuthering Waves local specialty. First confirm that a character you are building needs it, then use the map and overworld route to collect it in one pass. Do not make it an exploration priority without a current character need.',
      ja: 'Violet Coralは鳴潮の地域特産素材です。育成中のキャラが必要かを先に確認し、必要な場合だけマップとフィールド採集ルートでまとめて集めましょう。',
    },
    checks: {
      zh: ['先确认当前培养角色是否需要紫珊瑚。', '先处理角色突破瓶颈，再补探索采集。', '进地图前核对背包数量，避免重复跑图。'],
      en: ['Confirm that your current build target needs Violet Coral.', 'Clear the ascension bottleneck before optional exploration farming.', 'Check your inventory before opening the map to avoid duplicate routes.'],
      ja: ['現在育成しているキャラがViolet Coralを必要とするか確認。', '任意の探索採集より先に突破の不足を解消。', 'マップを開く前に所持数を確認し、重複ルートを避ける。'],
    },
  },
};

const ITEM_META_OVERRIDES: Record<string, LocaleMeta> = {
  'nte/tri-key': {
    zh: {
      title: '三把钥匙获取攻略：用途、来源与刷取路线',
      description: '异环三把钥匙 Tri-Key 材料攻略，整理灭碑石加工、猎手交易所、活动奖励、用途说明和刷取优先级。',
    },
    en: {
      title: 'Tri-Key NTE Guide: Uses, Sources & Farming Route',
      description: 'Tri-Key guide for Neverness to Everness with sources, Hunter Exchange, event rewards, crafting routes, uses, and farming priorities.',
    },
  },
  'wuwa/violet-coral': {
    zh: {
      title: '鸣潮紫珊瑚获取攻略：用途、来源与角色需求',
      description: '鸣潮紫珊瑚材料攻略，整理野外采集来源、角色突破用途和需要该材料的角色。进入地图前先核对角色需求与当前采集路线。',
    },
    en: {
      title: 'Violet Coral WuWa Guide: Uses, Sources & Characters',
      description: 'Violet Coral guide for Wuthering Waves with overworld gathering sources, ascension use, and the characters that need it.',
    },
  },
};

export async function generateStaticParams() {
  const gameIds = Object.keys(GAMES) as GameId[];
  const params = await Promise.all(gameIds.map(async (gameId) => {
    const items = await getItemsForStaticParams(gameId);
    return LOCALES.flatMap((lang) => items.map((item) => ({ lang, game: gameId, id: item.id })));
  }));
  return params.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale] ?? '';

  const data = await getItemData(gameId, id, locale);
  if (!data) return {};
  const name = data.name;
  const sourceDescription = data.source.trim();

  const override = ITEM_META_OVERRIDES[`${gameId}/${id}`]?.[locale];
  const alternates = buildLocalizedAlternates(locale, (l) => `/${l}/${gameId}/items/${id}`, LOCALES);
  if (override) {
    const title = override.title;
    const desc = override.description;
    return {
      title,
      description: desc,
      alternates,
      openGraph: {
        title,
        description: desc,
        url: `https://gachia.com/${locale}/${gameId}/items/${id}`,
        siteName: 'Gachia',
        images: [{ url: `https://gachia.com/images/og/${gameId}.webp`, width: 1200, height: 630 }],
        locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
      },
    };
  }

  const title = gameId === 'hi3'
    ? { zh: `${name} — 崩坏3用途与获取参考`, en: `${name} — HI3 Uses and Acquisition Reference`, ja: `${name} — 崩壊3rd 用途・入手参考` }[locale]
    : locale === 'zh'
    ? `${name} — ${gameName}材料获取攻略 | 掉落来源与角色需求`
    : locale === 'ja'
      ? `${name} — ${gameName}素材入手方法 | ドロップ場所と必要キャラ一覧`
      : `${name} — ${gameName} Material Guide | Drop Sources & Characters`;

  const desc = sourceDescription || (locale === 'zh'
    ? `${name}是${gameName}中的材料，本页包含掉落来源、获取方式以及需要此材料的角色一览。`
    : locale === 'ja'
      ? `${name}の入手方法、ドロップ場所、この素材を必要とするキャラクター一覧を掲載。`
      : `Where to find ${name} in ${gameName}. Drop sources, farming locations, and all characters that need this material for ascension.`);
  const metaDescription = ensureMetaLength(desc, locale);

  return {
    title,
    description: metaDescription,
    alternates,
    openGraph: {
      title,
      description: metaDescription,
      url: `https://gachia.com/${locale}/${gameId}/items/${id}`,
      siteName: 'Gachia',
      images: [{ url: `https://gachia.com/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

function buildItemFaqs(name: string, gameName: string, typeLabel: string, source: string, charCount: number, locale: SupportedLocale) {
  if (locale === 'zh') {
    return [
      { q: `${name}在${gameName}中怎么获得？`, a: source ? `${name}的获取方式：${source}。` : `${name}可通过游戏内活动或商店获取。` },
      { q: `${name}是${gameName}中的什么类型材料？`, a: `${name}属于${typeLabel}类材料。` },
      { q: `哪些角色需要${name}？`, a: charCount > 0 ? `共有${charCount}个角色在突破或技能升级时需要${name}。` : `目前暂无角色需要此材料。` },
    ];
  }
  if (locale === 'ja') {
    return [
      { q: `${gameName}で${name}の入手方法は？`, a: source ? `${name}の入手方法：${source}。` : `${name}はゲーム内イベントやショップで入手できます。` },
      { q: `${name}は${gameName}のどんな素材ですか？`, a: `${name}は${typeLabel}素材です。` },
      { q: `${name}を必要とするキャラクターは？`, a: charCount > 0 ? `${charCount}体のキャラクターが${name}を必要とします。` : `現在この素材を必要とするキャラクターはいません。` },
    ];
  }
  return [
    { q: `How to get ${name} in ${gameName}?`, a: source ? `${name} can be obtained from: ${source}.` : `${name} is available through in-game events or shops.` },
    { q: `What type of material is ${name}?`, a: `${name} is classified as a ${typeLabel.toLowerCase()} material in ${gameName}.` },
    { q: `Which characters need ${name}?`, a: charCount > 0 ? `${charCount} character${charCount > 1 ? 's' : ''} require ${name} for ascension or skill upgrades.` : `No characters currently need this material.` },
  ];
}

function buildItemMetaDescription(
  name: string,
  gameName: string,
  typeLabel: string,
  source: string,
  charCount: number,
  locale: SupportedLocale,
) {
  const base = locale === 'zh'
    ? `${name}是${gameName}中的${typeLabel}类材料。${source ? `获取方式：${source}。` : ''}${charCount > 0 ? `共有${charCount}个角色需要此材料用于突破或技能升级。` : '本页整理该材料的用途、掉落来源和获取路径。'}`
    : locale === 'ja'
      ? `${name}は${gameName}の${typeLabel}素材です。${source ? `入手方法：${source}。` : ''}${charCount > 0 ? `${charCount}体のキャラクターがこの素材を突破やスキル強化に必要とします。` : 'このページでは用途、入手先、必要キャラを整理しています。'}`
      : `${name} is a ${typeLabel.toLowerCase()} material in ${gameName}. ${source ? `Source: ${source}.` : ''}${charCount > 0 ? `${charCount} characters require this material for ascension or skill upgrades.` : 'This page covers the material\'s uses, drop sources, and farming paths.'}`;
  return base.slice(0, 160);
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];

  const data = await getItemData(gameId, id, locale);
  if (!data) notFound();
  const skjhExtra = gameId === 'skjh' ? data.raw as {
    stackLimit?: number;
    acquisition?: string[];
    acquisitionEn?: string[];
    uses?: string[];
    usesEn?: string[];
    conversions?: string[];
    conversionsEn?: string[];
    notes?: string;
    notesEn?: string;
  } : undefined;

  const typeLabel = TYPE_LABELS[data.type]?.[locale] ?? data.type;
  const gameName = gameConfig.name[locale];
  const relatedChars = await getCharactersNeedingMaterial(gameId, id);

  // Generate descriptive text for SEO
  const descText = buildItemMetaDescription(data.name, gameName, typeLabel, data.source, relatedChars.length, locale);

  const usageText = gameId === 'hi3'
    ? data.source
    : locale === 'zh'
    ? `在${gameName}中，${data.name}主要用于角色的等级突破和技能提升。合理安排材料刷取计划，优先满足主C角色的突破需求，可以显著提升队伍整体实力。建议在每天消耗体力时优先考虑角色突破材料的获取。`
    : locale === 'ja'
      ? `${gameName}では、${data.name}は主にキャラクターのレベル突破とスキル強化に使用されます。メインアタッカーの突破素材を優先して集めることで、チーム全体の戦力を大きく向上させることができます。`
      : `In ${gameName}, ${data.name} is primarily used for character ascension and skill upgrades. Planning your material farming efficiently and prioritizing your main DPS ascension materials can significantly boost your team's overall strength.`;
  const intentContent = ITEM_INTENT_CONTENT[`${gameId}/${id}`];
  const faqs = gameId === 'hi3'
    ? [
      {
        q: { zh: `${data.name}有什么用途与获取参考？`, en: `What are the uses and acquisition references for ${data.name}?`, ja: `${data.name}の用途・入手参考は？` }[locale],
        a: data.source,
      },
      {
        q: { zh: '领取或消耗前需要核对什么？', en: 'What should I check before claiming or spending?', ja: '受取・消費前に何を確認する？' }[locale],
        a: { zh: '先核对背包数量、已有装备部位和当前目标，再在客户端确认锻造配方、选择范围、活动结束时间与领取资格。', en: 'Check inventory, owned gear pieces, and your target, then verify crafting recipes, selection pools, event deadlines, and eligibility in the client.', ja: '所持数、装備部位、育成目標を確認してから、鍛造レシピ、選択範囲、イベント終了時刻、受取資格をゲーム内で確認してください。' }[locale],
      },
    ]
    : buildItemFaqs(data.name, gameName, typeLabel, data.source, relatedChars.length, locale);

  return (
    <div>
      <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href={`/${gameId}` as '/'} className="hover:text-game-primary">{gameName}</Link>
        <span>/</span>
        <Link href={`/${gameId}/items` as '/'} className="hover:text-game-primary">
          {locale === 'zh' ? '材料' : locale === 'ja' ? '素材' : 'Items'}
        </Link>
        <span>/</span>
        <span className="text-game-text">{data.name}</span>
      </nav>

      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-game-text">{data.name}</h1>
          {data.rarity > 0 && (
            <span className="text-sm font-bold" style={{ color: RARITY_COLORS[data.rarity] || '#888' }}>
              {'★'.repeat(data.rarity)}
            </span>
          )}
        </div>
        {data.nameAlt && <p className="mt-1 text-sm text-game-text-muted">{data.nameAlt}</p>}
      </div>

      {/* SEO description paragraph */}
      <div className="mb-4 rounded-lg border border-game-border bg-game-surface p-4">
        <p className="text-sm leading-relaxed text-game-text">{descText}</p>
      </div>

      {intentContent && (
        <section className="mb-4 rounded-lg border border-game-border bg-game-surface p-4">
          <h2 className="mb-2 text-base font-semibold text-game-text">
            {locale === 'zh' ? '先看结论' : locale === 'ja' ? '先に結論' : 'Quick answer'}
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">{intentContent.summary[locale]}</p>
          <ul className="grid gap-2 text-sm text-game-text-muted sm:grid-cols-3">
            {intentContent.checks[locale].map((check) => (
              <li key={check} className="rounded-md bg-game-surface-alt px-3 py-2">{check}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {typeLabel && (
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-xs text-game-text-muted">
              {locale === 'zh' ? '类型' : locale === 'ja' ? 'タイプ' : 'Type'}
            </div>
            <div className="text-sm font-medium text-game-text">{typeLabel}</div>
          </div>
        )}
        {data.source && (
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-xs text-game-text-muted">
              {locale === 'zh' ? '来源' : locale === 'ja' ? '入手方法' : 'Source'}
            </div>
            <div className="text-sm text-game-text">{data.source}</div>
          </div>
        )}
      </div>

      {skjhExtra && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {skjhExtra.stackLimit && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-1 text-xs text-game-text-muted">
                {locale === 'zh' ? '堆叠上限' : locale === 'ja' ? 'スタック上限' : 'Stack Limit'}
              </div>
              <div className="text-sm font-medium text-game-text">{skjhExtra.stackLimit}</div>
            </div>
          )}
          {skjhExtra.acquisition && skjhExtra.acquisition.length > 0 && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-2 text-xs text-game-text-muted">
                {locale === 'zh' ? '获取途径' : locale === 'ja' ? '入手ルート' : 'Acquisition'}
              </div>
              <ul className="space-y-1 text-sm text-game-text">
                {(locale === 'zh' ? skjhExtra.acquisition : (skjhExtra.acquisitionEn ?? skjhExtra.acquisition)).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {skjhExtra.uses && skjhExtra.uses.length > 0 && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-2 text-xs text-game-text-muted">
                {locale === 'zh' ? '主要用途' : locale === 'ja' ? '主な用途' : 'Primary Uses'}
              </div>
              <ul className="space-y-1 text-sm text-game-text">
                {(locale === 'zh' ? skjhExtra.uses : (skjhExtra.usesEn ?? skjhExtra.uses)).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {skjhExtra.conversions && skjhExtra.conversions.length > 0 && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-2 text-xs text-game-text-muted">
                {locale === 'zh' ? '制作 / 转化' : locale === 'ja' ? '製作 / 変換' : 'Crafting / Conversion'}
              </div>
              <ul className="space-y-1 text-sm text-game-text">
                {(locale === 'zh' ? skjhExtra.conversions : (skjhExtra.conversionsEn ?? skjhExtra.conversions)).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {(skjhExtra.notes || skjhExtra.notesEn) && (
            <div className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-1 text-xs text-game-text-muted">
                {locale === 'zh' ? '备注' : locale === 'ja' ? 'メモ' : 'Notes'}
              </div>
              <div className="text-sm text-game-text">{locale === 'zh' ? skjhExtra.notes : (skjhExtra.notesEn ?? skjhExtra.notes)}</div>
            </div>
          )}
        </div>
      )}

      {relatedChars.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? `需要此材料的角色（${relatedChars.length}个）` : locale === 'ja' ? `この素材が必要なキャラ（${relatedChars.length}体）` : `Characters That Need This (${relatedChars.length})`}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {relatedChars.map(char => (
              <Link key={char.id} href={`/${gameId}/characters/${char.id}` as '/'}
                className="flex items-center gap-2 rounded-lg border border-game-border bg-game-surface p-2 text-sm transition-colors hover:border-game-primary">
                <img src={char.image} alt={char.id} className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                <span className="text-game-text">{char.id}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Usage tips section for additional content */}
      <div className="mt-6 rounded-lg border border-game-border bg-game-surface p-4">
        <h2 className="mb-2 text-base font-semibold text-game-text">
          {locale === 'zh' ? '使用建议' : locale === 'ja' ? '使用アドバイス' : 'Usage Tips'}
        </h2>
        <p className="text-sm leading-relaxed text-game-text-muted">{usageText}</p>
      </div>

      {/* FAQ section for rich snippets */}
      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-game-text">
          {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-game-text transition-colors group-hover:text-game-primary">
                {faq.q}
              </summary>
              <div className="border-t border-game-border px-4 py-2.5 text-sm text-game-text-muted">{faq.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-game-text">
          {locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(ITEM_NEXT_STEPS[gameId] ?? []).map((link) => (
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

      {buildItemJsonLd({
        gameId,
        locale,
        name: data.name,
        description: descText,
        itemId: id,
        categoryLabel: typeLabel,
        tags: [gameName, typeLabel],
        faq: faqs.map((faq) => ({
          question: faq.q,
          answer: faq.a,
        })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        />
      ))}
    </div>
  );
}
