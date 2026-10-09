import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import type { GearSetListEntry, ItemListEntry } from '@/lib/game-data/items';
import { getEndfieldGearSetListData, getItemListData } from '@/lib/game-data/items';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

const ITEM_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神全材料图鉴，覆盖角色突破材料、天赋书、Boss掉落、区域特产和日常刷取路线，帮助你快速定位每个角色的培养来源。', en: 'Genshin Impact materials wiki with ascension materials, talent books, weekly boss drops, local specialties, enemy drops, locations, and farming routes for character upgrades.', ja: '原神全素材図鑑。キャラ突破素材、天賦本、ボスドロップ、地域特産品、周回場所をまとめて確認できます。' },
  starrail: { zh: '崩坏：星穹铁道全材料图鉴，覆盖角色突破材料、行迹材料、Boss掉落和刷取来源，方便你按角色或用途快速查找所需素材。', en: 'Complete Honkai: Star Rail material list with ascension materials, trace materials, boss drops, and farming sources organized for quick character planning.', ja: 'スターレイル全素材図鑑。キャラ突破素材、軌跡素材、ボスドロップ、周回先を整理して確認できます。' },
  wuwa: { zh: '鸣潮全材料图鉴，整理技能材料、Boss材料、区域特产和养成来源，适合在培养角色前先看清每种素材该去哪里刷。', en: 'Complete Wuthering Waves material list with skill materials, boss materials, local specialties, and farming routes so you can prep upgrades efficiently.', ja: '鳴潮全素材図鑑。スキル素材、ボス素材、地域特産品、周回ルートを整理して案内します。' },
  nte: { zh: '异环全材料图鉴，覆盖突破材料、Boss掉落、技能手册和养成来源，方便你按角色、阶段或用途快速整理资源。', en: 'Complete Neverness to Everness material list with ascension materials, boss drops, skill manuals, and farming sources for efficient progression planning.', ja: '異環全素材図鑑。昇格素材、ボスドロップ、スキルマニュアル、周回先を整理しています。' },
  zzz: { zh: '绝区零材料图鉴 Wiki，覆盖代理人突破材料、技能材料、特殊材料、抽卡道具、刷取来源、当前版本培养优先级和配队养成路线。', en: 'Zenless Zone Zero materials wiki with agent ascension materials, skill materials, special mats, gacha items, farming sources, current-version upgrade priority, and team-building routes.', ja: 'ゼンレスゾーンゼロ素材Wiki。突破素材、スキル素材、特殊素材、ガチャアイテム、周回先、育成優先度を整理。' },
  hi3: { zh: '崩坏3 9.0 首批材料资料，整理官方公告中涉及的源晶、以太燃素、忧郁哲人圣痕自选与装备材料；当前获取方式和成本以客户端为准。', en: 'Honkai Impact 3rd v9.0 starter material index for Source Prisms, Ether Fuel, the Weeping Philosopher selector, and gear materials named in official notices. Confirm live sources and costs in the client.', ja: '崩壊3rd Ver.9.0初回素材資料。公式告知にある源晶、エーテル燃料、憂鬱な哲人選択箱、装備素材を整理し、現在の入手先とコストはクライアントで確認します。' },
  guihuan: { zh: '归环全材料图鉴，覆盖使灵突破、元素突破、Boss材料和对应来源，便于你在培养前快速确认每类素材的获取方式。', en: 'Complete Guihuan material list with spirit ascension, element ascension, boss materials, and acquisition sources for easy build planning.', ja: '帰環全素材図鑑。スピリット昇格、元素昇格、ボス素材、入手先をまとめています。' },
  ananta: { zh: '无限大全材料图鉴，覆盖突破材料、Boss材料、区域特产和刷取来源，帮助你在培养角色时快速整理所有所需资源。', en: 'Complete Ananta material list with ascension, boss materials, local specialties, and farming sources to keep your upgrade path organized.', ja: 'アナンタ全素材図鑑。昇格素材、ボス素材、地域特産品、周回先を整理して確認できます。' },
  endfield: { zh: '明日方舟：终末地材料图鉴，收录 Pioneer Test 的突破、技能、武器与货币资料参考。后续测试和正式版的掉落、配方与来源请以官方公告复核。', en: 'Arknights: Endfield materials roster with Pioneer Test references for ascension, skill, weapon, and currency data. Verify future-test and release drops, recipes, and sources through official announcements.', ja: 'アークナイツ：エンドフィールド素材図鑑。Pioneer Test の昇格、スキル、武器、通貨資料を参考として収録。今後のテストと正式版のドロップ、レシピ、入手先は公式発表で再確認してください。' },
  skjh: { zh: '失控进化资源道具图鉴，覆盖废料、布料、木石金属、领地柜、睡袋和公测奖励，方便你规划开荒阶段的资源收集路线。', en: 'Ashfall Evolution resource and item list with scrap, cloth, wood, stone, metal, territory cabinet, sleeping bag, and launch rewards for early-game planning.', ja: '失控進化の資源・アイテム一覧。スクラップ、布、木石金属、領地キャビネット、寝袋、報酬を整理しています。' },
  'roco-cn': { zh: '洛克王国材料图鉴，覆盖咕噜球、经验果、进化材料、矿石与货币代币的获取来源，方便你规划捕捉与培养路线。', en: 'Roco Kingdom (CN) materials list with Gulu Balls, EXP fruits, evolution materials, ores, and currency tokens with acquisition sources for capture and training planning.', ja: '洛克王国素材一覧。グルーボール、経験値フルーツ、進化素材、鉱石、通貨の入手先を整理しています。' },
};

const NTE_TYPE_LABELS: Record<string, Record<string, string>> = {
  guide: { zh: '猎手指南', en: 'Hunter Guide', ja: 'ハンターガイド' },
  'arc-exp': { zh: '弧盘经验', en: 'Arc EXP', ja: 'アルクEXP' },
  'module-exp': { zh: '模块经验', en: 'Module EXP', ja: 'モジュールEXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  boss: { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
  manual: { zh: '技能手册', en: 'Skill Manual', ja: 'スキルマニュアル' },
};

const GENSHIN_TYPE_LABELS: Record<string, Record<string, string>> = {
  'character-ascension': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  'talent-book': { zh: '天赋书', en: 'Talent Book', ja: '天賦本' },
  'boss-drop': { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  'weekly-boss': { zh: '周本材料', en: 'Weekly Boss', ja: '週ボス素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  'common-drop': { zh: '普通怪物掉落', en: 'Common Drop', ja: '一般ドロップ' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  'exp-material': { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
};

const RARITY_COLORS = ['', '#9ca3af', '#4ade80', '#60a5fa', '#a855f7', '#eab308'];
type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const ENDFIELD_ITEM_NEXT_STEPS: NextStepLink[] = [
  {
    href: '/endfield/events',
    label: { zh: '先看测试后状态', en: 'Start with post-test status', ja: 'まずテスト後状態へ' },
    description: { zh: '确认可复用资料、官方观察项和当前节点', en: 'Check reusable references, official watch items, and the current state', ja: '再利用資料、公式確認項目、現状を確認', },
  },
  {
    href: '/endfield/characters',
    label: { zh: '继续看干员图鉴', en: 'Browse characters', ja: '干員図鑑へ' },
    description: { zh: '按干员反查材料需求和养成路线', en: 'Match material needs to each operator', ja: '干員ごとの素材需要を確認', },
  },
  {
    href: '/endfield/guides/blueprint-aic-factory-guide',
    label: { zh: '整理 AIC 工厂路线', en: 'Plan AIC factory modules', ja: 'AIC工場モジュールを整理' },
    description: { zh: '按输入、输出和瓶颈保留可复用的资源线', en: 'Keep reusable resource lines by input, output, and bottleneck', ja: '入力、出力、ボトルネック別に再利用可能な資源ラインを残す', },
  },
];

const ITEM_INTRO: Record<string, Record<SupportedLocale, string>> = {
  hi3: {
    zh: '收录源晶、以太燃素、崩坏结晶与圣痕自选箱。先核对背包与已有圣痕部位，再查看客户端中的锻造成本、活动期限和领取资格。',
    en: 'Browse Source Prisms, Ether Fuel, Honkai Shards, and the stigma selector. Check inventory and owned stigma pieces, then verify crafting costs, event deadlines, and eligibility in the client.',
    ja: '源晶、エーテル燃料、崩壊結晶、聖痕選択箱を収録。所持素材と聖痕部位を確認してから、鍛造コスト、イベント期間、受取資格をゲーム内で確認します。',
  },
  genshin: {
    zh: '按突破材料、天赋书、Boss 掉落和区域特产快速浏览原神材料图鉴，适合在养角色前先看来源与刷取路线。',
    en: 'Browse the Genshin Impact materials wiki by ascension items, talent books, weekly boss drops, local specialties, enemy drops, locations, and farming routes before upgrading characters.',
    ja: '突破素材、天賦本、ボスドロップ、地域特産品で原神素材図鑑を確認し、入手先と周回ルートを把握できます。',
  },
  starrail: {
    zh: '按突破材料、行迹材料、Boss 掉落和通用材料快速浏览星穹铁道材料图鉴，适合先看培养需求和刷取来源。',
    en: 'Browse the Honkai: Star Rail material wiki by ascension items, trace materials, boss drops, and common mats to review upgrade needs and farming sources.',
    ja: '突破素材、軌跡素材、ボスドロップ、汎用素材でスターレイル素材図鑑を確認し、育成需要と入手先を把握できます。',
  },
  wuwa: {
    zh: '按技能材料、Boss 材料、周本和区域特产快速浏览鸣潮材料图鉴，适合先看每个素材该去哪里刷。',
    en: 'Browse the Wuthering Waves material wiki by skill items, boss mats, weekly drops, and specialties to review where each resource comes from.',
    ja: 'スキル素材、ボス素材、週ボス、地域特産品で鳴潮素材図鑑を確認し、入手場所を把握できます。',
  },
  nte: {
    zh: '按猎手指南、弧盘经验、模块经验和突破材料快速浏览异环材料图鉴，适合先看阶段需求与来源。',
    en: 'Browse the Neverness to Everness material wiki by guides, Arc EXP, module EXP, and ascension items to review stage needs and sources.',
    ja: 'ガイド、アルクEXP、モジュールEXP、昇格素材で異環素材図鑑を確認し、段階別の需要と入手先を把握できます。',
  },
  zzz: {
    zh: '按突破材料、技能材料、特殊材料、货币和抽卡道具快速浏览绝区零材料图鉴 Wiki，适合先看代理人养成、刷取来源和当前版本优先级。',
    en: 'Browse the Zenless Zone Zero materials wiki by ascension, skill, special, currency, and gacha items to review agent upgrades, farming sources, and current-version priority.',
    ja: '突破素材、スキル素材、特殊素材、通貨、ガチャアイテムでゼンゼロ素材Wikiを確認し、育成と周回先を把握できます。',
  },
  ananta: {
    zh: '按触发者指南、突破材料、Boss 材料和技能材料快速浏览无限大材料图鉴，适合先看资源需求和来源。',
    en: 'Browse the Ananta material wiki by trigger guides, ascension, boss, and skill materials to review resource needs and sources.',
    ja: 'トリガーガイド、突破素材、ボス素材、スキル素材でアナンタ素材図鑑を確認し、必要資源と入手先を把握できます。',
  },
  guihuan: {
    zh: '按使灵指南、突破材料、元素突破和 Boss 材料快速浏览归环材料图鉴，适合先看配装与培养路径。',
    en: 'Browse the Guihuan material wiki by spirit guides, ascension, element ascension, and boss materials to review build and progression paths.',
    ja: 'スピリットガイド、突破素材、元素昇格、ボス素材で帰環素材図鑑を確認し、ビルドと育成導線を把握できます。',
  },
  endfield: {
    zh: '按突破、技能、武器材料和装备套装浏览终末地 Pioneer Test 资料参考；升级需求、掉落和配方须在后续测试或正式版以官方信息复核。',
    en: 'Browse Pioneer Test Arknights: Endfield references for ascension, skill, weapon materials, and gear sets. Recheck upgrade needs, drops, and recipes against official future-test or release information.',
    ja: '突破、スキル、武器素材、装備セットでエンドフィールド Pioneer Test の資料参考を確認できます。強化需要、ドロップ、レシピは今後のテストまたは正式版の公式情報で再確認してください。',
  },
  sea: {
    zh: '按货币、船员突破、船只升级和制造材料快速浏览遗忘之海材料图鉴，适合先看开荒消耗和获取路线。',
    en: 'Browse the Sea of Remnants material wiki by currency, crew ascension, ship upgrades, and crafting to review early-game costs and routes.',
    ja: '通貨、クルー突破、船強化、製作素材で遺忘之海素材図鑑を確認し、序盤消費と入手ルートを把握できます。',
  },
  skjh: {
    zh: '按生存资源、组件、弹药、燃料和医疗补给快速浏览失控进化资源图鉴，适合先看开荒消耗和收集路线。',
    en: 'Browse the Ashfall Evolution resource wiki by survival items, components, ammo, fuel, and medical supplies to review early-game costs and collection routes.',
    ja: '生存資源、部品、弾薬、燃料、医療補給で失控進化資源図鑑を確認し、序盤消費と収集ルートを把握できます。',
  },
  'roco-cn': {
    zh: '按咕噜球、经验果、进化材料和货币代币快速浏览洛克王国材料图鉴，适合先看捕捉与培养的消耗和获取路线。',
    en: 'Browse the Roco Kingdom (CN) material wiki by Gulu Balls, EXP fruits, evolution materials, and currency tokens to review capture and training costs.',
    ja: 'グルーボール、経験値フルーツ、進化素材、通貨で洛克王国素材図鑑を確認し、捕獲と育成の消費を把握できます。',
  },
};

function getItemIntro(gameId: string, locale: SupportedLocale) {
  return ITEM_INTRO[gameId]?.[locale] ?? ITEM_INTRO.genshin?.[locale] ?? '';
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
  const categoryLabel = CATEGORY_LABELS.items?.[locale] ?? 'Items';
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/items`, LOCALES);

  const desc = ITEM_DESC[gameId]?.[locale] ?? `${gameName} ${categoryLabel} database with farming sources, upgrade materials, and drop locations`;
  const intro = ITEM_INTRO[gameId]?.[locale];

  const title = gameId === 'hi3'
    ? { zh: '崩坏3材料资料 — 源晶、以太燃素与圣痕自选', en: 'HI3 Materials — Source Prism, Ether Fuel & Stigma Selector', ja: '崩壊3rd素材資料 — 源晶・エーテル燃料・聖痕選択箱' }[locale]
    : gameId === 'genshin'
    ? locale === 'zh'
      ? '原神材料图鉴 — 突破材料、天赋书、Boss掉落与刷取路线'
      : locale === 'ja'
        ? '原神素材図鑑 — 突破素材、天賦本、ボス素材、周回'
        : 'Genshin Materials Wiki — Talent Books, Boss Drops & Farming Routes'
    : gameId === 'zzz'
    ? locale === 'zh'
      ? '绝区零材料图鉴 Wiki — 代理人突破、技能材料与刷取来源'
      : locale === 'ja'
        ? 'ZZZ素材Wiki — エージェント突破、スキル素材、周回'
        : 'ZZZ Materials Wiki — Agent Ascension, Skill Materials & Farming Sources'
    : locale === 'zh'
      ? `${gameName}材料图鉴 — 全材料Wiki、掉落来源与刷取路线`
      : locale === 'ja'
        ? `${gameName}素材図鑑 — Wiki、ドロップ場所、周回ルート`
        : `${gameName} Materials Wiki — Complete Drop Sources & Farming Guide`;

  const description = ensureMetaLength(intro ?? desc, locale);

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/items`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function ItemsPage({
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
      { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS.items?.[locale] ?? 'Items', item: `${BASE_URL}/${locale}/${gameId}/items` },
    ],
  };

  if (gameId === 'genshin') {
    const content = await GenshinItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'starrail') {
    const content = await StarRailItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'nte') {
    const content = await NteItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'wuwa') {
    const content = await WuWaItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'zzz') {
    const content = await ZzzItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'hi3') {
    const materials = await getItemListData(gameId, locale);
    const title = { zh: '崩坏3材料与奖励资料', en: 'Honkai Impact 3rd Materials and Rewards', ja: '崩壊3rd 素材・報酬資料' }[locale];
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-game-text">{title}</h1>
        <p className="mb-6 max-w-3xl text-sm leading-7 text-game-text-muted">{getItemIntro(gameId, locale)}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {materials.map((material) => (
            <Link key={material.id} href={`/hi3/items/${material.id}`} className="rounded-lg border border-game-border bg-game-surface p-5 transition-colors hover:border-game-primary focus-visible:outline-2 focus-visible:outline-game-primary">
              <h2 className="text-lg font-semibold text-game-text">{material.name}</h2>
              <p className="mt-3 text-sm leading-6 text-game-text-muted">{material.source}</p>
            </Link>
          ))}
        </div>
        <nav className="mt-8 flex flex-wrap gap-4 text-sm font-medium text-game-primary">
          <Link href="/hi3/version">{{ zh: '版本档案', en: 'Version archive', ja: 'バージョン資料' }[locale]}</Link>
          <Link href="/hi3/guides/v9-0-resource-returnee-checklist">{{ zh: '资源与回归核对', en: 'Resource and returnee checks', ja: '資源・復帰チェック' }[locale]}</Link>
        </nav>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </div>
    );
  }

  if (gameId === 'ananta') {
    const content = await AnantaItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'guihuan') {
    const content = await GuihuanItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'endfield') {
    const content = await EndfieldItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'sea') {
    const content = await SeaItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'skjh') {
    const content = await SkjhItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  if (gameId === 'roco-cn') {
    const content = await RocoCnItemsPage({ locale, gameId });
    return <>{content}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">Coming Soon</div>
      </div>
    </div>
  );
}

// --- Genshin Items ---

async function GenshinItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['character-ascension', 'talent-book', 'boss-drop', 'weekly-boss', 'local-specialty', 'common-drop', 'exp-material', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.genshin.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('genshin', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = GENSHIN_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Star Rail Items ---

const STARRAIL_TYPE_LABELS: Record<string, Record<string, string>> = {
  'character-ascension': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  'trace': { zh: '行迹材料', en: 'Trace Material', ja: '軌跡素材' },
  'boss': { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  'common': { zh: '普通材料', en: 'Common Material', ja: '一般素材' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  'exp-material': { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
};

async function StarRailItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['character-ascension', 'trace', 'boss', 'common', 'exp-material', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.starrail.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('starrail', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = STARRAIL_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- NTE Items ---

async function NteItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['guide', 'arc-exp', 'module-exp', 'ascension', 'boss', 'manual', 'permit', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.nte.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('nte', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = NTE_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Wuthering Waves Items ---

const WUWA_TYPE_LABELS: Record<string, Record<string, string>> = {
  'common-drop': { zh: '普通掉落', en: 'Common Drop', ja: '一般ドロップ' },
  'skill-material': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'boss-material': { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  'weekly-boss': { zh: '周本材料', en: 'Weekly Boss', ja: '週ボス素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
};

async function WuWaItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['common-drop', 'skill-material', 'boss-material', 'weekly-boss', 'local-specialty', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.wuwa.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('wuwa', locale)}
      </p>

      <section className="mb-8 border border-game-border bg-game-surface p-4">
        <h2 className="text-lg font-semibold text-game-text">
          {locale === 'zh' ? '3.7 材料规划顺序' : locale === 'ja' ? 'Ver.3.7 素材計画の順番' : 'v3.7 material-planning order'}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-game-text-muted">
          {locale === 'zh'
            ? '先在游戏内确认当前活动、唤取目标和本周限制，再为一支能推进内容的队伍刷角色突破、武器和关键技能材料；声骸副词条留到基础养成完成后。'
            : locale === 'ja'
              ? 'ゲーム内で現在のイベント、集音目標、週制限を確認してから、コンテンツを進める1編成のキャラ突破、武器、重要スキル素材を優先します。エコー副ステは基礎育成後です。'
              : 'Confirm live events, Convene targets, and weekly limits in-game first. Then farm character ascension, weapon, and key-skill materials for one team that can progress content; leave Echo substats until baseline upgrades are complete.'}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link href="/wuwa/map" className="border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{locale === 'zh' ? '梦枢天罗地图' : locale === 'ja' ? '夢枢天羅マップ' : 'Simulacrum Nexus map'}</span>
            <span className="mt-1 block text-xs leading-5 text-game-text-muted">{locale === 'zh' ? '查看区域解锁、无音区和探索提示。' : locale === 'ja' ? 'エリア解放、無音区、探索ヒントを確認。' : 'Check region access, Tacet Fields, and exploration notes.'}</span>
          </Link>
          <Link href="/wuwa/events" className="border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{locale === 'zh' ? '活动看板' : locale === 'ja' ? 'イベントボード' : 'Event board'}</span>
            <span className="mt-1 block text-xs leading-5 text-game-text-muted">{locale === 'zh' ? '先核对本服时间、前置条件与奖励。' : locale === 'ja' ? 'サーバー時刻、前提条件、報酬を先に確認。' : 'Verify server timing, prerequisites, and rewards first.'}</span>
          </Link>
          <Link href="/wuwa/artifacts" className="border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{locale === 'zh' ? '3.7 声骸合鸣' : locale === 'ja' ? 'Ver.3.7 エコーセット' : 'v3.7 Echo sets'}</span>
            <span className="mt-1 block text-xs leading-5 text-game-text-muted">{locale === 'zh' ? '基础材料完成后，再核对新套装与主词条。' : locale === 'ja' ? '基礎素材後に新セットとメインステを確認。' : 'Review new sets and main stats after core materials.'}</span>
          </Link>
        </div>
      </section>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = WUWA_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function groupByType<T extends { type: string }>(arr: T[]): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    (acc[item.type] ??= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// --- ZZZ Items ---

const ZZZ_TYPE_LABELS: Record<string, Record<string, string>> = {
  '突破材料': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  '技能材料': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  '特殊材料': { zh: '特殊材料', en: 'Special Material', ja: '特殊素材' },
  '通用货币': { zh: '货币', en: 'Currency', ja: '通貨' },
  '抽卡道具': { zh: '抽卡道具', en: 'Gacha Item', ja: 'ガチャアイテム' },
};

async function ZzzItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['突破材料', '技能材料', '特殊材料', '通用货币', '抽卡道具'];
  const links = [
    {
      href: '/zzz/characters',
      title: locale === 'zh' ? '按代理人反查材料' : locale === 'ja' ? 'エージェントから素材確認' : 'Browse Agents',
      description: locale === 'zh' ? '先确定要养谁，再看突破和技能材料。' : locale === 'ja' ? '育成対象を決めてから素材を確認。' : 'Choose the agent first, then review ascension and skill mats.',
    },
    {
      href: '/zzz/teams',
      title: locale === 'zh' ? '配队后再分配资源' : locale === 'ja' ? '編成後に素材配分' : 'Plan Team Upgrades',
      description: locale === 'zh' ? '把主 C、击破、异常和支援的材料优先级分开。' : locale === 'ja' ? '火力、撃破、異常、支援で優先度を分ける。' : 'Split material priority by DPS, Stun, Anomaly, and Support roles.',
    },
    {
      href: '/zzz/guides/drive-disc-guide',
      title: locale === 'zh' ? '同步看驱动盘' : locale === 'ja' ? 'ドライブも確認' : 'Check Drive Discs',
      description: locale === 'zh' ? '角色等级、技能和驱动盘要一起规划。' : locale === 'ja' ? 'レベル、スキル、ドライブを一緒に計画。' : 'Plan levels, skills, and Drive Discs together.',
    },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.zzz.theme.primary }}>
        {locale === 'zh' ? '绝区零材料图鉴 Wiki' : locale === 'ja' ? 'ZZZ素材Wiki' : 'ZZZ Materials Wiki'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${materials.length} 种材料，覆盖代理人突破、技能升级、特殊材料、货币和抽卡道具。`
          : locale === 'ja'
            ? `${materials.length} 種の素材。突破、スキル、特殊素材、通貨、ガチャアイテムを整理。`
            : `${materials.length} materials covering agent ascension, skills, special mats, currency, and gacha items.`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('zzz', locale)}
      </p>
      <section className="mb-6 grid gap-2 md:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href as '/'} className="rounded-md border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
            <span className="mb-1 block text-sm font-semibold text-game-text">{link.title}</span>
            <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description}</span>
          </Link>
        ))}
      </section>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = ZZZ_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Ananta Items ---

const ANANTA_TYPE_LABELS: Record<string, Record<string, string>> = {
  guide: { zh: '触发者指南', en: 'Trigger Guide', ja: 'トリガーガイド' },
  'chaos-exp': { zh: '混沌经验', en: 'Chaos EXP', ja: 'カオスEXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  'boss-material': { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  'skill-material': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
};

async function AnantaItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['guide', 'chaos-exp', 'ascension', 'boss-material', 'skill-material', 'local-specialty', 'permit', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.ananta.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('ananta', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = ANANTA_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Guihuan Items ---

const GUIHUAN_TYPE_LABELS: Record<string, Record<string, string>> = {
  guide: { zh: '使灵指南', en: 'Spirit Guide', ja: 'スピリットガイド' },
  'spirit-exp': { zh: '使灵经验', en: 'Spirit EXP', ja: 'スピリットEXP' },
  'weapon-exp': { zh: '武器经验', en: 'Weapon EXP', ja: '武器EXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  'element-ascension': { zh: '元素突破', en: 'Element Ascension', ja: '元素昇格' },
  rare: { zh: '稀有材料', en: 'Rare Material', ja: 'レア素材' },
  boss: { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  skill: { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
};

async function GuihuanItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['guide', 'spirit-exp', 'weapon-exp', 'ascension', 'element-ascension', 'rare', 'boss', 'skill', 'local-specialty', 'currency', 'permit'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.guihuan.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('guihuan', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = GUIHUAN_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Endfield Items ---

const ENDFIELD_TYPE_LABELS: Record<string, Record<string, string>> = {
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  skill: { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  weapon: { zh: '武器材料', en: 'Weapon Material', ja: '武器素材' },
  exp: { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  gacha: { zh: '抽卡道具', en: 'Gacha Item', ja: 'ガチャアイテム' },
};

async function EndfieldItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const gearSets = await getEndfieldGearSetListData(locale);
  const grouped = groupByType(materials);
  const typeOrder = ['ascension', 'skill', 'weapon', 'exp', 'currency', 'gacha'];

  const TIER_COLORS: Record<string, string> = { SS: '#ef4444', S: '#f59e0b', A: '#3b82f6', B: '#6b7280' };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.endfield.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料，${gearSets.length} 套装备` : locale === 'ja' ? `${materials.length} 種の素材、${gearSets.length} ギアセット` : `${materials.length} Materials, ${gearSets.length} Gear Sets`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('endfield', locale)}
      </p>
      <div className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-game-text-muted">
        <strong className="mr-1 text-game-text">{locale === 'zh' ? '资料状态' : locale === 'ja' ? 'データ状態' : 'Data status'}:</strong>
        {locale === 'zh'
          ? '材料、装备套装、来源与推荐来自 Pioneer Test 资料快照；未来测试与正式版的掉落、配方、成本和解锁条件仅以官方公告为准。'
          : locale === 'ja'
            ? '素材、ギアセット、入手先、推奨は Pioneer Test 資料のスナップショットです。今後のテストと正式版のドロップ、レシピ、コスト、解放条件は公式発表のみを基準にしてください。'
            : 'Materials, gear sets, sources, and recommendations are Pioneer Test snapshots. Use official announcements only for future-test and release drops, recipes, costs, and unlock requirements.'}
      </div>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = ENDFIELD_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <div key={mat.id} className="block rounded-lg border border-game-border bg-game-surface p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Gear Sets */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '装备套装' : locale === 'ja' ? 'ギアセット' : 'Gear Sets'} ({gearSets.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gearSets.map((set) => (
            <div key={set.id} className="rounded-lg border border-game-border bg-game-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-game-text">{set.name}</h3>
                <span className="text-xs font-bold" style={{ color: TIER_COLORS[set.tierRank] || '#888' }}>{set.tierRank}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded bg-game-surface-alt px-2 py-0.5 text-[11px] text-game-text-muted">{set.mainStat}</span>
                <span className="text-xs" style={{ color: RARITY_COLORS[set.rarity] || '#888' }}>{'★'.repeat(set.rarity)}</span>
              </div>
              <p className="text-xs leading-relaxed text-game-text-muted">{set.effect}</p>
              {set.recommendedFor.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {set.recommendedFor.map((cls) => (
                    <span key={cls} className="rounded bg-game-primary/10 px-1.5 py-0.5 text-[10px] text-game-primary">{cls}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <NextStepStrip locale={locale} links={ENDFIELD_ITEM_NEXT_STEPS} />
    </div>
  );
}

// --- Sea of Remnants Items ---

const SEA_TYPE_LABELS: Record<string, Record<string, string>> = {
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  'character-ascension': { zh: '船员突破材料', en: 'Crew Ascension', ja: 'クルー突破素材' },
  'ship-upgrade': { zh: '船只升级材料', en: 'Ship Upgrade', ja: '船強化素材' },
  craft: { zh: '制造材料', en: 'Crafting', ja: '製作素材' },
  consumable: { zh: '消耗品', en: 'Consumable', ja: '消耗品' },
  fragment: { zh: '碎片 / 记忆', en: 'Fragment / Memory', ja: '欠片 / 記憶' },
};

const SKJH_TYPE_LABELS: Record<string, Record<string, string>> = {
  resource: { zh: '生存资源', en: 'Survival Resource', ja: '生存資源' },
  component: { zh: '组件材料', en: 'Component', ja: '部品素材' },
  ammo: { zh: '弹药爆破', en: 'Ammo / Explosive', ja: '弾薬・爆破' },
  fuel: { zh: '燃料能源', en: 'Fuel / Energy', ja: '燃料・エネルギー' },
  medical: { zh: '医疗补给', en: 'Medical Supply', ja: '医療補給' },
  base: { zh: '基地设施', en: 'Base Facility', ja: '拠点設備' },
  equipment: { zh: '生存装备', en: 'Survival Gear', ja: '生存装備' },
  gene: { zh: '基因素材', en: 'Gene Material', ja: '遺伝子素材' },
  reward: { zh: '福利奖励', en: 'Reward', ja: '報酬' },
};

async function SkjhItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['resource', 'component', 'ammo', 'fuel', 'medical', 'base', 'equipment', 'gene', 'reward'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.skjh.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种资源道具` : locale === 'ja' ? `${materials.length} 種の資源・アイテム` : `${materials.length} resources and items`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('skjh', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = SKJH_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

async function SeaItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['currency', 'character-ascension', 'ship-upgrade', 'craft', 'consumable', 'fragment'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.sea.theme.primary }}>
        {CATEGORY_LABELS.items?.[locale] ?? 'Items'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料` : locale === 'ja' ? `${materials.length} 種の素材` : `${materials.length} Materials`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('sea', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = SEA_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Roco Kingdom (CN) Items ---

const ROCO_CN_TYPE_LABELS: Record<string, Record<string, string>> = {
  capture: { zh: '咕噜球', en: 'Gulu Ball', ja: 'グルーボール' },
  exp: { zh: '经验果', en: 'EXP Fruit', ja: '経験値フルーツ' },
  evolution: { zh: '进化材料', en: 'Evolution Material', ja: '進化素材' },
  currency: { zh: '货币 / 代币', en: 'Currency / Token', ja: '通貨・トークン' },
};

async function RocoCnItemsPage({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const materials = await getItemListData(gameId as GameId, locale);
  const grouped = groupByType(materials);
  const typeOrder = ['capture', 'exp', 'evolution', 'currency'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES['roco-cn'].theme.primary }}>
        {locale === 'zh' ? '洛克王国材料图鉴' : locale === 'ja' ? '洛克王国素材図鑑' : 'Roco Kingdom Materials'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${materials.length} 种材料道具` : locale === 'ja' ? `${materials.length} 種の素材・アイテム` : `${materials.length} materials and items`}
      </p>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {getItemIntro('roco-cn', locale)}
      </p>

      {typeOrder.map((type) => {
        const list = grouped[type];
        if (!list || list.length === 0) return null;
        const typeLabel = ROCO_CN_TYPE_LABELS[type]?.[locale] ?? type;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{typeLabel} ({list.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {list.map((mat) => (
                <Link key={mat.id} href={`/${gameId}/items/${mat.id}`} className="block rounded-lg border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-game-text">{mat.name}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-game-text-muted">{typeLabel}</span>
                    <span className="text-xs" style={{ color: RARITY_COLORS[mat.rarity] || '#888' }}>{'★'.repeat(mat.rarity)}</span>
                  </div>
                  <p className="text-xs text-game-text-muted line-clamp-2">{mat.source}</p>
                </Link>
              ))}
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
              {link.label[locale]}
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
