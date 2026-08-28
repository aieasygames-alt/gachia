import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import dynamic from 'next/dynamic';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import { getTierListGroups } from '@/lib/game-data/tier-lists';
import type { TierListGroup } from '@/lib/game-data/tier-lists';

const BASE_URL = 'https://gachia.com';

const TIER_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '2026年原神角色强度排行，覆盖深渊与大世界综合评级，提供SS/S/A/B分级、主流配队参考和每月更新的培养优先级建议。', en: 'Genshin Impact character tier list (2026) with SS to B rankings for Spiral Abyss and overworld, plus team context, build priority, and monthly updates.', ja: '2026年原神キャラTierリスト。深境螺旋と大世界の総合評価、SS/S/A/B分類、編成参考、毎月更新を掲載。' },
  starrail: { zh: '2026年崩坏：星穹铁道角色强度排行，覆盖忘却之庭、虚构叙事与末日幻影综合评级，提供分级、队伍思路和月度更新。', en: 'Honkai: Star Rail character tier list (2026) with SS to B rankings for Forgotten Hall, Pure Fiction, and endgame content, plus team and build guidance.', ja: '2026年スターレイルキャラTierリスト。忘却の庭、虚構叙事、末日幻影の評価、編成参考、毎月更新をまとめています。' },
  wuwa: { zh: '2026年鸣潮角色强度排行，覆盖全角色综合评级、SS/S/A/B分级、主流玩法与培养优先级，帮助你把资源投到最值得的角色上。', en: 'Wuthering Waves character tier list (2026) with SS to B rankings for endgame and exploration value, plus build priority and team context.', ja: '2026年鳴潮キャラTierリスト。全キャラの総合評価、SS/S/A/B分類、育成優先度、編成参考を掲載。' },
  nte: { zh: '异环角色强度排行，覆盖SS/S+/A+/A/B分级、场景表现和推荐优先级，帮助你在抽卡与养成前快速判断角色价值。', en: 'Neverness to Everness character tier list (2026) with SS to B rankings, content performance, and investment priority for pull planning.', ja: '異環キャラTierリスト。SS/S+/A+/A/B評価、場面別性能、育成優先度を整理しています。' },
  zzz: { zh: '2026年绝区零代理人强度排行，覆盖SS/S/A/B分级、深渊与高难表现、配队定位和每月更新，方便你按版本答案选人。', en: 'Zenless Zone Zero agent tier list (2026) with SS to B rankings for Shiyu Defense and other endgame modes, plus role and team context.', ja: '2026年ゼンレスゾーンゼロTierリスト。SS/S/A/B評価、深層評価、編成参考、毎月更新を掲載。' },
  guihuan: { zh: '归环使灵强度排行，覆盖SS/S/A/B分级、场景表现、配队定位和培养优先级，帮助你更快决定先养谁。', en: 'Guihuan spirit tier list (2026) with SS to B rankings, performance notes, and priority guidance so you know which spirits to build first.', ja: '帰環スピリットTierリスト。SS/S/A/B評価、場面別性能、育成優先度をまとめています。' },
  ananta: { zh: '无限大异能者强度排行，覆盖SS/S/A/B分级、玩法表现和培养优先级，方便你在开服阶段快速选出主力角色。', en: 'Ananta esper tier list (2026) with SS to B rankings, gameplay notes, and investment priority to help you pick early-game mains.', ja: 'アナンタTierリスト。SS/S/A/B評価、性能メモ、育成優先度を整理しています。' },
  endfield: { zh: '明日方舟：终末地干员强度排行，覆盖SS/S/A/B分级、战斗表现、配队定位和培养优先级，方便你按版本节奏安排资源。', en: 'Arknights: Endfield operator tier list (2026) with SS to B rankings, combat notes, team roles, and build priority for smarter resource planning.', ja: 'エンドフィールド干員Tierリスト。SS/S/A/B評価、戦闘評価、編成参考、育成優先度を掲載。' },
  sea: { zh: '遗忘之海角色强度排行 Wiki，覆盖 Traveler、Ais、Little Axe、Princess、Molly 等角色 SS/S/A/B 分级、开荒价值、配队定位和培养优先级。', en: 'Sea of Remnants character tier list wiki with SS to B rankings for Traveler, Ais, Little Axe, Princess, Molly, early-game value, team roles, and investment priority.', ja: 'Sea of RemnantsキャラTierリスト。Traveler、Ais、Little Axe、Princess、MollyのSS/S/A/B評価、序盤価値、育成優先度を整理。' },
  'roco-cn': { zh: '洛克王国：世界国服精灵强度节奏榜，基于社区 PVP 天梯与 PVE 综合表现整理 SS/S/A/B 分级，覆盖迪莫、罗隐、优光绒绒、圣水守护等主流精灵，帮助你把资源投到最值得培养的主力上。', en: 'Roco Kingdom: World CN sprite tier list with SS to B rankings from community PVP ladders and PVE performance, covering Dimo, Luoyin, Youguang Rongrong, Shengshui Shouhu and other top sprites for smarter build priority.', ja: 'ロコ・キングダム：ワールド中国版スプライトTierリスト。社区PVPラダーとPVE性能からSS/S/A/B評価、ディモ、ロウイン、ユウコウロンロン、シェンシュイショウゴなど主力スプライトを掲載。' },
  'roco': { zh: '洛克王国：世界国际服精灵强度节奏榜（早测阵容）。国际服目前仅开放 6 只精灵，御三家沿用 A 级，其余野外宠暂定 B 级，待社区天梯数据补充后更新。', en: 'Roco Kingdom: World global sprite tier list (early-access roster). Only 6 sprites are available globally so far; starters sit at A and wild sprites are provisionally B, pending community ladder data.', ja: 'ロコ・キングダム：ワールド国際版スプライトTierリスト（早テスト阵容）。国際版は現在6体のみ公開、御三家はA、野生は仮B、社区ラダーデータで更新予定。' },
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
    return <GenshinTierListClient locale={locale} />;
  }

  if (gameId === 'starrail') {
    return <StarRailTierListClient locale={locale} />;
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
    return <GenericTierListPage gameId="endfield" locale={locale} />;
  }

  if (gameId === 'sea') {
    return <GenericTierListPage gameId="sea" locale={locale} />;
  }

  if (gameId === 'roco-cn') {
    return <GenericTierListPage gameId="roco-cn" locale={locale} />;
  }

  if (gameId === 'roco') {
    return <GenericTierListPage gameId="roco" locale={locale} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">Coming Soon</div>
    </div>
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
  if (gameId === 'roco') {
    return locale === 'zh'
      ? '国际服早测阵容仅 6 只精灵，本榜为初步分级（御三家 A、其余暂定 B），供开荒节奏参考；国际服技能与种族值官方仍 TBA，待社区数据后校准。'
      : locale === 'ja'
        ? '国際版は早テストで6体のみのため暫定評価（御三家A、その他仮B）。開荒目安としてご利用ください。国際版のスキル・種族値は公式TBAのため、社区データで更新します。'
        : 'The global roster is early-access with only 6 sprites, so this is a provisional ranking (starters A, others tentative B) for pacing reference. Global skills and base stats are still TBA officially and will be recalibrated with community data.';
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
                    <CharacterAvatar src={char.imageUrl} alt="" element={char.element} className="h-full w-full object-cover object-top" />
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
