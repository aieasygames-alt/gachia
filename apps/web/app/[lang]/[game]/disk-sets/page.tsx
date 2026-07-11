import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { diskSets as nteDiskSets, getNteDiskSetName, getNteDiskSetDesc2pc, getNteDiskSetDesc4pc } from '@gachia/data/games/nte/extras';
import { getNteCharacterName, getNteCharacterById } from '@gachia/data/games/nte/characters';
import { ensureMetaLength } from '@/lib/seo-metadata';

const ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (gameId !== 'nte') return { robots: { index: false, follow: false } };
  const gameName = GAMES.nte.name[locale];
  const title = locale === 'zh'
    ? `${gameName}磁盘套装图鉴 — 2件/4件效果与推荐角色`
    : locale === 'ja'
      ? `${gameName}ディスクセット図鑑 — 2セット/4セット効果とおすすめキャラ`
      : `${gameName} Disk Sets — 2pc/4pc Effects, Recommended Users & Build Notes`;
  const description = ensureMetaLength(
    locale === 'zh'
      ? '异环磁盘套装图鉴，整理2件套与4件套效果、元素倾向、推荐角色和配装思路，帮助你快速判断哪些套装值得优先刷取。'
      : locale === 'ja'
        ? '異環のディスクセット図鑑。2セット・4セット効果、属性傾向、おすすめキャラ、ビルド方針を整理し、優先して周回すべきセットを判断できます。'
        : 'Neverness to Everness disk set guide with 2pc and 4pc effects, element fit, recommended characters, and build notes so you can decide what to farm first.',
    locale,
  );

  return {
    title,
    description,
    alternates: {
      canonical: `https://gachia.com/${locale}/nte/disk-sets`,
      languages: {
        'zh-Hans': `https://gachia.com/zh/nte/disk-sets`,
        en: `https://gachia.com/en/nte/disk-sets`,
        ja: `https://gachia.com/ja/nte/disk-sets`,
        'x-default': `https://gachia.com/zh/nte/disk-sets`,
      },
    },
  };
}

export default async function DiskSetsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId !== 'nte') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS['disk-sets']?.[locale] ?? 'Disk Sets'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const diskSets = nteDiskSets;
  const general = diskSets.filter((d) => d.category === 'general');
  const elemental = diskSets.filter((d) => d.category === 'elemental');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['disk-sets']?.[locale] ?? 'Disk Sets'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${diskSets.length} 套光盘` : locale === 'ja' ? `${diskSets.length} セット` : `${diskSets.length} Disk Sets`}
      </p>

      {general.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '通用套装' : locale === 'ja' ? '汎用セット' : 'General'} ({general.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {general.map((ds) => (
              <DiskSetCard key={ds.id} ds={ds} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {elemental.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '元素套装' : locale === 'ja' ? '元素セット' : 'Elemental'} ({elemental.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {elemental.map((ds) => (
              <DiskSetCard key={ds.id} ds={ds} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DiskSetCard({ ds, locale }: { ds: typeof nteDiskSets[number]; locale: SupportedLocale }) {
  const elementColor = ds.element ? ELEMENT_COLORS[ds.element] : undefined;

  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-game-text">{getNteDiskSetName(ds, locale)}</h3>
        {ds.element && (
          <span className="rounded px-1.5 py-0.5 text-xs text-white" style={{ backgroundColor: elementColor || '#888' }}>
            {ds.element}
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-sm">
        <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getNteDiskSetDesc2pc(ds, locale)}</span></p>
        <p><span className="text-game-primary font-medium">4pc:</span> <span className="text-game-text-muted">{getNteDiskSetDesc4pc(ds, locale)}</span></p>
      </div>
      {ds.characters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ds.characters.slice(0, 6).map((charId) => {
            const char = getNteCharacterById(charId);
            return char ? (
              <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                {getNteCharacterName(char, locale)}
              </span>
            ) : null;
          })}
          {ds.characters.length > 6 && <span className="text-xs text-game-text-muted">+{ds.characters.length - 6}</span>}
        </div>
      )}
    </div>
  );
}
