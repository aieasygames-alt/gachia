import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import dynamic from 'next/dynamic';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import { getTierListGroups } from '@/lib/game-data/tier-lists';
import type { TierListGroup } from '@/lib/game-data/tier-lists';
import { notFound } from 'next/navigation';
import { rocoPublicReviewMetadata } from '@/lib/roco-public-review';
import { RocoPublicReviewPage } from '@/components/wiki/roco-public-review-page';

const BASE_URL = 'https://gachia.com';

const TIER_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神角色强度参考，按深渊、大世界与队伍依赖整理 SS 至 B 分级。结构化数据最后更新于 2026-06-28，抽卡或养成前请核对当前版本与配队条件。', en: 'Genshin Impact character tier reference with SS to B groups for Spiral Abyss, overworld, and team dependence. Structured data was last updated on 2026-06-28; verify current patch and teams before investing.', ja: '原神キャラ評価の参考。深境螺旋、大世界、編成依存をSSからBで整理。構造化データは2026-06-28更新のため、育成前に現行版本と編成条件を確認してください。' },
  starrail: { zh: '崩坏：星穹铁道角色强度参考，按忘却之庭、虚构叙事、末日幻影与队伍依赖解读。查看更新时间和配队条件后，再决定培养或抽取。', en: 'Honkai: Star Rail character tier reference with Memory of Chaos, Pure Fiction, Apocalyptic Shadow, and team-dependence context. Check the data date and team conditions before investing.', ja: '崩壊：スターレイルのキャラ評価参考。忘却の庭、虚構叙事、末日幻影、編成依存を整理し、更新日と条件を確認してから育成を判断します。' },
  wuwa: { zh: '2026年鸣潮角色强度排行，覆盖全角色综合评级、SS/S/A/B分级、主流玩法与培养优先级，帮助你把资源投到最值得的角色上。', en: 'Wuthering Waves character tier list (2026) with SS to B rankings for endgame and exploration value, plus build priority and team context.', ja: '2026年鳴潮キャラTierリスト。全キャラの総合評価、SS/S/A/B分類、育成優先度、編成参考を掲載。' },
  nte: { zh: '异环角色强度排行，覆盖SS/S+/A+/A/B分级、场景表现和推荐优先级，帮助你在抽卡与养成前快速判断角色价值。', en: 'Neverness to Everness character tier list (2026) with SS to B rankings, content performance, and investment priority for pull planning.', ja: '異環キャラTierリスト。SS/S+/A+/A/B評価、場面別性能、育成優先度を整理しています。' },
  zzz: { zh: '2026年绝区零代理人强度排行，覆盖SS/S/A/B分级、深渊与高难表现、配队定位和每月更新，方便你按版本答案选人。', en: 'Zenless Zone Zero agent tier list (2026) with SS to B rankings for Shiyu Defense and other endgame modes, plus role and team context.', ja: '2026年ゼンレスゾーンゼロTierリスト。SS/S/A/B評価、深層評価、編成参考、毎月更新を掲載。' },
  guihuan: { zh: '归环使灵强度排行，覆盖SS/S/A/B分级、场景表现、配队定位和培养优先级，帮助你更快决定先养谁。', en: 'Guihuan spirit tier list (2026) with SS to B rankings, performance notes, and priority guidance so you know which spirits to build first.', ja: '帰環スピリットTierリスト。SS/S/A/B評価、場面別性能、育成優先度をまとめています。' },
  ananta: { zh: '无限大异能者强度排行，覆盖SS/S/A/B分级、玩法表现和培养优先级，方便你在开服阶段快速选出主力角色。', en: 'Ananta esper tier list (2026) with SS to B rankings, gameplay notes, and investment priority to help you pick early-game mains.', ja: 'アナンタTierリスト。SS/S/A/B評価、性能メモ、育成優先度を整理しています。' },
  endfield: { zh: '明日方舟：终末地 Pioneer Test 干员强度参考，覆盖测试期 SS/S/A/B 分级、战斗定位与配队思路。结构化评级最后更新于 2026-06-06，下一轮测试或正式版前请勿当作当前版本结论。', en: 'Arknights: Endfield Pioneer Test operator tier reference with SS to B test-period rankings, combat roles, and team context. Structured ratings were last updated on 2026-06-06 and are not current-release conclusions.', ja: 'エンドフィールド Pioneer Testのオペレーター評価参考。テスト期のSS/S/A/B、戦闘役割、編成方針を整理。構造化評価の最終更新は2026-06-06で、次回テスト・正式版前の現行結論ではありません。' },
  sea: { zh: '遗忘之海角色强度排行 Wiki，覆盖 Traveler、Ais、Little Axe、Princess、Molly 等角色 SS/S/A/B 分级、开荒价值、配队定位和培养优先级。', en: 'Sea of Remnants character tier list wiki with SS to B rankings for Traveler, Ais, Little Axe, Princess, Molly, early-game value, team roles, and investment priority.', ja: 'Sea of RemnantsキャラTierリスト。Traveler、Ais、Little Axe、Princess、MollyのSS/S/A/B評価、序盤価値、育成優先度を整理。' },
  'roco-cn': { zh: '洛克王国：世界国服精灵强度节奏榜，基于社区 PVP 天梯与 PVE 综合表现整理 SS/S/A/B 分级，覆盖迪莫、罗隐、优光绒绒、圣水守护等主流精灵，帮助你把资源投到最值得培养的主力上。', en: 'Roco Kingdom: World CN sprite tier list with SS to B rankings from community PVP ladders and PVE performance, covering Dimo, Luoyin, Youguang Rongrong, Shengshui Shouhu and other top sprites for smarter build priority.', ja: 'ロコ・キングダム：ワールド中国版スプライトTierリスト。社区PVPラダーとPVE性能からSS/S/A/B評価、ディモ、ロウイン、ユウコウロンロン、シェンシュイショウゴなど主力スプライトを掲載。' },
};

// P1-2: Lazy load tier list client components to reduce initial bundle size
const GenshinTierListClient = dynamic(() => import('./genshin-tier-client').then(mod => ({ default: mod.GenshinTierListClient })), {
  loading: () => <div className="p-8 text-center">Loading tier list...</div>
});

const StarRailTierListClient = dynamic(() => import('./starrail-tier-client').then(mod => ({ default: mod.StarRailTierListClient })), {
  loading: () => <div className="p-8 text-center">Loading tier list...</div>
});

const WuWaTierListClient = dynamic(() => import('./wuwa-tier-client').then(mod => ({ default: mod.WuWaTierListClient })), {
  loading: () => <div className="p-8 text-center">Loading tier list...</div>
});

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  SS: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/30' },
  'S+': { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  S: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/30' },
  'A+': { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/30' },
  A: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/30' },
  B: { bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-500/30' },
  C: { bg: 'bg-gray-800/30', text: 'text-gray-500', border: 'border-gray-600/30' },
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
  if (gameId === 'roco') return rocoPublicReviewMetadata('tier-list', locale);
  const categoryLabel = CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List';
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/tier-list`, LOCALES);

  const desc = TIER_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName} Wiki`;
  const title = gameId === 'sea'
    ? locale === 'zh'
      ? '遗忘之海角色强度排行 Wiki — 最佳角色、开荒推荐与培养优先级'
      : locale === 'ja'
        ? 'Sea of Remnants Tier List — おすすめキャラ、序盤、育成'
        : 'Sea of Remnants Tier List — Best Characters, Early Picks & Team Roles'
    : locale === 'zh'
      ? `${gameName}角色强度排行 — SS/S/A/B分级 | 攻略`
      : locale === 'ja'
        ? `${gameName}キャラTierリスト 2026 — SS/S/A/B評価`
      : gameId === 'genshin' || gameId === 'starrail'
        ? `${gameName} Character Tier Reference — Roles, Teams & Data Date`
        : `${gameName} Character Tier List 2026 — Best Characters SS/S/A/B Ranked`;

  const description = ensureMetaLength(
    desc,
    locale,
  );

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/tier-list`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function TierListPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId === 'genshin') {
    return (
      <div>
        <TierDataNotice gameId="genshin" locale={locale} />
        <GenshinTierListClient locale={locale} />
      </div>
    );
  }

  if (gameId === 'starrail') {
    return (
      <div>
        <TierDataNotice gameId="starrail" locale={locale} />
        <StarRailTierListClient locale={locale} />
      </div>
    );
  }

  if (gameId === 'nte') {
    return <GenericTierListPage gameId="nte" locale={locale} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaTierListClient locale={locale} />;
  }

  if (gameId === 'zzz') {
    return <GenericTierListPage gameId="zzz" locale={locale} />;
  }

  if (gameId === 'ananta') {
    return <GenericTierListPage gameId="ananta" locale={locale} />;
  }

  if (gameId === 'guihuan') {
    return <GenericTierListPage gameId="guihuan" locale={locale} />;
  }

  if (gameId === 'endfield') {
    return <><EndfieldTierDataNotice locale={locale} /><GenericTierListPage gameId="endfield" locale={locale} /></>;
  }

  if (gameId === 'sea') {
    return <GenericTierListPage gameId="sea" locale={locale} />;
  }

  if (gameId === 'roco-cn') {
    return <GenericTierListPage gameId="roco-cn" locale={locale} />;
  }

  if (gameId === 'roco') {
    return <RocoPublicReviewPage route="tier-list" locale={locale} />;
  }

  notFound();
}

function TierDataNotice({ gameId, locale }: { gameId: 'genshin' | 'starrail'; locale: SupportedLocale }) {
  const gameName = gameId === 'genshin' ? '原神' : '崩坏：星穹铁道';
  const copy = locale === 'zh'
    ? `${gameName}当前结构化评级数据最后更新于 2026-06-28。它适合作为角色定位和旧队伍参考，但不应替代当前版本的卡池、敌人环境或实战配队判断。`
    : locale === 'ja'
      ? '現在の構造化評価データの最終更新日は2026-06-28です。役割や旧編成の参考には使えますが、現行バナー、敵編成、実戦の編成判断の代わりにはなりません。'
      : 'The structured rating data was last updated on 2026-06-28. Use it for role and legacy-team reference, not as a substitute for current banners, enemy rotations, or live team decisions.';

  return (
    <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-game-text-muted">
      {copy}
    </p>
  );
}

function EndfieldTierDataNotice({ locale }: { locale: SupportedLocale }) {
  const copy = locale === 'zh'
    ? '终末地结构化 Tier 数据是 Pioneer Test 快照，最后更新于 2026-06-06。它适合回看测试期定位、队伍职责与已有干员培养思路；下一轮测试或正式版公布后，请以官方数值、系统和环境为准重新判断。'
    : locale === 'ja'
      ? 'エンドフィールドの構造化TierデータはPioneer Testのスナップショットで、最終更新は2026-06-06です。テスト期の役割、編成分担、所持オペレーター育成の参考には使えますが、次回テスト・正式版後は公式数値、システム、環境で再判断してください。'
      : 'Endfield structured tier data is a Pioneer Test snapshot last updated on 2026-06-06. Use it for test-period roles, team duties, and owned-operator planning; reassess against official numbers, systems, and content when another test or release arrives.';

  return (
    <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-game-text-muted">
      {copy}
    </p>
  );
}

const ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
  spark: '#f59e0b', surge: '#3b82f6', bloom: '#4ade80', void: '#ec4899',
  radiance: '#fbbf24', frost: '#67e8f9', flame: '#ef4444', gale: '#6ee7b7', thunder: '#8b5cf6',
  heat: '#ef4444', cryo: '#67e8f9', nature: '#4ade80',
  str: '#ef4444', agi: '#22c55e', con: '#f97316', int: '#8b5cf6', per: '#3b82f6', cha: '#ec4899',
  grass: '#4ade80', water: '#38bdf8', normal: '#a3a3a3',
  poison: '#a78bfa', ground: '#d97706', flying: '#93c5fd', bug: '#84cc16', light: '#fde047', dark: '#64748b',
  dragon: '#7c3aed', steel: '#94a3b8', psychic: '#f472b6', fairy: '#f9a8d4',
};

async function GenericTierListPage({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  const groups = await getTierListGroups(gameId, locale);
  const intro = getTierIntro(gameId, locale);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES[gameId].theme.primary }}>
        {getTierTitle(gameId, locale)}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">{intro}</p>
      <details className="mb-6 rounded-md border border-game-border bg-game-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-game-text">
          {locale === 'zh' ? '评级方法与使用边界' : locale === 'ja' ? '評価方法と利用上の注意' : 'How to read this tier list'}
        </summary>
        <div className="mt-3 grid gap-3 text-sm leading-relaxed text-game-text-muted md:grid-cols-2">
          <p>{locale === 'zh' ? '评级综合考虑终局模式、日常体验、队伍协同、养成成本和操作门槛；同一角色在不同模式中的价值可能不同。' : locale === 'ja' ? '評価はエンドコンテンツ、日常性、編成相性、育成コスト、操作難度を総合します。モードにより価値は変わります。' : 'Ratings combine endgame performance, everyday value, team synergy, investment cost, and execution requirements. A character can change value by mode.'}</p>
          <p>{locale === 'zh' ? '这是版本参考，不是永久排名。抽卡前请先查看当前版本、队伍缺口、角色页的配装与替代方案。' : locale === 'ja' ? 'これはバージョン時点の参考です。引く前に現在版本、編成不足、キャラページのビルドと代替を確認してください。' : 'This is a patch snapshot, not a permanent ranking. Check the current patch, roster gaps, builds, and alternatives before pulling.'}</p>
        </div>
      </details>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-game-border bg-game-surface px-4 py-3 text-sm">
        <span className="text-game-text-muted">{locale === 'zh' ? '按队伍验证评级：' : locale === 'ja' ? '編成で評価を確認：' : 'Validate ratings with your roster:'}</span>
        <Link href={`/${gameId}/teams` as '/'} className="font-semibold text-game-primary hover:text-game-accent">
          {locale === 'zh' ? '打开 Team Builder →' : locale === 'ja' ? 'Team Builderを開く →' : 'Open Team Builder →'}
        </Link>
        <span className="text-xs text-game-text-muted">{locale === 'zh' ? '按版本和队伍定位决定培养优先级。' : locale === 'ja' ? 'バージョンと役割で育成優先度を決定。' : 'Prioritize by patch context and team role.'}</span>
      </div>
      {gameId === 'sea' && <SeaQuickLinks locale={locale} />}
      <TierGroups groups={groups} />
    </div>
  );
}

function getTierTitle(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'sea') {
    return locale === 'zh' ? '遗忘之海角色强度排行 Wiki' : 'Sea of Remnants Tier List';
  }
  return CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List';
}

function getTierIntro(gameId: GameId, locale: SupportedLocale) {
  const gameSpecific: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
    genshin: {
      zh: '按深境螺旋、大世界、队伍协同和养成成本综合评估原神角色；评级是版本参考，抽卡前请结合命座、武器和已有队伍判断。',
      en: 'Genshin ratings combine Spiral Abyss, overworld value, team synergy, and investment cost. Use the patch snapshot with your constellations, weapons, and existing roster.',
      ja: '深境螺旋、大世界、編成相性、育成コストで原神キャラを評価。命ノ星座、武器、手持ちと合わせて判断してください。',
    },
    starrail: {
      zh: '按忘却之庭、虚构叙事、末日幻影、日常自动战斗和队伍绑定综合评估崩铁角色；不同模式的最优解可能不同。',
      en: 'HSR ratings combine Memory of Chaos, Pure Fiction, Apocalyptic Shadow, auto-battle value, and team dependence. The best pick can change by mode.',
      ja: '忘却の庭、虚構叙事、末日幻影、周回性能、編成依存度で評価。モードごとに最適解は異なります。',
    },
    wuwa: {
      zh: '按终局战斗、探索、声骸成本、操作门槛和协同能力综合评估鸣潮角色；请同时查看武器与声骸路线。',
      en: 'WuWa ratings combine endgame combat, exploration, Echo cost, execution difficulty, and coordination. Check the weapon and Echo route before investing.',
      ja: '終盤戦、探索、音骸コスト、操作難度、協力性能で鳴潮キャラを評価。武器と音骸ルートも確認してください。',
    },
    zzz: {
      zh: '按式舆防卫、日常战斗、强攻/击破/异常/支援定位、队伍循环和驱动盘成本综合评估绝区零代理人。',
      en: 'ZZZ ratings combine Shiyu Defense, everyday combat, Attack/Stun/Anomaly/Support roles, team rotations, and Drive Disc cost.',
      ja: '式輿防衛、日常戦闘、強攻/撃破/異常/支援の役割、編成ローテーション、ドライブコストで評価します。',
    },
    endfield: {
      zh: '本榜是 Pioneer Test 的结构化快照，不是正式版或下一轮测试的实时强度表。先把分级当作职业和队伍职责参考，再结合已有干员、武器与官方更新决定培养。',
      en: 'This list is a Pioneer Test structured snapshot, not a live tier table for a release or future test. Use ranks as role and team-duty reference, then decide investment from owned operators, weapons, and official updates.',
      ja: 'この一覧はPioneer Testの構造化スナップショットで、正式版や次回テストのリアルタイムTierではありません。職分・編成役割の参考に留め、所持オペレーター、武器、公式更新で育成を決めてください。',
    },
  };
  if (gameSpecific[gameId]) return gameSpecific[gameId]![locale];
  if (gameId === 'sea') {
    return locale === 'zh'
      ? '遗忘之海角色强度排行按 SS/S/A/B 分级整理，适合先判断 Traveler、Ais、Little Axe、Princess、Molly 等角色的开荒价值、队伍分工和培养优先级。'
      : locale === 'ja'
        ? 'Sea of RemnantsのキャラTierをSS/S/A/Bで整理。Traveler、Ais、Little Axe、Princess、Mollyなどの序盤価値、役割、育成優先度を確認できます。'
        : 'Sea of Remnants tier list ranks characters from SS to B so you can compare Traveler, Ais, Little Axe, Princess, Molly, early-game value, team roles, and investment priority.';
  }
  if (gameId === 'roco-cn') {
    return locale === 'zh'
      ? '国服精灵节奏榜按 SS/S/A/B 分级整理，综合社区 PVP 天梯与 PVE 表现。先锁定迪莫、罗隐、优光绒绒、圣水守护等 T0/T1 主力，再决定进化与资源投入方向。'
      : locale === 'ja'
        ? '中国版スプライトTierをSS/S/A/Bで整理。社区PVPラダーとPVE性能を総合。ディモ、ロウイン、ユウコウロンロン、シェンシュイショウゴなどのT0/T1主力を先に確保し、進化と育成方針を決めましょう。'
        : 'Roco Kingdom: World CN tier list ranks sprites from SS to B using community PVP ladders and PVE performance. Lock in T0/T1 mains like Dimo, Luoyin, Youguang Rongrong, and Shengshui Shouhu first, then plan evolutions and resource investment.';
  }
  return locale === 'zh'
    ? '基于角色综合强度评级，仅供参考'
    : locale === 'ja'
      ? 'キャラクターの総合的な強さに基づく評価です'
      : 'Based on overall character strength, for reference only';
}

function SeaQuickLinks({ locale }: { locale: SupportedLocale }) {
  const links = [
    {
      href: '/sea/characters',
      title: locale === 'zh' ? '查看全角色图鉴' : locale === 'ja' ? '全キャラ図鑑を見る' : 'Open Characters Wiki',
      description: locale === 'zh' ? '看角色属性、定位、技能和相关角色。' : locale === 'ja' ? '属性、役割、スキル、関連キャラを確認。' : 'Review attributes, roles, skills, and related characters.',
    },
    {
      href: '/sea/guides/molly-starter-team-guide',
      title: locale === 'zh' ? '开荒队伍推荐' : locale === 'ja' ? '序盤チームおすすめ' : 'Starter Team Guide',
      description: locale === 'zh' ? '把治疗、主攻和资源路线连起来。' : locale === 'ja' ? '回復、火力、資源ルートをつなぐ。' : 'Connect healing, DPS, and resource routing.',
    },
    {
      href: '/sea/calculator',
      title: locale === 'zh' ? '黑券与资源工具' : locale === 'ja' ? '黒券と資源ツール' : 'Selector and Resource Tools',
      description: locale === 'zh' ? '用工具决定自选、好金砖和首周资源。' : locale === 'ja' ? '黒券、好金砖、初週資源を計算。' : 'Plan selectors, Good Gold Bricks, and week-one resources.',
    },
  ];

  return (
    <section className="mb-6 grid gap-2 md:grid-cols-3">
      {links.map((link) => (
        <Link key={link.href} href={link.href as '/'} className="rounded-md border border-game-border bg-game-surface p-3 transition-colors hover:border-game-primary">
          <span className="mb-1 block text-sm font-semibold text-game-text">{link.title}</span>
          <span className="line-clamp-2 text-xs leading-relaxed text-game-text-muted">{link.description}</span>
        </Link>
      ))}
    </section>
  );
}

function TierGroups({ groups }: { groups: TierListGroup[] }) {
  return (
    <>
      {groups.map((group) => {
        const style = TIER_STYLES[group.tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={group.tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{group.tier}</span>
              <span className="text-sm text-game-text-muted">({group.characters.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {group.characters.map((char) => (
                <Link key={char.id} href={char.href as '/'}
                  className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                    <CharacterAvatar src={char.imageUrl} alt={char.name} element={char.element} className="h-full w-full object-cover object-top" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{char.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ELEMENT_COLORS[char.element] || '#888' }} />
                      <span>{char.role}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
