import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteCharacters, getNteCharacterName, getNteCharacterImage } from '@gachia/data/games/nte/characters';
import { zzzCharacters, getZzzCharacterName, getZzzCharacterImage } from '@gachia/data/games/zzz/characters';
import { anantaCharacters, getAnantaCharacterName, getAnantaCharacterImage } from '@gachia/data/games/ananta/characters';
import { guihuanCharacters, getGuihuanCharacterName, getGuihuanCharacterImage } from '@gachia/data/games/guihuan/characters';
import { endfieldCharacters, getEndfieldCharacterName, getEndfieldCharacterImage } from '@gachia/data/games/endfield/characters';
import { seaCharacters, getSeaCharacterName, getSeaCharacterImage } from '@gachia/data/games/sea/characters';
import { tierLists as zzzTierLists } from '@gachia/data/games/zzz';
import { tierLists as anantaTierLists } from '@gachia/data/games/ananta';
import { tierLists as guihuanTierLists } from '@gachia/data/games/guihuan';
import { tierLists as endfieldTierLists } from '@gachia/data/games/endfield';
import { tierLists as seaTierLists } from '@gachia/data/games/sea';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import dynamic from 'next/dynamic';
import { ensureMetaLength } from '@/lib/seo-metadata';

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
  sea: { zh: '遗忘之海角色强度排行，覆盖SS/S/A/B分级、场景表现和培养优先级，帮助你在开荒和中期资源分配时更快做决定。', en: 'Sea of Remnants character tier list (2026) with SS to B rankings, performance notes, and investment priority for early and mid-game planning.', ja: 'シー・オブ・レムナンツTierリスト。SS/S/A/B評価、場面別性能、育成優先度を整理しています。' },
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

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

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
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/tier-list`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/tier-list`;

  const desc = TIER_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName} Wiki`;
  const title = locale === 'zh'
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
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/tier-list`, languages },
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
    return <NteTierListPage locale={locale} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaTierListClient locale={locale} />;
  }

  if (gameId === 'zzz') {
    return <ZzzTierListPage locale={locale} />;
  }

  if (gameId === 'ananta') {
    return <AnantaTierListPage locale={locale} />;
  }

  if (gameId === 'guihuan') {
    return <GuihuanTierListPage locale={locale} />;
  }

  if (gameId === 'endfield') {
    return <EndfieldTierListPage locale={locale} />;
  }

  if (gameId === 'sea') {
    return <SeaTierListPage locale={locale} />;
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

// --- NTE Tier List ---

function NteTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierGroups: Record<string, typeof nteCharacters> = {};
  const tierOrder = ['SS', 'S+', 'A+', 'A', 'B'];

  for (const char of nteCharacters) {
    const tier = char.tierRank || 'B';
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(char);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.nte.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const chars = tierGroups[tier];
        if (!chars || chars.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({chars.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {chars.map((char) => {
                const imageUrl = getNteCharacterImage(char);
                return (
                  <Link key={char.id} href={`/nte/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.attribute} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getNteCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: NTE_ELEMENT_COLORS[char.attribute] || '#888' }} />
                        <span>{char.roleEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- ZZZ Tier List ---

const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

const ANANTA_ELEMENT_COLORS: Record<string, string> = {
  chaos: '#8b5cf6', psyche: '#06b6d4', spark: '#f59e0b', surge: '#3b82f6', bloom: '#4ade80', void: '#ec4899',
};

function ZzzTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = zzzTierLists.find(
    (tl) => tl.gameId === 'zzz' && tl.category === 'overall' && tl.locale === locale,
  ) ?? zzzTierLists.find(
    (tl) => tl.gameId === 'zzz' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(zzzCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.zzz.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getZzzCharacterImage(char);
                return (
                  <Link key={char.id} href={`/zzz/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.attribute} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getZzzCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ZZZ_ELEMENT_COLORS[char.attribute] || '#888' }} />
                        <span>{char.specialtyEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Ananta Tier List ---

function AnantaTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = anantaTierLists.find(
    (tl) => tl.gameId === 'ananta' && tl.category === 'overall' && tl.locale === locale,
  ) ?? anantaTierLists.find(
    (tl) => tl.gameId === 'ananta' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(anantaCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.ananta.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getAnantaCharacterImage(char);
                return (
                  <Link key={char.id} href={`/ananta/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getAnantaCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ANANTA_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{char.roleEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Guihuan Tier List ---

const GUIHUAN_ELEMENT_COLORS: Record<string, string> = {
  radiance: '#fbbf24', frost: '#67e8f9', flame: '#ef4444',
  void: '#a855f7', gale: '#6ee7b7', thunder: '#8b5cf6',
};

function GuihuanTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = guihuanTierLists.find(
    (tl) => tl.gameId === 'guihuan' && tl.category === 'overall' && tl.locale === locale,
  ) ?? guihuanTierLists.find(
    (tl) => tl.gameId === 'guihuan' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(guihuanCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.guihuan.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getGuihuanCharacterImage(char);
                return (
                  <Link key={char.id} href={`/guihuan/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getGuihuanCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: GUIHUAN_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{char.roleEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Endfield Tier List ---

const ENDFIELD_ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', heat: '#ef4444', cryo: '#67e8f9', nature: '#4ade80', electric: '#facc15',
};

function EndfieldTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = endfieldTierLists.find(
    (tl) => tl.gameId === 'endfield' && tl.category === 'overall' && tl.locale === locale,
  ) ?? endfieldTierLists.find(
    (tl) => tl.gameId === 'endfield' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(endfieldCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.endfield.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getEndfieldCharacterImage(char);
                return (
                  <Link key={char.id} href={`/endfield/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getEndfieldCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ENDFIELD_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{char.professionEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Sea of Remnants Tier List ---

const SEA_ELEMENT_COLORS: Record<string, string> = {
  str: '#ef4444', agi: '#22c55e', con: '#f97316',
  int: '#8b5cf6', per: '#3b82f6', cha: '#ec4899',
};

function SeaTierListPage({ locale }: { locale: SupportedLocale }) {
  const tierData = seaTierLists.find(
    (tl) => tl.gameId === 'sea' && tl.category === 'overall' && tl.locale === locale,
  ) ?? seaTierLists.find(
    (tl) => tl.gameId === 'sea' && tl.category === 'overall',
  );

  const tierGroups: Record<string, string[]> = {};
  const tierOrder = ['SS', 'S', 'A', 'B'];

  if (tierData) {
    for (const entry of tierData.entries) {
      if (!tierGroups[entry.tier]) tierGroups[entry.tier] = [];
      tierGroups[entry.tier]!.push(entry.characterId);
    }
  }

  const charMap = new Map(seaCharacters.map((c) => [c.id, c]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.sea.theme.primary }}>
        {CATEGORY_LABELS['tier-list']?.[locale] ?? 'Tier List'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '基于角色综合强度评级，仅供参考' : locale === 'ja' ? 'キャラクターの総合的な強さに基づく評価です' : 'Based on overall character strength, for reference only'}
      </p>

      {tierOrder.map((tier) => {
        const ids = tierGroups[tier];
        if (!ids || ids.length === 0) return null;
        const style = TIER_STYLES[tier] ?? TIER_STYLES.B ?? { bg: '', text: '', border: '' };

        return (
          <section key={tier} className={`mb-4 rounded-lg border ${style.border} ${style.bg} p-4`}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`text-xl font-bold ${style.text}`}>{tier}</span>
              <span className="text-sm text-game-text-muted">({ids.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {ids.map((id) => {
                const char = charMap.get(id);
                if (!char) return null;
                const imageUrl = getSeaCharacterImage(char);
                return (
                  <Link key={char.id} href={`/sea/characters/${char.id}` as '/'}
                    className="group flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 transition-colors hover:border-game-primary">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt="" element={char.attribute} className="h-full w-full object-cover object-top" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-game-text group-hover:text-game-primary">{getSeaCharacterName(char, locale)}</p>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SEA_ELEMENT_COLORS[char.attribute] || '#888' }} />
                        <span>{char.roleEn}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
