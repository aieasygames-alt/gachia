import { CATEGORY_LABELS, GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import { rocoPublicReviewMetadata } from '@/lib/roco-public-review';
import { RocoPublicReviewPage } from '@/components/wiki/roco-public-review-page';
import {
  getPriorityLabel,
  getStatusLabel,
  isRocoMerchantGame,
  ROCO_MERCHANTS,
} from '@/lib/game-data/roco-merchants';

const BASE_URL = 'https://gachia.com';

const COPY = {
  title: {
    zh: '洛克王国世界商人刷新',
    en: 'Roco Kingdom Merchant Refresh',
    ja: 'ロコキングダム 商人更新',
  },
  subtitle: {
    zh: '查看远行商人、活动商店和 CBT 待核验商店的推荐购买项。当前不是实时库存，具体位置和商品以游戏内当天显示为准。',
    en: 'Track recommended buys from wandering merchants, event shops, and CBT merchant watchlists. This is not live stock; confirm exact locations and items in game.',
    ja: '行商人、イベントショップ、CBT確認待ち商店の購入優先度を確認。リアルタイム在庫ではないため、位置と商品はゲーム内表示を基準にしてください。',
  },
  location: { zh: '位置', en: 'Location', ja: '場所' },
  refresh: { zh: '刷新', en: 'Refresh', ja: '更新' },
  updated: { zh: '更新', en: 'Updated', ja: '更新' },
  items: { zh: '推荐商品', en: 'Recommended Items', ja: 'おすすめ商品' },
  related: { zh: '相关入口', en: 'Related Pages', ja: '関連ページ' },
  disclaimer: {
    zh: 'Gachia 是非官方资料站。本页用于整理购买优先级和待核验清单，不保证库存实时同步。',
    en: 'Gachia is an unofficial companion site. This page organizes buying priorities and verification notes; it does not guarantee live inventory.',
    ja: 'Gachiaは非公式攻略サイトです。このページは購入優先度と確認メモを整理するもので、在庫のリアルタイム同期は保証しません。',
  },
};

const RELATED_LINKS = [
  { href: '/guides/daily-events-merchant-guide', label: { zh: '今日必做', en: 'Daily checklist', ja: '今日やること' }, cnOnly: true },
  { href: '/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
  { href: '/map', label: { zh: '地图资源', en: 'Map resources', ja: '地図資源' } },
  { href: '/type-chart', label: { zh: '属性克制', en: 'Type chart', ja: 'タイプ相性' } },
  { href: '/characters', label: { zh: '精灵图鉴', en: 'Jinie wiki', ja: 'ジニー図鑑' } },
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

  if (gameId === 'roco') return rocoPublicReviewMetadata('merchant', locale);

  if (!isRocoMerchantGame(gameId)) {
    return { robots: { index: false, follow: false } };
  }

  const gameName = GAMES[gameId].name[locale];
  const label = CATEGORY_LABELS.merchant?.[locale] ?? COPY.title[locale];
  const title = locale === 'zh'
    ? `${gameName}商人刷新｜远行商人、活动商店与购买优先级`
    : locale === 'ja'
      ? `${gameName} 商人更新｜行商人・イベントショップ`
      : `${gameName} Merchant Refresh — Wandering and Event Shops`;
  const description = ensureMetaLength(
    locale === 'zh'
      ? `${gameName}${label}，整理远行商人、活动商店、捕捉球、经验果、天赋刷新卡和限时商品的购买优先级，并标注待核验状态。`
      : locale === 'ja'
        ? `${gameName}の商人更新まとめ。行商人、イベントショップ、捕獲アイテム、経験果、天賦素材、限定商品の優先度と確認状態を整理。`
        : `${gameName} merchant refresh guide covering wandering merchants, event shops, capture items, XP fruits, talent resets, limited goods, and verification status.`,
    locale,
  );

  return {
    title,
    description,
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/merchant`, LOCALES),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/merchant`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function RocoMerchantPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'roco') return <RocoPublicReviewPage route="merchant" locale={locale} />;

  if (!isRocoMerchantGame(gameId)) return null;

  const merchants = ROCO_MERCHANTS[gameId];
  const relatedLinks = RELATED_LINKS.filter((link) => !link.cnOnly || gameId === 'roco-cn');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-game-text">{COPY.title[locale]}</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {COPY.subtitle[locale]}
      </p>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        {merchants.map((merchant) => (
          <article key={merchant.id} className="rounded-md border border-game-border bg-game-surface p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-game-text">{merchant.name[locale]}</h2>
                <p className="mt-1 text-xs text-game-text-muted">
                  {COPY.updated[locale]} {merchant.updatedAt}
                </p>
              </div>
              <span className="rounded-full border border-game-border bg-game-surface-alt px-3 py-1 text-xs text-game-primary">
                {getStatusLabel(merchant.status, locale)}
              </span>
            </div>

            <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded border border-game-border bg-game-surface-alt p-3">
                <dt className="mb-1 text-xs text-game-text-muted">{COPY.location[locale]}</dt>
                <dd className="text-game-text">{merchant.location[locale]}</dd>
              </div>
              <div className="rounded border border-game-border bg-game-surface-alt p-3">
                <dt className="mb-1 text-xs text-game-text-muted">{COPY.refresh[locale]}</dt>
                <dd className="text-game-text">{merchant.refresh[locale]}</dd>
              </div>
            </dl>

            <h3 className="mb-3 text-sm font-semibold text-game-text">{COPY.items[locale]}</h3>
            <div className="space-y-2">
              {merchant.items.map((item) => (
                <div key={item.name.en} className="rounded border border-game-border bg-game-surface-alt p-3">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-game-text">{item.name[locale]}</span>
                    <span className="rounded bg-game-surface px-2 py-0.5 text-xs text-game-primary">
                      {getPriorityLabel(item.priority, locale)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-game-text-muted">{item.note[locale]}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="mb-8 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-md border border-game-border bg-game-surface p-4">
          <p className="text-sm leading-relaxed text-game-text-muted">{COPY.disclaimer[locale]}</p>
        </div>
        <div className="rounded-md border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-game-text">{COPY.related[locale]}</h2>
          <div className="flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={`/${gameId}${link.href}` as '/'}
                className="rounded-full border border-game-border px-3 py-1 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                {link.label[locale]}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
