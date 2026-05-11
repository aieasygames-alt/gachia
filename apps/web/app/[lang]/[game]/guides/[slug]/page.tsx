import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  getGuideById as getNteGuideById,
  getGuideTitle as getNteGuideTitle,
  getGuideContent as getNteGuideContent,
  getGuideSummary as getNteGuideSummary,
  getGuideCategory as getNteGuideCategory,
  getGuideFaqQuestion as getNteGuideFaqQuestion,
  getGuideFaqAnswer as getNteGuideFaqAnswer,
  NTE_GUIDE_CATEGORIES,
  nteGuides,
  getGenshinGuideById,
  getGenshinGuideTitle,
  getGenshinGuideContent,
  getGenshinGuideSummary,
  getGenshinGuideCategory,
  getGenshinGuideFaqQuestion,
  getGenshinGuideFaqAnswer,
  GENSHIN_GUIDE_CATEGORIES,
  genshinGuides,
  starrailGuides,
  getStarRailGuideById,
  getStarRailGuideTitle,
  getStarRailGuideContent,
  getStarRailGuideSummary,
  getStarRailGuideCategory,
  getStarRailGuideFaqQuestion,
  getStarRailGuideFaqAnswer,
  STARRAIL_GUIDE_CATEGORIES,
  wuwaGuides,
  getGuideById as getWuWaGuideById,
  getGuideTitle as getWuWaGuideTitle,
  getGuideContent as getWuWaGuideContent,
  getGuideSummary as getWuWaGuideSummary,
  getGuideCategory as getWuWaGuideCategory,
  getGuideFaqQuestion as getWuWaGuideFaqQuestion,
  getGuideFaqAnswer as getWuWaGuideFaqAnswer,
  WUWA_GUIDE_CATEGORIES,
} from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';
import { ClientMarkdown } from '@/components/wiki/client-markdown';

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) => [
    ...nteGuides.map((guide) => ({
      lang,
      game: 'nte',
      slug: guide.id,
    })),
    ...genshinGuides.map((guide) => ({
      lang,
      game: 'genshin',
      slug: guide.id,
    })),
    ...starrailGuides.map((guide) => ({
      lang,
      game: 'starrail',
      slug: guide.id,
    })),
    ...wuwaGuides.map((guide) => ({
      lang,
      game: 'wuwa',
      slug: guide.id,
    })),
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') {
    const guide = getGenshinGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.genshin.name[locale];
    return {
      title: `${getGenshinGuideTitle(guide, locale)} | ${gameName} Wiki | Gachia`,
      description: getGenshinGuideSummary(guide, locale).slice(0, 160),
    };
  }

  if (gameId === 'nte') {
    const guide = getNteGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.nte.name[locale];
    return {
      title: `${getNteGuideTitle(guide, locale)} | ${gameName} Wiki | Gachia`,
      description: getNteGuideSummary(guide, locale).slice(0, 160),
    };
  }

  if (gameId === 'wuwa') {
    const guide = getWuWaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.wuwa.name[locale];
    return {
      title: `${getWuWaGuideTitle(guide, locale)} | ${gameName} Wiki | Gachia`,
      description: getWuWaGuideSummary(guide, locale).slice(0, 160),
    };
  }

  if (gameId === 'starrail') {
    const guide = getStarRailGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.starrail.name[locale];
    return {
      title: `${getStarRailGuideTitle(guide, locale)} | ${gameName} Wiki | Gachia`,
      description: getStarRailGuideSummary(guide, locale).slice(0, 160),
    };
  }

  return {};
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') {
    return <GenshinGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'nte') {
    return <NteGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'wuwa') {
    return <WuWaGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'starrail') {
    return <StarRailGuideDetail locale={locale} slug={slug} />;
  }

  notFound();
}

function GenshinGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getGenshinGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.genshin;
  const content = getGenshinGuideContent(guide, locale);
  const category = getGenshinGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/genshin/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {GENSHIN_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{GENSHIN_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getGenshinGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getGenshinGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getGenshinGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getGenshinGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/genshin/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>
    </div>
  );
}

function NteGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getNteGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.nte;
  const content = getNteGuideContent(guide, locale);
  const category = getNteGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/nte/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {NTE_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{NTE_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getNteGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getNteGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getNteGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getNteGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/nte/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Wuthering Waves Guide Detail
// ============================================================

function WuWaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getWuWaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.wuwa;
  const content = getWuWaGuideContent(guide, locale);
  const category = getWuWaGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/wuwa/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {WUWA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{WUWA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getWuWaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getWuWaGuideTitle(guide, locale)}
      </h1>

      {/* Meta */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getWuWaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getWuWaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/wuwa/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Star Rail Guide Detail
// ============================================================

function StarRailGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getStarRailGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.starrail;
  const content = getStarRailGuideContent(guide, locale);
  const category = getStarRailGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/starrail/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {STARRAIL_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{STARRAIL_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getStarRailGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getStarRailGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">
          {category}
        </span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>

      <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
        <ClientMarkdown content={content} />
      </div>

      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getStarRailGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getStarRailGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="border-t border-game-border pt-4">
        <Link href="/starrail/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>
    </div>
  );
}
