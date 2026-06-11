import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { genshinGuides, getGuideTitle as getGenshinGuideTitle, getGuideSummary as getGenshinGuideSummary, getGuideCategory as getGenshinGuideCategory, getGuideCategories as getGenshinGuideCategories, GENSHIN_GUIDE_CATEGORIES } from '@gachia/data/games/genshin/guides';
import { starrailGuides, getGuideTitle as getStarRailGuideTitle, getGuideSummary as getStarRailGuideSummary, getGuideCategory as getStarRailGuideCategory, getGuideCategories as getStarRailGuideCategories, STARRAIL_GUIDE_CATEGORIES } from '@gachia/data/games/starrail/guides';
import { guides as nteGuides, getGuideTitle as getNteGuideTitle, getGuideSummary as getNteGuideSummary, getGuideCategory as getNteGuideCategory, getGuideCategories as getNteGuideCategories, NTE_GUIDE_CATEGORIES } from '@gachia/data/games/nte/guides';
import { wuwaGuides, getGuideTitle as getWuWaGuideTitle, getGuideSummary as getWuWaGuideSummary, getGuideCategory as getWuWaGuideCategory, getGuideCategories as getWuWaGuideCategories, WUWA_GUIDE_CATEGORIES } from '@gachia/data/games/wuwa/guides';
import { zzzGuides, getZzzGuideTitle, getZzzGuideSummary, getZzzGuideCategory, getZzzGuideCategories, ZZZ_GUIDE_CATEGORIES } from '@gachia/data/games/zzz/guides';
import { anantaGuides, getAnantaGuideTitle, getAnantaGuideSummary, getAnantaGuideCategory, getAnantaGuideCategories, ANANTA_GUIDE_CATEGORIES } from '@gachia/data/games/ananta/guides';
import { guihuanGuides, getGuihuanGuideTitle, getGuihuanGuideSummary, getGuihuanGuideCategory, getGuihuanGuideCategories, GUIHUAN_GUIDE_CATEGORIES } from '@gachia/data/games/guihuan/guides';
import { endfieldGuides, getEndfieldGuideTitle, getEndfieldGuideSummary, getEndfieldGuideCategory, getEndfieldGuideCategories, ENDFIELD_GUIDE_CATEGORIES } from '@gachia/data/games/endfield/guides';
import { seaGuides, getSeaGuideTitle, getSeaGuideSummary, getSeaGuideCategory, getSeaGuideCategories, SEA_GUIDE_CATEGORIES } from '@gachia/data/games/sea/guides';
import { starrailCharacters, getStarRailCharacterName, getStarRailCharacterImage } from '@gachia/data/games/starrail/characters';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

const BASE_URL = 'https://gachia.com';

const GUIDE_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神攻略百科，包含新手指南、角色攻略、配队推荐、深渊攻略等', en: 'Genshin Impact guides including beginner tips, character builds, team comps, and Abyss strategies', ja: '原神攻略百科、初心者ガイド、キャラビルド、チーム編成、深境螺旋攻略' },
  starrail: { zh: '崩坏：星穹铁道攻略百科，包含新手指南、角色攻略、配队推荐等', en: 'Honkai: Star Rail guides with beginner tips, character builds, and team comp recommendations', ja: 'スターレイル攻略百科、初心者ガイド、キャラビルド、チーム編成' },
  wuwa: { zh: '鸣潮攻略百科，包含新手指南、角色攻略、声骸推荐等', en: 'Wuthering Waves guides with beginner tips, character builds, and echo recommendations', ja: '鳴潮攻略百科、初心者ガイド、キャラビルド、エコーおすすめ' },
  nte: { zh: '异环攻略百科，包含新手指南、角色攻略、弧盘推荐等', en: 'Neverness to Everness guides with beginner tips, character builds, and arc recommendations', ja: '異環攻略百科、初心者ガイド、キャラビルド、アルクおすすめ' },
  zzz: { zh: '绝区零攻略百科，包含新手指南、代理人攻略、音擎推荐等', en: 'Zenless Zone Zero guides with beginner tips, agent builds, and W-Engine recommendations', ja: 'ゼンレスゾーンゼロ攻略百科、初心者ガイド、エージェントビルド、Wエンジンおすすめ' },
  guihuan: { zh: '归环攻略百科，包含新手指南、使灵攻略、武器推荐等', en: 'Guihuan guides with beginner tips, spirit builds, and weapon recommendations', ja: '帰環攻略百科、初心者ガイド、スピリットビルド、武器おすすめ' },
  ananta: { zh: '无限大攻略百科，包含新手指南、异能者攻略、武器推荐等', en: 'Ananta guides with beginner tips, esper builds, and weapon recommendations', ja: 'アナンタ攻略百科、初心者ガイド、エスパービルド、武器おすすめ' },
  endfield: { zh: '明日方舟：终末地攻略百科，包含新手指南、干员攻略、武器推荐等', en: 'Arknights: Endfield guides with beginner tips, operator builds, and weapon recommendations', ja: 'アークナイツ：エンドフィールド攻略百科、初心者ガイド、オペレータービルド、武器おすすめ' },
  sea: { zh: '遗忘之海攻略百科，包含新手指南、角色攻略等', en: 'Sea of Remnants guides with beginner tips and character builds', ja: 'シー・オブ・レムナンツ攻略百科、初心者ガイド、キャラビルド' },
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
  const categoryLabel = CATEGORY_LABELS.guides?.[locale] ?? 'Guides';
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/guides`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/guides`;

  const desc = GUIDE_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName} Wiki`;
  const title = locale === 'zh'
    ? `${gameName}攻略大全 — 新手指南/配队/角色攻略`
    : locale === 'ja'
      ? `${gameName}攻略百科 — ガイド一覧`
      : `${gameName} Guides — Builds, Teams & Tips`;

  return {
    title,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/guides`, languages },
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/${locale}/${gameId}/guides`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.jpg`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

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

  if (gameId === 'zzz') {
    return <ZzzGuides locale={locale} />;
  }

  if (gameId === 'guihuan') {
    return <GuihuanGuides locale={locale} />;
  }

  if (gameId === 'ananta') {
    return <AnantaGuides locale={locale} />;
  }

  if (gameId === 'endfield') {
    return <EndfieldGuides locale={locale} />;
  }

  if (gameId === 'sea') {
    return <SeaGuides locale={locale} />;
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
  const guides = starrailGuides;
  const categories = getStarRailGuideCategories();
  const gameConfig = GAMES.starrail;

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
              {STARRAIL_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
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
              {STARRAIL_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/starrail/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getStarRailGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getStarRailGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getStarRailGuideCategory(guide, locale)}
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

// --- ZZZ Guides ---

function ZzzGuides({ locale }: { locale: SupportedLocale }) {
  const guides = zzzGuides;
  const categories = getZzzGuideCategories();
  const gameConfig = GAMES.zzz;

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
              {ZZZ_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
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
              {ZZZ_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/zzz/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getZzzGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getZzzGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getZzzGuideCategory(guide, locale)}
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

// --- Guihuan Guides ---

function GuihuanGuides({ locale }: { locale: SupportedLocale }) {
  const guides = guihuanGuides;
  const categories = getGuihuanGuideCategories();
  const gameConfig = GAMES.guihuan;

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

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {GUIHUAN_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {GUIHUAN_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/guihuan/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getGuihuanGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getGuihuanGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getGuihuanGuideCategory(guide, locale)}
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

// --- Ananta Guides ---

function AnantaGuides({ locale }: { locale: SupportedLocale }) {
  const guides = anantaGuides;
  const categories = getAnantaGuideCategories();
  const gameConfig = GAMES.ananta;

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

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {ANANTA_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {ANANTA_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/ananta/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getAnantaGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getAnantaGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getAnantaGuideCategory(guide, locale)}
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

// --- Endfield Guides ---

function EndfieldGuides({ locale }: { locale: SupportedLocale }) {
  const guides = endfieldGuides;
  const categories = getEndfieldGuideCategories();
  const gameConfig = GAMES.endfield;

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

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {ENDFIELD_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {ENDFIELD_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/endfield/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getEndfieldGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getEndfieldGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getEndfieldGuideCategory(guide, locale)}
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

// --- Sea of Remnants Guides ---

function SeaGuides({ locale }: { locale: SupportedLocale }) {
  const guides = seaGuides;
  const categories = getSeaGuideCategories();
  const gameConfig = GAMES.sea;

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

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = guides.filter((g) => g.category === cat).length;
          return (
            <a
              key={cat}
              href={`#category-${cat}`}
              className="rounded-full border border-game-border bg-game-surface px-3 py-1 text-sm transition-colors hover:border-game-primary hover:text-game-primary"
            >
              {SEA_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
              <span className="ml-1 text-game-text-muted">({count})</span>
            </a>
          );
        })}
      </div>

      {categories.map((cat) => {
        const categoryGuides = guides.filter((g) => g.category === cat);
        return (
          <section key={cat} id={`category-${cat}`} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">
              {SEA_GUIDE_CATEGORIES[cat]?.[locale] ?? cat}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGuides.map((guide) => (
                <Link
                  key={guide.id}
                  href={`/sea/guides/${guide.id}`}
                  className="group flex flex-col rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary hover:shadow-lg"
                >
                  <h3 className="mb-2 text-base font-semibold text-game-text group-hover:text-game-primary">
                    {getSeaGuideTitle(guide, locale)}
                  </h3>
                  <p className="mb-3 flex-1 text-sm leading-relaxed text-game-text-muted">
                    {getSeaGuideSummary(guide, locale)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary">
                      {getSeaGuideCategory(guide, locale)}
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
