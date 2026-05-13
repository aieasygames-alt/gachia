import { GAMES, LOCALES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  nteDiskSets, getNteDiskSetName, getNteDiskSetDesc2pc, getNteDiskSetDesc4pc,
  getNteCharacterById, getNteCharacterName,
} from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    nteDiskSets.map((s) => ({ lang, game: 'nte', id: s.id }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const set = nteDiskSets.find((s) => s.id === id);
  if (!set) return {};
  const name = getNteDiskSetName(set, locale);
  return {
    title: `${name} - ${GAMES.nte.name[locale]} Wiki`,
    description: getNteDiskSetDesc2pc(set, locale).slice(0, 160),
    alternates: {
      canonical: `https://gachia.com/${locale}/nte/disk-sets/${id}`,
      languages: {
        'zh-Hans': `https://gachia.com/zh/nte/disk-sets/${id}`,
        en: `https://gachia.com/en/nte/disk-sets/${id}`,
        ja: `https://gachia.com/ja/nte/disk-sets/${id}`,
        'x-default': `https://gachia.com/zh/nte/disk-sets/${id}`,
      },
    },
  };
}

export default async function DiskSetDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const gameName = GAMES.nte.name[locale];
  const set = nteDiskSets.find((s) => s.id === id);
  if (!set) notFound();

  const name = getNteDiskSetName(set, locale);
  const nameAlt = locale === 'zh' ? (set.nameEn ?? '') : (set.name ?? '');
  const category = set.category === 'general'
    ? (locale === 'zh' ? '通用' : locale === 'ja' ? '汎用' : 'General')
    : (locale === 'zh' ? '元素' : locale === 'ja' ? '元素' : 'Elemental');

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/nte" className="hover:text-game-primary">{gameName}</Link>
        <span>/</span>
        <Link href="/nte/disk-sets" className="hover:text-game-primary">
          {locale === 'zh' ? '磁盘套装' : locale === 'ja' ? 'ディスクセット' : 'Disk Sets'}
        </Link>
        <span>/</span>
        <span className="text-game-text">{name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-game-text">{name}</h1>
          <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{category}</span>
          {set.element && (
            <span className="rounded bg-game-primary/10 px-2 py-0.5 text-xs text-game-primary">{set.element}</span>
          )}
        </div>
        {nameAlt && <p className="mt-1 text-sm text-game-text-muted">{nameAlt}</p>}
      </div>

      {/* Set Bonuses */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '套装效果' : locale === 'ja' ? 'セット効果' : 'Set Bonuses'}
        </h2>
        <div className="space-y-3">
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">2{pcLabel(locale)}</div>
            <p className="text-sm text-game-text-muted">{getNteDiskSetDesc2pc(set, locale)}</p>
          </div>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">4{pcLabel(locale)}</div>
            <p className="text-sm text-game-text-muted">{getNteDiskSetDesc4pc(set, locale)}</p>
          </div>
        </div>
      </section>

      {/* Recommended Characters */}
      {set.characters.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '推荐角色' : locale === 'ja' ? 'おすすめキャラクター' : 'Recommended Characters'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {set.characters.map((charId) => {
              const char = getNteCharacterById(charId);
              const charName = char ? getNteCharacterName(char, locale) : charId;
              const isBest = set.bestFor?.includes(charId);
              return (
                <Link
                  key={charId}
                  href={`/nte/characters/${charId}` as '/'}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${
                    isBest
                      ? 'bg-game-primary/20 text-game-primary font-medium hover:bg-game-primary/30'
                      : 'bg-game-surface-alt text-game-text-muted hover:text-game-text'
                  }`}
                >
                  {charName}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function pcLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '件套' : locale === 'ja' ? 'セット' : '-Piece Set';
}
