import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { getArtifactListData } from '@/lib/game-data/artifacts';
import type { ArtifactSetSummary } from '@/lib/game-data/artifacts';
import { notFound } from 'next/navigation';

const RARITY_COLORS: Record<number, string> = { 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };
type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const WUWA_ECHO_NEXT_STEPS: NextStepLink[] = [
  {
    href: '/wuwa/guides/v3-7-live-route',
    label: { zh: '查看 3.7 上线后路线', en: 'Open the v3.7 live route', ja: 'Ver.3.7実装後ルートを見る' },
    description: { zh: '确认梦枢天罗、活动与当前唤取的行动顺序', en: 'Confirm the action order for the Simulacrum Nexus, events, and live Convene', ja: '夢枢天羅、イベント、現在集音の行動順を確認' },
  },
  {
    href: '/wuwa/characters',
    label: { zh: '继续看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
    description: { zh: '按角色反查声骸适配和毕业方向', en: 'Check which characters want which echo sets', ja: 'キャラ別の適性と完成形を見る' },
  },
  {
    href: '/wuwa/map',
    label: { zh: '探索梦枢天罗', en: 'Explore the Simulacrum Nexus', ja: '夢枢天羅を探索' },
    description: { zh: '查看区域解锁、无音区与地图探索入口', en: 'Check region unlocks, Tacet Fields, and map-exploration entry points', ja: 'エリア解放、無音区、マップ探索入口を確認' },
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale] ?? '';
  const data = await getArtifactListData(gameId, locale);

  if (!data) {
    return { title: `${CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts'} - ${gameName}`, robots: { index: false, follow: false } };
  }

  if (gameId === 'starrail') {
    const label = locale === 'zh' ? '遗器' : locale === 'ja' ? '遺物' : 'Relics';
    return {
      title: `${label} - ${gameName} Wiki`,
      description: locale === 'zh'
        ? '崩坏：星穹铁道全遗器图鉴，包含洞窟遗器和位面饰品的2件套/4件套效果及推荐角色'
        : locale === 'ja'
          ? '崩壊：スターレイル遺物図鑑、洞窟遺物と次元装飾の2セット/4セット効果とおすすめキャラ'
          : 'Complete Honkai: Star Rail Relic guide with 2pc/4pc set bonuses and recommended characters',
      alternates: buildAlternates(locale, gameId),
    };
  }

  if (gameId === 'wuwa') {
    const label = locale === 'zh' ? '声骸' : locale === 'ja' ? 'エコー' : 'Echoes';
    return {
      title: `${label} - ${gameName} Wiki`,
      description: locale === 'zh'
        ? '鸣潮全声骸图鉴，包含声骸套装的2件套/5件套效果及推荐角色'
        : locale === 'ja'
          ? '鳴潮エコー図鑑、2セット/5セット効果とおすすめキャラ'
          : 'Complete Wuthering Waves Echo guide with 2pc/5pc set bonuses and recommended characters',
      alternates: buildAlternates(locale, gameId),
    };
  }

  const label = CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts';
  return {
    title: `${label} - ${gameName} Wiki`,
    description: locale === 'zh'
      ? `原神圣遗物图鉴大全，包含${data.total}套圣遗物的2件套/4件套效果及推荐角色`
      : locale === 'ja'
        ? `原神聖遺物図鑑、${data.total}セットの2セット/4セット効果とおすすめキャラ`
        : `Complete Genshin Impact Artifact guide with ${data.total} sets, 2pc/4pc bonuses and recommended characters`,
    alternates: buildAlternates(locale, gameId),
  };
}

export default async function ArtifactsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];
  const data = await getArtifactListData(gameId, locale);

  if (!data) notFound();

  const label = getArtifactLabel(gameId, locale);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {label}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {getCountLabel(gameId, data.total, locale)}
      </p>

      {data.sections.map((section) => (
        <section key={section.id} className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            <span style={{ color: section.sets[0]?.rarity ? RARITY_COLORS[section.sets[0].rarity] || '#888' : undefined }}>{section.title}</span> ({section.sets.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {section.sets.map((set) => (
              <ArtifactSetCard key={set.id} set={set} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      ))}

      {gameId === 'wuwa' && <NextStepStrip locale={locale} links={WUWA_ECHO_NEXT_STEPS} />}
    </div>
  );
}

function ArtifactSetCard({ set, locale, gameId }: { set: ArtifactSetSummary; locale: SupportedLocale; gameId: string }) {
  const href = gameId === 'wuwa' ? `/wuwa/echoes/${set.id}` : `/${gameId}/artifacts/${set.id}`;
  const content = (
    <>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-game-text">{set.name}</h3>
        {set.rarity && <span className="text-xs font-bold" style={{ color: RARITY_COLORS[set.rarity] || '#888' }}>{set.rarity}★</span>}
      </div>
      <div className="space-y-1.5 text-sm">
        <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{set.bonus2pc}</span></p>
        {set.bonus4pc && <p><span className="text-game-primary font-medium">4pc:</span> <span className="text-game-text-muted">{set.bonus4pc}</span></p>}
        {set.bonus5pc && <p><span className="text-game-primary font-medium">5pc:</span> <span className="text-game-text-muted">{set.bonus5pc}</span></p>}
      </div>
      {set.characterNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {set.characterNames.map((name) => (
            <span key={name} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{name}</span>
          ))}
        </div>
      )}
    </>
  );

  return (
    <Link href={href as '/'} className="block rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary/50">
      {content}
    </Link>
  );
}

function getArtifactLabel(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'starrail') return locale === 'zh' ? '遗器' : locale === 'ja' ? '遺物' : 'Relics';
  if (gameId === 'wuwa') return locale === 'zh' ? '声骸合鸣' : locale === 'ja' ? 'ソナタ効果' : 'Echo Sets (Sonata Effects)';
  return CATEGORY_LABELS.artifacts?.[locale] ?? 'Artifacts';
}

function getCountLabel(gameId: GameId, total: number, locale: SupportedLocale) {
  if (gameId === 'starrail') return locale === 'zh' ? `共 ${total} 套遗器` : locale === 'ja' ? `${total} セット` : `${total} Relic Sets`;
  if (gameId === 'wuwa') return locale === 'zh' ? `共 ${total} 套合鸣效果` : locale === 'ja' ? `${total} セット` : `${total} Echo Sets`;
  return locale === 'zh' ? `共 ${total} 套圣遗物` : locale === 'ja' ? `${total} セット` : `${total} Artifact Sets`;
}

function buildAlternates(locale: SupportedLocale, gameId: GameId) {
  return {
    canonical: `https://gachia.com/${locale}/${gameId}/artifacts`,
    languages: {
      'zh-Hans': `https://gachia.com/zh/${gameId}/artifacts`,
      en: `https://gachia.com/en/${gameId}/artifacts`,
      ja: `https://gachia.com/ja/${gameId}/artifacts`,
      'x-default': `https://gachia.com/zh/${gameId}/artifacts`,
    },
  };
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
