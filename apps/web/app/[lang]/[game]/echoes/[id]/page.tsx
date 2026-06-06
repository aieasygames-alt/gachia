import { GAMES, LOCALES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  echoSets as wuwaEchoSets,
  getEchoSetById as getWuWaEchoSetById,
  getEchoSetName as getWuWaEchoSetName,
  getEchoSetDesc2pc as getWuWaEchoSetDesc2pc,
  getEchoSetDesc5pc as getWuWaEchoSetDesc5pc,
} from '@gachia/data/games/wuwa/echoes';
import {
  getWuWaCharacterById, getWuWaCharacterName,
} from '@gachia/data/games/wuwa/characters';
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
    description: buildEchoDescription(name, getWuWaEchoSetDesc2pc(set, locale), set.bestFor, locale),
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/wuwa` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '回声' : locale === 'ja' ? 'エコー' : 'Echoes', item: `https://gachia.com/${locale}/wuwa/echoes` },
              { '@type': 'ListItem', position: 3, name },
            ],
          }),
        }}
      />
    </div>
  );
}

function pcLabel(locale: SupportedLocale) {
  return locale === 'zh' ? '件套' : locale === 'ja' ? 'セット' : '-Piece Set';
}

function buildEchoDescription(name: string, bonus2pc: string, bestFor: readonly string[], locale: SupportedLocale) {
  const parts = [name, bonus2pc];
  if (bestFor.length > 0) {
    const names = bestFor.map((cid) => {
      const c = getWuWaCharacterById(cid);
      return c ? getWuWaCharacterName(c, locale) : null;
    }).filter((x): x is string => x !== null);
    if (names.length > 0) {
      const label = locale === 'zh' ? '推荐' : locale === 'ja' ? 'おすすめ' : 'Best for';
      parts.push(`${label}: ${names.join(', ')}`);
    }
  }
  return parts.join('. ').slice(0, 160);
}
