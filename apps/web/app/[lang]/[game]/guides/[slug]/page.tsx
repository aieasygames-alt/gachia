import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { getGuideById, getGuideTitle, getGuideContent, getGuideSummary, getGuideCategory, getGuideFaqQuestion, getGuideFaqAnswer, NTE_GUIDE_CATEGORIES, nteGuides } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';
import { MarkdownRenderer } from '@/components/wiki/markdown-renderer';

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    nteGuides.map((guide) => ({
      lang,
      game: 'nte',
      slug: guide.id,
    }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const guide = getGuideById(slug);

  if (!guide || gameId !== 'nte') return {};

  const gameName = GAMES.nte.name[locale];
  const title = getGuideTitle(guide, locale);

  return {
    title: `${title} | ${gameName} Wiki | Gachia`,
    description: getGuideSummary(guide, locale).slice(0, 160),
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; slug: string }>;
}) {
  const { lang, game, slug } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId !== 'nte') notFound();

  const guide = getGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.nte;
  const content = getGuideContent(guide, locale);
  const category = getGuideCategory(guide, locale);

  return (
    <div>
      {/* Breadcrumb nav */}
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link
          href="/nte/guides"
          className="transition-colors hover:text-game-primary"
        >
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {NTE_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{NTE_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getGuideTitle(guide, locale)}</span>
      </div>

      {/* Title */}
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getGuideTitle(guide, locale)}
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
        <MarkdownRenderer content={content} />
      </div>

      {/* FAQ */}
      {guide.faq && guide.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {guide.faq.map((faqItem, i) => (
              <details
                key={i}
                className="group rounded-lg border border-game-border bg-game-surface"
              >
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="border-t border-game-border pt-4">
        <Link
          href="/nte/guides"
          className="text-sm text-game-primary transition-colors hover:text-game-accent"
        >
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>
    </div>
  );
}
