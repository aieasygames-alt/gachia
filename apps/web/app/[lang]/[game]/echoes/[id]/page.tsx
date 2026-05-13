import { GAMES, LOCALES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  wuwaEchoSets, getWuWaEchoSetById, getWuWaEchoSetName,
  getWuWaEchoSetDesc2pc, getWuWaEchoSetDesc5pc,
  getWuWaCharacterById, getWuWaCharacterName,
} from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    wuwaEchoSets.map((s) => ({ lang, game: 'wuwa', id: s.id }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const set = getWuWaEchoSetById(id);
  if (!set) return {};
  const name = getWuWaEchoSetName(set, locale);
  return {
    title: `${name} - ${GAMES.wuwa.name[locale]} Wiki`,
    description: getWuWaEchoSetDesc2pc(set, locale).slice(0, 160),
    alternates: {
      canonical: `https://gachia.com/${locale}/wuwa/echoes/${id}`,
      languages: {
        'zh-Hans': `https://gachia.com/zh/wuwa/echoes/${id}`,
        en: `https://gachia.com/en/wuwa/echoes/${id}`,
        ja: `https://gachia.com/ja/wuwa/echoes/${id}`,
        'x-default': `https://gachia.com/zh/wuwa/echoes/${id}`,
      },
    },
  };
}

export default async function EchoDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const gameName = GAMES.wuwa.name[locale];
  const set = getWuWaEchoSetById(id);
  if (!set) notFound();

  const name = getWuWaEchoSetName(set, locale);
  const nameAlt = locale === 'zh' ? set.nameEn : set.name;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/wuwa" className="hover:text-game-primary">{gameName}</Link>
        <span>/</span>
        <Link href="/wuwa/echoes" className="hover:text-game-primary">
          {locale === 'zh' ? '回声' : locale === 'ja' ? 'エコー' : 'Echoes'}
        </Link>
        <span>/</span>
        <span className="text-game-text">{name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <h1 className="text-2xl font-bold text-game-text">{name}</h1>
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
            <p className="text-sm text-game-text-muted">{getWuWaEchoSetDesc2pc(set, locale)}</p>
          </div>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-sm font-medium text-game-primary">5{pcLabel(locale)}</div>
            <p className="text-sm text-game-text-muted">{getWuWaEchoSetDesc5pc(set, locale)}</p>
          </div>
        </div>
      </section>

      {/* Best For */}
      {set.bestFor.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '推荐角色' : locale === 'ja' ? 'おすすめキャラクター' : 'Recommended Characters'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {set.bestFor.map((charId) => {
              const char = getWuWaCharacterById(charId);
              const charName = char ? getWuWaCharacterName(char, locale) : charId;
              return (
                <Link
                  key={charId}
                  href={`/wuwa/characters/${charId}` as '/'}
                  className="rounded bg-game-primary/20 px-3 py-1.5 text-sm font-medium text-game-primary transition-colors hover:bg-game-primary/30"
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
