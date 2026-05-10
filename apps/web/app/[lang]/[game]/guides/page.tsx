import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import {
  nteGuides,
  getGuideTitle as getNteGuideTitle,
  getGuideSummary as getNteGuideSummary,
  getGuideCategory as getNteGuideCategory,
  getGuideCategories as getNteGuideCategories,
  NTE_GUIDE_CATEGORIES,
  genshinGuides,
  getGenshinGuideTitle,
  getGenshinGuideSummary,
  getGenshinGuideCategory,
  getGenshinGuideCategories,
  GENSHIN_GUIDE_CATEGORIES,
  starrailCharacters,
  getStarRailCharacterName,
  getStarRailCharacterImage,
  wuwaGuides,
  getGuideTitle as getWuWaGuideTitle,
  getGuideSummary as getWuWaGuideSummary,
  getGuideCategory as getWuWaGuideCategory,
  getGuideCategories as getWuWaGuideCategories,
  WUWA_GUIDE_CATEGORIES,
} from '@gachia/data';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return null;

  if (gameId === 'wuwa') {
    return <WuWaGuides locale={locale} />;
  }

  // Unsupported games
  if (gameId !== 'nte' && gameId !== 'genshin' && gameId !== 'starrail') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
            Coming Soon
          </div>
        </div>
      </div>
    );
  }

  if (gameId === 'starrail') {
    return <StarRailGuides locale={locale} />;
  }

  return gameId === 'genshin' ? (
    <GenshinGuides locale={locale} />
  ) : (
    <NteGuides locale={locale} gameId={gameId} />
  );
}

function GenshinGuides({ locale }: { locale: SupportedLocale }) {
  const guides = genshinGuides;
  const categories = getGenshinGuideCategories();
  const gameConfig = GAMES.genshin;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {GENSHIN_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {GENSHIN_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/genshin/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getGenshinGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getGenshinGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getGenshinGuideCategory(guide, locale)}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StarRailGuides({ locale }: { locale: SupportedLocale }) {
  const gameConfig = GAMES.starrail;
  const STARRAIL_ELEMENT_COLORS: Record<string, string> = {
    fire: '#ef4444', ice: '#67e8f9', lightning: '#8b5cf6',
    wind: '#6ee7b7', physical: '#9ca3af', quantum: '#6366f1', imaginary: '#fbbf24',
  };
  const STARRAIL_PATH_LABELS: Record<string, Record<string, string>> = {
    zh: { destruction: '毁灭', hunt: '巡猎', erudition: '智识', harmony: '同谐', nihility: '虚无', preservation: '存护', abundance: '丰饶', remembrance: '记忆' },
    en: { destruction: 'Destruction', hunt: 'Hunt', erudition: 'Erudition', harmony: 'Harmony', nihility: 'Nihility', preservation: 'Preservation', abundance: 'Abundance', remembrance: 'Remembrance' },
  };

  const groups: Record<string, typeof starrailCharacters> = {};
  for (const char of starrailCharacters) {
    const path = char.path;
    if (!groups[path]) groups[path] = [];
    groups[path].push(char);
  }
  const pathOrder = ['destruction', 'hunt', 'erudition', 'harmony', 'nihility', 'preservation', 'abundance', 'remembrance'];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${starrailCharacters.length} 位角色攻略` : `${starrailCharacters.length} Character Guides`}
      </p>
      {pathOrder.map((path) => {
        const chars = groups[path];
        if (!chars || chars.length === 0) return null;
        const pathLabel = STARRAIL_PATH_LABELS[locale]?.[path] ?? path;
        return (
          <section key={path} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{pathLabel}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {chars.map((char) => {
                const imageUrl = getStarRailCharacterImage(char);
                const name = getStarRailCharacterName(char, locale);
                return (
                  <Link key={char.id} href={`/starrail/characters/${char.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-game-surface-alt">
                      <CharacterAvatar src={imageUrl} alt={name} element={char.element} className="h-full w-full object-cover object-top" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-game-text group-hover:text-game-primary">{name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STARRAIL_ELEMENT_COLORS[char.element] || '#888' }} />
                        <span>{pathLabel}</span>
                        <span className="ml-1">{'★'.repeat(char.rarity)}</span>
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

function NteGuides({ locale, gameId }: { locale: SupportedLocale; gameId: string }) {
  const guides = nteGuides;
  const categories = getNteGuideCategories();
  const gameConfig = GAMES.nte;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {NTE_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {NTE_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/${gameId}/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getNteGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getNteGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getNteGuideCategory(guide, locale)}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// --- Wuthering Waves Guides ---

function WuWaGuides({ locale }: { locale: SupportedLocale }) {
  const guides = wuwaGuides;
  const categories = getWuWaGuideCategories();
  const gameConfig = GAMES.wuwa;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${guides.length} 篇攻略`
          : locale === 'ja'
          ? `${guides.length} 件のガイド`
          : `${guides.length} guides`}
      </p>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {WUWA_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {/* Guide groups by category */}
      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {WUWA_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/wuwa/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getWuWaGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getWuWaGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getWuWaGuideCategory(guide, locale)}
                    </span>
                    {guide.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
