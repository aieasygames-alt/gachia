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
  guides as nteGuides,
} from '@gachia/data/games/nte/guides';
import {
  genshinGuides,
  getGuideById as getGenshinGuideById,
  getGuideTitle as getGenshinGuideTitle,
  getGuideContent as getGenshinGuideContent,
  getGuideSummary as getGenshinGuideSummary,
  getGuideCategory as getGenshinGuideCategory,
  getGuideFaqQuestion as getGenshinGuideFaqQuestion,
  getGuideFaqAnswer as getGenshinGuideFaqAnswer,
  GENSHIN_GUIDE_CATEGORIES,
} from '@gachia/data/games/genshin/guides';
import {
  starrailGuides,
  getGuideById as getStarRailGuideById,
  getGuideTitle as getStarRailGuideTitle,
  getGuideContent as getStarRailGuideContent,
  getGuideSummary as getStarRailGuideSummary,
  getGuideCategory as getStarRailGuideCategory,
  getGuideFaqQuestion as getStarRailGuideFaqQuestion,
  getGuideFaqAnswer as getStarRailGuideFaqAnswer,
  STARRAIL_GUIDE_CATEGORIES,
} from '@gachia/data/games/starrail/guides';
import {
  wuwaGuides,
  getGuideById as getWuWaGuideById,
  getGuideTitle as getWuWaGuideTitle,
  getGuideContent as getWuWaGuideContent,
  getGuideSummary as getWuWaGuideSummary,
  getGuideCategory as getWuWaGuideCategory,
  getGuideFaqQuestion as getWuWaGuideFaqQuestion,
  getGuideFaqAnswer as getWuWaGuideFaqAnswer,
  WUWA_GUIDE_CATEGORIES,
} from '@gachia/data/games/wuwa/guides';
import {
  zzzGuides,
  getZzzGuideById,
  getZzzGuideTitle,
  getZzzGuideContent,
  getZzzGuideSummary,
  getZzzGuideCategory,
  getZzzGuideFaqQuestion,
  getZzzGuideFaqAnswer,
  ZZZ_GUIDE_CATEGORIES,
} from '@gachia/data/games/zzz/guides';
import {
  guihuanGuides,
  getGuihuanGuideById,
  getGuihuanGuideTitle,
  getGuihuanGuideContent,
  getGuihuanGuideSummary,
  getGuihuanGuideCategory,
  getGuihuanGuideFaqQuestion,
  getGuihuanGuideFaqAnswer,
  GUIHUAN_GUIDE_CATEGORIES,
} from '@gachia/data/games/guihuan/guides';
import {
  anantaGuides,
  getAnantaGuideById,
  getAnantaGuideTitle,
  getAnantaGuideContent,
  getAnantaGuideSummary,
  getAnantaGuideCategory,
  getAnantaGuideFaqQuestion,
  getAnantaGuideFaqAnswer,
  ANANTA_GUIDE_CATEGORIES,
} from '@gachia/data/games/ananta/guides';
import type { AnantaGuide, AnantaGuideFaq } from '@gachia/data/games/ananta/guides';
import { Link } from '@/lib/i18n/navigation';
import { ClientMarkdown } from '@/components/wiki/client-markdown';
import { buildGuideJsonLd } from '@/lib/jsonld';

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
    ...zzzGuides.map((guide) => ({
      lang,
      game: 'zzz',
      slug: guide.id,
    })),
    ...guihuanGuides.map((guide) => ({
      lang,
      game: 'guihuan',
      slug: guide.id,
    })),
    ...anantaGuides.map((g) => ({
      lang,
      game: 'ananta',
      slug: g.id,
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

  const buildOg = (title: string, description: string, gameId: string, locale: SupportedLocale) => ({
    title,
    description,
    url: `https://gachia.com/${locale}/${gameId}`,
    siteName: 'Gachia',
    images: [{ url: `https://gachia.com/images/og/${gameId}.jpg`, width: 1200, height: 630 }],
    locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
  });

  const buildGuideAlternates = (gameId: string, slug: string) => ({
    canonical: `https://gachia.com/${locale}/${gameId}/guides/${slug}`,
    languages: {
      'zh-Hans': `https://gachia.com/zh/${gameId}/guides/${slug}`,
      en: `https://gachia.com/en/${gameId}/guides/${slug}`,
      ja: `https://gachia.com/ja/${gameId}/guides/${slug}`,
      'x-default': `https://gachia.com/zh/${gameId}/guides/${slug}`,
    },
  });

  // Build intent-rich title & description per locale for guides
  const buildGuideMeta = (guideTitle: string, summary: string, gameName: string) => {
    const title = locale === 'zh'
      ? `${guideTitle} — ${gameName}攻略详解`
      : locale === 'ja'
        ? `${guideTitle} — ${gameName}攻略ガイド`
        : `${guideTitle} — ${gameName} Complete Guide`;
    const desc = summary
      ? summary.slice(0, 160)
      : locale === 'zh'
        ? `${guideTitle}是${gameName}的详细攻略，包含技巧、策略和FAQ。`
        : locale === 'ja'
          ? `${guideTitle}の${gameName}攻略ガイド。Tips、戦略、FAQを掲載。`
          : `Complete ${guideTitle} guide for ${gameName} with tips, strategies, and FAQ.`;
    return { title, description: desc };
  };

  if (gameId === 'genshin') {
    const guide = getGenshinGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.genshin.name[locale];
    const meta = buildGuideMeta(getGenshinGuideTitle(guide, locale), getGenshinGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, locale) };
  }

  if (gameId === 'nte') {
    const guide = getNteGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.nte.name[locale];
    const meta = buildGuideMeta(getNteGuideTitle(guide, locale), getNteGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, locale) };
  }

  if (gameId === 'wuwa') {
    const guide = getWuWaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.wuwa.name[locale];
    const meta = buildGuideMeta(getWuWaGuideTitle(guide, locale), getWuWaGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, locale) };
  }

  if (gameId === 'starrail') {
    const guide = getStarRailGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.starrail.name[locale];
    const meta = buildGuideMeta(getStarRailGuideTitle(guide, locale), getStarRailGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, locale) };
  }

  if (gameId === 'zzz') {
    const guide = getZzzGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.zzz.name[locale];
    const meta = buildGuideMeta(getZzzGuideTitle(guide, locale), getZzzGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, locale) };
  }

  if (gameId === 'guihuan') {
    const guide = getGuihuanGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.guihuan.name[locale];
    const meta = buildGuideMeta(getGuihuanGuideTitle(guide, locale), getGuihuanGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, locale) };
  }

  if (gameId === 'ananta') {
    const guide = getAnantaGuideById(slug);
    if (!guide) return {};
    const gameName = GAMES.ananta.name[locale];
    const meta = buildGuideMeta(getAnantaGuideTitle(guide, locale), getAnantaGuideSummary(guide, locale), gameName);
    return { ...meta, alternates: buildGuideAlternates(gameId, slug), openGraph: buildOg(meta.title, meta.description, gameId, locale) };
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

  if (gameId === 'zzz') {
    return <ZzzGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'guihuan') {
    return <GuihuanGuideDetail locale={locale} slug={slug} />;
  }

  if (gameId === 'ananta') {
    return <AnantaGuideDetail locale={locale} slug={slug} />;
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

      <RelatedGuidesSection gameId="genshin" currentSlug={slug} locale={locale} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/genshin/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'genshin',
        locale,
        title: getGenshinGuideTitle(guide, locale),
        summary: getGenshinGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getGenshinGuideFaqQuestion(f, locale), answer: getGenshinGuideFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
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

      <RelatedGuidesSection gameId="nte" currentSlug={slug} locale={locale} />

      {buildGuideJsonLd({
        gameId: 'nte',
        locale,
        title: getNteGuideTitle(guide, locale),
        summary: getNteGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getNteGuideFaqQuestion(f, locale), answer: getNteGuideFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
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

      <RelatedGuidesSection gameId="wuwa" currentSlug={slug} locale={locale} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href="/wuwa/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'wuwa',
        locale,
        title: getWuWaGuideTitle(guide, locale),
        summary: getWuWaGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getWuWaGuideFaqQuestion(f, locale), answer: getWuWaGuideFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
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

      <RelatedGuidesSection gameId="starrail" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/starrail/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'starrail',
        locale,
        title: getStarRailGuideTitle(guide, locale),
        summary: getStarRailGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getStarRailGuideFaqQuestion(f, locale), answer: getStarRailGuideFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}

/* ---------- ZZZ Guide Detail ---------- */

function ZzzGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getZzzGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.zzz;
  const content = getZzzGuideContent(guide, locale);
  const category = getZzzGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/zzz/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ZZZ_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ZZZ_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getZzzGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getZzzGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
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
                  {getZzzGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getZzzGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="zzz" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/zzz/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'zzz',
        locale,
        title: getZzzGuideTitle(guide, locale),
        summary: getZzzGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getZzzGuideFaqQuestion(f, locale), answer: getZzzGuideFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}

/* ---------- Guihuan Guide Detail ---------- */

function GuihuanGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide = getGuihuanGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.guihuan;
  const content = getGuihuanGuideContent(guide, locale);
  const category = getGuihuanGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/guihuan/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {GUIHUAN_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{GUIHUAN_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getGuihuanGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getGuihuanGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
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
                  {getGuihuanGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getGuihuanGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="guihuan" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/guihuan/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'guihuan',
        locale,
        title: getGuihuanGuideTitle(guide, locale),
        summary: getGuihuanGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getGuihuanGuideFaqQuestion(f, locale), answer: getGuihuanGuideFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}

/* ---------- Ananta Guide Detail ---------- */

function AnantaGuideDetail({ locale, slug }: { locale: SupportedLocale; slug: string }) {
  const guide: AnantaGuide | undefined = getAnantaGuideById(slug);
  if (!guide) notFound();

  const gameConfig = GAMES.ananta;
  const content = getAnantaGuideContent(guide, locale);
  const category = getAnantaGuideCategory(guide, locale);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/ananta/guides" className="transition-colors hover:text-game-primary">
          {CATEGORY_LABELS.guides?.[locale] ?? 'Guides'}
        </Link>
        <span>/</span>
        {ANANTA_GUIDE_CATEGORIES[guide.category]?.[locale] && (
          <>
            <span>{ANANTA_GUIDE_CATEGORIES[guide.category]?.[locale]}</span>
            <span>/</span>
          </>
        )}
        <span className="text-game-text">{getAnantaGuideTitle(guide, locale)}</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {getAnantaGuideTitle(guide, locale)}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-game-text-muted">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{category}</span>
        {guide.tags.map((tag) => (
          <span key={tag} className="rounded bg-game-surface-alt px-2 py-0.5">{tag}</span>
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
            {guide.faq.map((faqItem: AnantaGuideFaq, i: number) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getAnantaGuideFaqQuestion(faqItem, locale)}
                </summary>
                <div className="px-4 pb-3 text-sm text-game-text-muted">
                  {getAnantaGuideFaqAnswer(faqItem, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <RelatedGuidesSection gameId="ananta" currentSlug={slug} locale={locale} />

      <div className="border-t border-game-border pt-4">
        <Link href="/ananta/guides" className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回攻略列表' : locale === 'ja' ? '← ガイド一覧に戻る' : '← Back to Guides'}
        </Link>
      </div>

      {buildGuideJsonLd({
        gameId: 'ananta',
        locale,
        title: getAnantaGuideTitle(guide, locale),
        summary: getAnantaGuideSummary(guide, locale),
        slug,
        faq: guide.faq?.map((f) => ({ question: getAnantaGuideFaqQuestion(f, locale), answer: getAnantaGuideFaqAnswer(f, locale) })),
      }).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </div>
  );
}

// --- Shared Related Guides Section ---

type GuideLike = { id: string; category: string; tags: string[] };

function RelatedGuidesSection({ gameId, currentSlug, locale }: { gameId: string; currentSlug: string; locale: SupportedLocale }) {
  const allGuides = getGuidesForGame(gameId);
  const current = allGuides.find((g) => g.id === currentSlug);
  if (!current) return null;

  const related = allGuides
    .filter((g) => g.id !== currentSlug)
    .map((g) => {
      const sameCategory = g.category === current.category ? 2 : 0;
      const sharedTags = g.tags.filter((t) => current.tags.includes(t)).length;
      return { ...g, score: sameCategory + sharedTags };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (related.length === 0) return null;

  const sectionTitle = locale === 'zh' ? '相关攻略' : locale === 'ja' ? '関連ガイド' : 'Related Guides';

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-base font-semibold text-game-text">{sectionTitle}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((g) => {
          const title = getGuideTitleForGame(gameId, g, locale);
          const summary = getGuideSummaryForGame(gameId, g, locale);
          return (
            <Link
              key={g.id}
              href={`/${gameId}/guides/${g.id}` as '/'}
              className="group rounded-lg border border-game-border bg-game-surface p-3 transition-all hover:border-game-primary"
            >
              <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">{title}</h3>
              <p className="text-xs text-game-text-muted line-clamp-2">{summary}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function getGuidesForGame(gameId: string): GuideLike[] {
  switch (gameId) {
    case 'genshin': return genshinGuides;
    case 'starrail': return starrailGuides;
    case 'wuwa': return wuwaGuides;
    case 'nte': return nteGuides;
    case 'zzz': return zzzGuides;
    case 'guihuan': return guihuanGuides;
    case 'ananta': return anantaGuides;
    default: return [];
  }
}

function getGuideTitleForGame(gameId: string, guide: GuideLike, locale: SupportedLocale): string {
  switch (gameId) {
    case 'genshin': return getGenshinGuideTitle(guide as unknown as Parameters<typeof getGenshinGuideTitle>[0], locale);
    case 'starrail': return getStarRailGuideTitle(guide as unknown as Parameters<typeof getStarRailGuideTitle>[0], locale);
    case 'wuwa': return getWuWaGuideTitle(guide as unknown as Parameters<typeof getWuWaGuideTitle>[0], locale);
    case 'nte': return getNteGuideTitle(guide as unknown as Parameters<typeof getNteGuideTitle>[0], locale);
    case 'zzz': return getZzzGuideTitle(guide as unknown as Parameters<typeof getZzzGuideTitle>[0], locale);
    case 'guihuan': return getGuihuanGuideTitle(guide as unknown as Parameters<typeof getGuihuanGuideTitle>[0], locale);
    case 'ananta': return getAnantaGuideTitle(guide as unknown as Parameters<typeof getAnantaGuideTitle>[0], locale);
    default: return guide.id;
  }
}

function getGuideSummaryForGame(gameId: string, guide: GuideLike, locale: SupportedLocale): string {
  switch (gameId) {
    case 'genshin': return getGenshinGuideSummary(guide as unknown as Parameters<typeof getGenshinGuideSummary>[0], locale);
    case 'starrail': return getStarRailGuideSummary(guide as unknown as Parameters<typeof getStarRailGuideSummary>[0], locale);
    case 'wuwa': return getWuWaGuideSummary(guide as unknown as Parameters<typeof getWuWaGuideSummary>[0], locale);
    case 'nte': return getNteGuideSummary(guide as unknown as Parameters<typeof getNteGuideSummary>[0], locale);
    case 'zzz': return getZzzGuideSummary(guide as unknown as Parameters<typeof getZzzGuideSummary>[0], locale);
    case 'guihuan': return getGuihuanGuideSummary(guide as unknown as Parameters<typeof getGuihuanGuideSummary>[0], locale);
    case 'ananta': return getAnantaGuideSummary(guide as unknown as Parameters<typeof getAnantaGuideSummary>[0], locale);
    default: return '';
  }
}