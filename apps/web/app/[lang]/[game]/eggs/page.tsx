import { CATEGORY_LABELS, GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import { rocoPublicReviewMetadata } from '@/lib/roco-public-review';
import { RocoPublicReviewPage } from '@/components/wiki/roco-public-review-page';
import {
  getEggPriorityLabel,
  getEggStatusLabel,
  isRocoEggGame,
  ROCO_EGGS,
} from '@/lib/game-data/roco-eggs';

const BASE_URL = 'https://gachia.com';

const COPY = {
  title: {
    zh: '洛克王国世界精灵蛋',
    en: 'Roco Kingdom Eggs',
    ja: 'ロコキングダム 卵',
  },
  subtitle: {
    zh: '整理精灵蛋来源、限时状态、孵化/兑换优先级和待核验事项。第一版是蛋种图鉴与路线说明，不提供未验证的孵化预测。',
    en: 'Track egg sources, limited status, hatch or exchange priorities, and verification notes. This first version is an egg index, not an unverified hatch predictor.',
    ja: '卵の入手先、限定状態、孵化/交換優先度、確認事項を整理します。初版は卵図鑑であり、未確認の孵化予測ではありません。',
  },
  source: { zh: '来源', en: 'Source', ja: '入手先' },
  route: { zh: '推荐路线', en: 'Recommended Route', ja: 'おすすめルート' },
  related: { zh: '相关入口', en: 'Related Pages', ja: '関連ページ' },
  disclaimer: {
    zh: 'Gachia 是非官方资料站。国际服蛋池、孵化概率、保底或活动复刻信息需等 CBT/正式服实测后再确认。',
    en: 'Gachia is an unofficial companion site. Global egg pools, hatch odds, pity rules, and reruns need CBT or launch verification.',
    ja: 'Gachiaは非公式攻略サイトです。国際版の卵プール、孵化確率、保証、復刻はCBTまたは正式版で確認が必要です。',
  },
};

const ROUTE_STEPS = {
  roco: [],
  'roco-cn': [
    { zh: '先换限时活动蛋和可能绝版的精灵蛋。', en: 'Exchange limited and possibly non-rerun eggs first.', ja: '限定・復刻不明の卵を先に交換。' },
    { zh: '再处理异色相关蛋和捕捉辅助蛋。', en: 'Then prioritize shiny-related and catching-utility eggs.', ja: '次に色違い関連と捕獲補助卵。' },
    { zh: '普通资源不足时，常驻蛋可以放到最后。', en: 'When resources are tight, permanent eggs can wait.', ja: '資源不足なら恒常卵は後回し。' },
  ],
} satisfies Record<'roco' | 'roco-cn', Array<Record<SupportedLocale, string>>>;

const RELATED_LINKS = [
  { href: '/merchant', label: { zh: '商人刷新', en: 'Merchant', ja: '商人更新' } },
  { href: '/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
  { href: '/characters', label: { zh: '精灵图鉴', en: 'Jinie wiki', ja: 'ジニー図鑑' } },
  { href: '/type-chart', label: { zh: '属性克制', en: 'Type chart', ja: 'タイプ相性' } },
  { href: '/guides', label: { zh: '攻略百科', en: 'Guides', ja: 'ガイド' } },
];

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    (['roco', 'roco-cn'] as const).map((game) => ({ lang, game })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'roco') return rocoPublicReviewMetadata('eggs', locale);

  if (!isRocoEggGame(gameId)) {
    return { robots: { index: false, follow: false } };
  }

  const gameName = GAMES[gameId].name[locale];
  const label = CATEGORY_LABELS.eggs?.[locale] ?? COPY.title[locale];
  const title = locale === 'zh'
    ? `${gameName}精灵蛋｜蛋种、孵化、活动兑换与异色`
    : locale === 'ja'
      ? `${gameName} 卵｜孵化・イベント交換・色違い`
      : `${gameName} Eggs — Hatch, Event Exchange and Shiny Notes`;
  const description = ensureMetaLength(
    locale === 'zh'
      ? `${gameName}${label}页面整理精灵蛋来源、限时状态、兑换优先级、异色蛋和 CBT 待核验事项，适合活动截止前查漏补缺。`
      : locale === 'ja'
        ? `${gameName}の卵ページ。入手先、限定状態、交換優先度、色違い卵、CBT確認事項を整理し、イベント終了前の確認に使えます。`
        : `${gameName} egg index covering sources, limited status, exchange priority, shiny eggs, and CBT verification notes for event planning.`,
    locale,
  );

  return {
    title,
    description,
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/eggs`, LOCALES),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/eggs`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function RocoEggsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'roco') return <RocoPublicReviewPage route="eggs" locale={locale} />;

  if (!isRocoEggGame(gameId)) return null;

  const eggs = ROCO_EGGS[gameId];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-game-text">{COPY.title[locale]}</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {COPY.subtitle[locale]}
      </p>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {eggs.map((egg) => (
          <article key={egg.id} className="rounded-md border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-game-text">{egg.name[locale]}</h2>
              <span className="rounded-full border border-game-border bg-game-surface-alt px-3 py-1 text-xs text-game-primary">
                {getEggStatusLabel(egg.status, locale)}
              </span>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="mb-1 text-xs text-game-text-muted">{COPY.source[locale]}</dt>
                <dd className="text-game-text">{egg.source[locale]}</dd>
              </div>
              <div>
                <dt className="mb-1 text-xs text-game-text-muted">{getEggPriorityLabel(egg.priority, locale)}</dt>
                <dd className="text-game-text-muted">{egg.note[locale]}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="mb-8 grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-game-text">{COPY.route[locale]}</h2>
          <ol className="space-y-2 text-sm text-game-text-muted">
            {ROUTE_STEPS[gameId].map((step, index) => (
              <li key={step.en} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-game-surface-alt text-xs text-game-primary">
                  {index + 1}
                </span>
                <span>{step[locale]}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-md border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-game-text">{COPY.related[locale]}</h2>
          <div className="flex flex-wrap gap-2">
            {RELATED_LINKS.map((link) => (
              <Link
                key={link.href}
                href={`/${gameId}${link.href}` as '/'}
                className="rounded-full border border-game-border px-3 py-1 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                {link.label[locale]}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-game-text-muted">{COPY.disclaimer[locale]}</p>
        </div>
      </section>
    </div>
  );
}
