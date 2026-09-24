import { CATEGORY_LABELS, GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';
import {
  getEventCategoryLabel,
  getEventStatus,
  getEventStatusLabel,
  isRocoEventGame,
  ROCO_EVENTS,
  type RocoEventStatus,
} from '@/lib/game-data/roco-events';

const BASE_URL = 'https://gachia.com';
const SNAPSHOT_DATE = new Date('2026-09-07T00:00:00Z');

const COPY = {
  title: {
    zh: '洛克王国世界活动日历',
    en: 'Roco Kingdom Events Calendar',
    ja: 'ロコキングダム イベントカレンダー',
  },
  subtitle: {
    zh: '按进行中、即将开始和已结束整理 Roco 活动、CBT、赛季、兑换码和奖励节点。当前为手动维护快照，时间以官方公告和游戏内显示为准。',
    en: 'Track Roco events, CBT dates, seasons, codes, and reward windows by live, upcoming, and ended status. This is a maintained snapshot; official notices and the live client are the source of truth.',
    ja: 'Rocoのイベント、CBT、シーズン、コード、報酬期間を開催中・近日開始・終了で整理。手動更新のスナップショットで、公式告知とゲーム内表示を基準にしてください。',
  },
  rewards: { zh: '奖励', en: 'Rewards', ja: '報酬' },
  source: { zh: '来源', en: 'Source', ja: '出典' },
  updated: { zh: '更新', en: 'Updated', ja: '更新' },
  related: { zh: '相关入口', en: 'Related Pages', ja: '関連ページ' },
  empty: {
    zh: '暂无该状态活动。',
    en: 'No events in this status yet.',
    ja: 'この状態のイベントはまだありません。',
  },
};

const STATUS_ORDER: RocoEventStatus[] = ['live', 'upcoming', 'ended'];

const RELATED_LINKS = [
  { href: '/guides', label: { zh: '攻略百科', en: 'Guides', ja: 'ガイド' } },
  { href: '/merchant', label: { zh: '商人刷新', en: 'Merchant', ja: '商人更新' } },
  { href: '/redeem-codes', label: { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' } },
  { href: '/eggs', label: { zh: '精灵蛋', en: 'Eggs', ja: '卵' } },
  { href: '/map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
];

function formatDate(date: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

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

  if (!isRocoEventGame(gameId)) {
    return { robots: { index: false, follow: false } };
  }

  const gameName = GAMES[gameId].name[locale];
  const label = CATEGORY_LABELS.events?.[locale] ?? COPY.title[locale];
  const title = locale === 'zh'
    ? `${gameName}活动日历｜CBT、赛季、兑换码与奖励时间`
    : locale === 'ja'
      ? `${gameName} イベントカレンダー｜CBT・シーズン・コード`
      : `${gameName} Events Calendar — CBT, Seasons, Codes and Rewards`;
  const description = ensureMetaLength(
    locale === 'zh'
      ? `${gameName}${label}按进行中、即将开始和已结束整理 CBT、赛季、兑换码、活动商店和奖励时间，方便每天查漏补缺。`
      : locale === 'ja'
        ? `${gameName}のイベントカレンダー。CBT、シーズン、コード、ショップ、報酬期間を開催中・近日開始・終了で確認できます。`
        : `${gameName} events calendar tracking CBT windows, seasons, codes, event shops, and reward deadlines by live, upcoming, and ended status.`,
    locale,
  );

  return {
    title,
    description,
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/events`, LOCALES),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/events`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function RocoEventsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'zzz') return <ZzzEventsPage locale={locale} />;

  if (!isRocoEventGame(gameId)) return null;

  const events = ROCO_EVENTS[gameId].map((event) => ({
    ...event,
    status: getEventStatus(event, SNAPSHOT_DATE),
  }));
  const counts = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, events.filter((event) => event.status === status).length]),
  ) as Record<RocoEventStatus, number>;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-game-text">{COPY.title[locale]}</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {COPY.subtitle[locale]}
      </p>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        {STATUS_ORDER.map((status) => (
          <a
            key={status}
            href={`#${status}`}
            className="rounded-md border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary"
          >
            <span className="text-xs text-game-text-muted">{getEventStatusLabel(status, locale)}</span>
            <span className="mt-1 block text-2xl font-bold text-game-primary">{counts[status]}</span>
          </a>
        ))}
      </section>

      {STATUS_ORDER.map((status) => {
        const group = events.filter((event) => event.status === status);
        return (
          <section key={status} id={status} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-game-text">{getEventStatusLabel(status, locale)}</h2>
            {group.length === 0 ? (
              <div className="rounded-md border border-dashed border-game-border p-6 text-sm text-game-text-muted">
                {COPY.empty[locale]}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {group.map((event) => (
                  <article key={event.id} className="rounded-md border border-game-border bg-game-surface p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-game-text">{event.title[locale]}</h3>
                        <p className="mt-1 text-xs text-game-text-muted">
                          {formatDate(event.startAt, locale)} - {formatDate(event.endAt, locale)}
                        </p>
                      </div>
                      <span className="rounded-full border border-game-border bg-game-surface-alt px-3 py-1 text-xs text-game-primary">
                        {getEventCategoryLabel(event.category, locale)}
                      </span>
                    </div>
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="mb-1 text-xs text-game-text-muted">{COPY.rewards[locale]}</dt>
                        <dd className="text-game-text">{event.rewards[locale]}</dd>
                      </div>
                      <div>
                        <dt className="mb-1 text-xs text-game-text-muted">{COPY.source[locale]}</dt>
                        <dd className="text-game-text-muted">{event.source[locale]}</dd>
                      </div>
                      <div>
                        <dt className="mb-1 text-xs text-game-text-muted">{COPY.updated[locale]}</dt>
                        <dd className="text-game-text-muted">{event.updatedAt}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded-md border border-game-border bg-game-surface p-4">
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
      </section>
    </div>
  );
}

function ZzzEventsPage({ locale }: { locale: SupportedLocale }) {
  const entries = [
    { id: 'version-watch', status: 'watch', title: { zh: '3.3 前瞻与下期卡池观察', en: 'v3.3 preview and next-banner watch', ja: 'v3.3前瞻と次回バナー注目' }, body: { zh: '尚未确认的角色、时间和奖励只保留观察状态；出现官方公告后再更新为具体活动。', en: 'Unconfirmed characters, dates, and rewards remain watch-only until an official notice is published.', ja: '未確認のキャラ、日程、報酬は公式告知まで注目状態として扱います。' }, href: '/zzz/version' },
    { id: 'codes', status: 'live', title: { zh: '兑换码与邮件检查', en: 'Codes and mail check', ja: 'コードとメール確認' }, body: { zh: '兑换码页按 active、expired、unknown 分层；领取前先核对有效期和官方来源。', en: 'The code page separates active, expired, and unknown states. Verify expiry and official source before redeeming.', ja: 'コードページはactive、expired、unknownを分けます。交換前に期限と公式出典を確認してください。' }, href: '/zzz/redeem-codes' },
    { id: 'resources', status: 'route', title: { zh: '菲林与养成资源安排', en: 'Polychrome and progression planning', ja: 'ポリクロームと育成資源計画' }, body: { zh: '用菲林规划器确认最坏情况资源缺口，再用养成计划器安排代理人、核心技、技能和音擎。', en: 'Use the pull planner for worst-case gaps, then the progression planner for agents, Core Skills, skills, and W-Engines.', ja: 'ガチャ計画で最悪ケースの不足を確認し、育成計画でエージェント、コア、スキル、Wエンジンを整理します。' }, href: '/zzz/gacha' },
  ] as const;
  const label = { live: { zh: '现在可做', en: 'Do now', ja: '今やる' }, watch: { zh: '等待官方确认', en: 'Await official confirmation', ja: '公式確認待ち' }, route: { zh: '资源路线', en: 'Resource route', ja: '資源ルート' } } as const;
  return <div><h1 className="mb-2 text-2xl font-bold text-game-text">{locale === 'zh' ? '绝区零版本活动看板' : locale === 'ja' ? 'ZZZ バージョン・イベント看板' : 'ZZZ Version and Event Board'}</h1><p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">{locale === 'zh' ? '更新时间：2026-09-24。此页只整理可执行的版本事项；未有官方公告支撑的日期、角色和奖励不会伪装成已上线活动。' : locale === 'ja' ? '更新日：2026-09-24。実行できるバージョン事項だけを整理し、公式告知のない日程・キャラ・報酬は開催済みとして扱いません。' : 'Updated 2026-09-24. This board lists actionable version items; dates, characters, and rewards without official notices are not presented as live events.'}</p><div className="grid gap-4 md:grid-cols-3">{entries.map((entry) => <article key={entry.id} className="border border-game-border bg-game-surface p-4"><span className="text-xs font-semibold text-game-primary">{label[entry.status][locale]}</span><h2 className="mt-2 text-lg font-semibold text-game-text">{entry.title[locale]}</h2><p className="mt-2 text-sm leading-6 text-game-text-muted">{entry.body[locale]}</p><Link href={entry.href as '/'} className="mt-4 inline-block text-sm font-semibold text-game-primary hover:text-game-accent">{locale === 'zh' ? '打开对应入口 →' : locale === 'ja' ? '入口を開く →' : 'Open related page →'}</Link></article>)}</div></div>;
}
