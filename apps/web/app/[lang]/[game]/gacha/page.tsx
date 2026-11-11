import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import { notFound } from 'next/navigation';
import type { GameId, SupportedLocale } from '@gachia/core';
import {
  gachaBanners as nteGachaBanners,
  gachaFaqs as nteGachaFaqs,
  getGachaBannerName,
  getGachaBannerDesc,
  getGachaFaqQuestion,
  getGachaFaqAnswer,
} from '@gachia/data/games/nte/gacha';
import { getNteCharacterName, getNteCharacterById } from '@gachia/data/games/nte/characters';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import dynamic from 'next/dynamic';

const ZzzPullPlanner = dynamic(() => import('./zzz-pull-planner').then((mod) => mod.ZzzPullPlanner));

const BASE_URL = 'https://gachia.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  if (game !== 'nte' && game !== 'zzz') return { robots: { index: false, follow: false } };
  const locale = lang as SupportedLocale;
  if (game === 'zzz') {
    const title = locale === 'zh' ? '绝区零菲林规划器｜保底、资源缺口与抽取建议' : locale === 'ja' ? 'ZZZ ポリクローム計画｜天井・資源不足・ガチャ判断' : 'ZZZ Pull Planner — Pity, Resource Gaps and Pull Advice';
    const description = ensureMetaLength(locale === 'zh' ? '绝区零菲林规划器：输入菲林、加密母带、保底状态和音擎目标，估算最坏情况抽数、资源缺口与抽取优先级。' : locale === 'ja' ? 'ZZZのポリクローム計画。所持数、暗号化マスターテープ、天井、Wエンジン目標から最悪ケースと不足を確認。' : 'ZZZ pull planner: enter Polychromes, Encrypted Master Tapes, pity, guarantee, and W-Engine goals to estimate worst-case pulls and resource gaps.', locale);
    return { title, description, alternates: buildLocalizedAlternates(locale, (entry) => `/${entry}/zzz/gacha`, LOCALES) };
  }
  const gameName = GAMES.nte.name[locale];
  const title = locale === 'zh'
    ? `异环祈愿系统 — 概率、保底机制详解`
    : locale === 'ja'
      ? `異環ガチャ — 確率・天井システム`
      : `NTE Gacha — Rates, Pity & Banner Guide`;
  const desc = locale === 'zh'
    ? '异环祈愿系统详解：卡池类型、概率说明、保底机制、天井系统。'
    : locale === 'ja'
      ? '異環ガチャシステムの詳細：ガチャ種類、確率、天井システムの解説。'
      : 'Complete NTE gacha guide: banner types, pull rates, pity system, and guaranteed mechanics.';
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/nte/gacha`, LOCALES);
  const description = ensureMetaLength(desc, locale);

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/nte/gacha`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/nte.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function GachaPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  if (game === 'genshin') notFound();
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId === 'zzz') return <ZzzPullPlanner locale={locale} />;

  if (gameId !== 'nte') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.gacha?.[locale] ?? 'Gacha'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const banners = nteGachaBanners;
  const faqs = nteGachaFaqs;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.gacha?.[locale] ?? 'Gacha'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? '祈愿系统概率与保底机制说明' : locale === 'ja' ? 'ガチャ確率と天井システム' : 'Wish rates and pity system details'}
      </p>

      {/* Banner cards */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-game-text">
          {locale === 'zh' ? '卡池类型' : locale === 'ja' ? 'ガチャ種類' : 'Banner Types'}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map((banner) => (
            <div key={banner.id} className="rounded-lg border border-game-border bg-game-surface p-4">
              <h3 className="mb-2 font-semibold text-game-text">{getGachaBannerName(banner, locale)}</h3>
              <p className="mb-3 text-sm text-game-text-muted">{getGachaBannerDesc(banner, locale)}</p>

              {/* Rates */}
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-game-surface-alt p-2">
                  <p className="text-lg font-bold text-yellow-400">{banner.sRate}</p>
                  <p className="text-xs text-game-text-muted">S {locale === 'zh' ? '级' : '-Rank'}</p>
                </div>
                <div className="rounded bg-game-surface-alt p-2">
                  <p className="text-lg font-bold text-purple-400">{banner.aRate}</p>
                  <p className="text-xs text-game-text-muted">A {locale === 'zh' ? '级' : '-Rank'}</p>
                </div>
                <div className="rounded bg-game-surface-alt p-2">
                  <p className="text-lg font-bold text-blue-400">{banner.bRate}</p>
                  <p className="text-xs text-game-text-muted">B {locale === 'zh' ? '级' : '-Rank'}</p>
                </div>
              </div>

              {/* Pity info */}
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-text-muted">
                  {locale === 'zh' ? '硬保底' : 'Hard Pity'}: {banner.hardPity}
                </span>
                {banner.softPity && (
                  <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-text-muted">
                    {locale === 'zh' ? '软保底' : 'Soft Pity'}: {banner.softPity}
                  </span>
                )}
                {banner.avgPity && (
                  <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-text-muted">
                    {locale === 'zh' ? '平均抽数' : 'Avg Pity'}: {banner.avgPity}
                  </span>
                )}
                {banner.no5050 && (
                  <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                    {locale === 'zh' ? '无50/50' : 'No 50/50'}
                  </span>
                )}
              </div>

              {/* Featured characters */}
              {banner.featured && banner.featured.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-game-text-muted">{locale === 'zh' ? 'UP角色' : 'Featured'}:</span>
                  {banner.featured.map((charId) => {
                    const char = getNteCharacterById(charId);
                    return char ? (
                      <Link key={charId} href={`/nte/characters/${charId}` as '/'}
                        className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary hover:text-game-accent">
                        {getNteCharacterName(char, locale)}
                      </Link>
                    ) : (
                      <span key={charId} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{charId}</span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-primary">
            {locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group rounded-lg border border-game-border bg-game-surface">
                <summary className="cursor-pointer px-4 py-3 font-medium text-game-text transition-colors group-hover:text-game-primary">
                  {getGachaFaqQuestion(faq, locale)}
                </summary>
                <div className="border-t border-game-border px-4 py-3 text-sm leading-relaxed text-game-text-muted">
                  {getGachaFaqAnswer(faq, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
