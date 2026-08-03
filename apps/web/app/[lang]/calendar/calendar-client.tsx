'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Clock3, Filter, Radio } from 'lucide-react';
import { GAMES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import type { LiveCalendarEvent, LiveCalendarEventType } from '@/lib/live-content';
import { localizeText } from '@/lib/live-content';

const EVENT_LABELS: Record<LiveCalendarEventType, Record<SupportedLocale, string>> = {
  banner_start: { zh: '卡池开始', en: 'Banner Start', ja: 'バナー開始' },
  banner_end: { zh: '卡池结束', en: 'Banner End', ja: 'バナー終了' },
  version_release: { zh: '版本更新', en: 'Version Release', ja: '版本更新' },
  livestream: { zh: '直播', en: 'Livestream', ja: '配信' },
  code_expiry: { zh: '兑换码期限', en: 'Code Deadline', ja: 'コード期限' },
  event_start: { zh: '活动开始', en: 'Event Start', ja: 'イベント開始' },
  event_end: { zh: '活动结束', en: 'Event End', ja: 'イベント終了' },
};

function t(locale: SupportedLocale, zh: string, en: string, ja: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? ja : en;
}

function formatDate(date: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

function getEventState(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(`${date}T00:00:00Z`);
  const diffDays = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'past';
  if (diffDays <= 7) return 'soon';
  return 'upcoming';
}

const SEARCH_ROUTES: Array<{
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  links: Array<{
    href: string;
    label: Record<SupportedLocale, string>;
  }>;
}> = [
  {
    title: {
      zh: '当前与下期卡池',
      en: 'Current and next banners',
      ja: '現在と次回バナー',
    },
    description: {
      zh: '优先查看当前卡池、下期卡池和保底节点，再决定抽卡或资源预留。',
      en: 'Start with current banners, next banners, and pity timing before spending pulls or saving resources.',
      ja: '現在バナー、次回バナー、天井タイミングを先に確認してからガチャや資源温存を決めます。',
    },
    links: [
      { href: '/wuwa/guides/banner-schedule-guide', label: { zh: '鸣潮当前卡池', en: 'WuWa current banners', ja: '鳴潮現在バナー' } },
      { href: '/starrail/guides/banner-schedule-guide', label: { zh: '崩铁当前跃迁', en: 'HSR current warps', ja: 'HSR現在跳躍' } },
      { href: '/genshin/guides/banner-schedule-guide', label: { zh: '原神当前卡池', en: 'Genshin current banners', ja: '原神現在バナー' } },
      { href: '/zzz/guides/banner-schedule-guide', label: { zh: '绝区零当前卡池', en: 'ZZZ current banners', ja: 'ZZZ現在バナー' } },
    ],
  },
  {
    title: {
      zh: '版本更新节点',
      en: 'Version release hubs',
      ja: '版本更新ハブ',
    },
    description: {
      zh: '把版本上线、新角色、平台入坑和活动路线放在同一个日历节奏里。',
      en: 'Connect patch dates, new characters, platform starters, and event routes in one rhythm.',
      ja: '版本日、新キャラ、平台入門、イベント導線をまとめます。',
    },
    links: [
      { href: '/zzz/version', label: { zh: 'ZZZ 3.1', en: 'ZZZ v3.1', ja: 'ZZZ v3.1' } },
      { href: '/wuwa/version', label: { zh: '鸣潮 3.5', en: 'WuWa v3.5', ja: '鳴潮 v3.5' } },
      { href: '/starrail/version', label: { zh: '崩铁 4.4', en: 'HSR v4.4', ja: 'HSR v4.4' } },
      { href: '/nte/version', label: { zh: '异环 1.2', en: 'NTE v1.2', ja: 'NTE v1.2' } },
    ],
  },
  {
    title: {
      zh: '兑换码与限时奖励',
      en: 'Codes and limited rewards',
      ja: 'コードと限定報酬',
    },
    description: {
      zh: '抽卡前先确认直播码、版本码、邮件补偿和限时奖励是否已经领取。',
      en: 'Before planning pulls, check livestream codes, patch codes, mail compensation, and limited rewards.',
      ja: 'ガチャ前に配信コード、版本コード、補償、限定報酬を確認します。',
    },
    links: [
      { href: '/starrail/redeem-codes', label: { zh: '崩铁兑换码', en: 'HSR codes', ja: 'HSRコード' } },
      { href: '/wuwa/redeem-codes', label: { zh: '鸣潮兑换码', en: 'WuWa codes', ja: '鳴潮コード' } },
      { href: '/zzz/redeem-codes', label: { zh: 'ZZZ 兑换码', en: 'ZZZ codes', ja: 'ZZZコード' } },
      { href: '/genshin/redeem-codes', label: { zh: '原神兑换码', en: 'Genshin codes', ja: '原神コード' } },
    ],
  },
];

export function CalendarClient({
  events,
  lastUpdatedAt,
  locale,
}: {
  events: LiveCalendarEvent[];
  lastUpdatedAt: string;
  locale: SupportedLocale;
}) {
  const games = useMemo(() => {
    const ids = new Set(events.map((event) => event.gameId));
    return [...ids].filter((gameId) => GAMES[gameId]);
  }, [events]);
  const [selectedGame, setSelectedGame] = useState<GameId | 'all'>('all');
  const filteredEvents = selectedGame === 'all'
    ? events
    : events.filter((event) => event.gameId === selectedGame);
  const upcomingCount = events.filter((event) => getEventState(event.startsAt) !== 'past').length;

  return (
    <div className="container mx-auto px-4 py-6">
      <section className="mb-6 rounded-2xl border border-game-border bg-game-surface p-6 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-game-primary/10 text-game-primary">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
            {t(locale, '更新时间', 'Updated', '更新')}: {formatDate(lastUpdatedAt, locale)}
          </span>
          <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
            {t(locale, '时区', 'Timezone', 'タイムゾーン')}: Asia/Shanghai
          </span>
        </div>
        <h1 className="mb-3 text-3xl font-bold text-game-text">
          {t(locale, '跨游戏日历', 'Cross-Game Calendar', 'クロスゲームカレンダー')}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-game-text-muted">
          {t(
            locale,
            '把当前卡池、下期卡池、版本更新、兑换码期限和活动节点放到同一张清单里。选择游戏后，可以直接跳到对应版本页、卡池攻略或兑换码页。',
            'Track current banners, next banners, version releases, code deadlines, and events in one list. Filter by game, then jump into the related version hub, banner guide, or code page.',
            '現在バナー、次回バナー、版本更新、コード期限、イベントを一つの一覧で確認できます。ゲームで絞り込み、関連ページへ移動できます。'
          )}
        </p>
      </section>

      <section className="mb-6 grid gap-3 lg:grid-cols-3">
        {SEARCH_ROUTES.map((route) => (
          <article key={route.title.en} className="rounded-2xl border border-game-border bg-game-surface p-4">
            <h2 className="text-base font-semibold text-game-text">{route.title[locale]}</h2>
            <p className="mt-2 text-sm leading-relaxed text-game-text-muted">
              {route.description[locale]}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {route.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as '/'}
                  className="rounded-full border border-game-border bg-game-surface-alt px-3 py-1.5 text-xs text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
                >
                  {link.label[locale]}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric label={t(locale, '追踪事件', 'Tracked Events', '追跡イベント')} value={events.length} />
        <Metric label={t(locale, '未来节点', 'Upcoming Nodes', '今後の予定')} value={upcomingCount} />
        <Metric label={t(locale, '覆盖游戏', 'Games Covered', '対象ゲーム')} value={games.length} />
      </section>

      <section className="mb-6 rounded-2xl border border-game-border bg-game-surface p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-game-text">
          <Filter className="h-4 w-4 text-game-primary" aria-hidden="true" />
          {t(locale, '按游戏过滤', 'Filter by game', 'ゲームで絞り込み')}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedGame('all')}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              selectedGame === 'all'
                ? 'border-game-primary bg-game-primary/10 text-game-primary'
                : 'border-game-border text-game-text-muted hover:border-game-primary hover:text-game-primary'
            }`}
          >
            {t(locale, '全部', 'All', 'すべて')}
          </button>
          {games.map((gameId) => (
            <button
              key={gameId}
              type="button"
              onClick={() => setSelectedGame(gameId)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selectedGame === gameId
                  ? 'bg-game-primary/10 text-game-primary'
                  : 'border-game-border text-game-text-muted hover:border-game-primary hover:text-game-primary'
              }`}
              style={{ borderColor: selectedGame === gameId ? GAMES[gameId].theme.primary : undefined }}
            >
              {GAMES[gameId].name[locale]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {filteredEvents.map((event) => {
          const game = GAMES[event.gameId];
          const state = getEventState(event.startsAt);
          return (
            <Link
              key={event.id}
              href={event.href as '/'}
              className="grid gap-4 rounded-2xl border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary md:grid-cols-[9rem_1fr_auto]"
            >
              <div className="flex items-center gap-3 md:block">
                <div className="text-lg font-bold text-game-text">{formatDate(event.startsAt, locale)}</div>
                <div className="mt-1 text-xs text-game-text-muted">{event.timezone}</div>
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full border px-2 py-0.5 text-xs font-medium"
                    style={{ borderColor: game.theme.primary + '66', color: game.theme.primary }}
                  >
                    {game.name[locale]}
                  </span>
                  <span className="rounded-full bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                    {EVENT_LABELS[event.type][locale]}
                  </span>
                  <span className="rounded-full bg-game-bg px-2 py-0.5 text-xs text-game-text-muted">
                    {state === 'past'
                      ? t(locale, '已发生', 'Past', '終了')
                      : state === 'soon'
                        ? t(locale, '7 天内', 'Within 7 days', '7日以内')
                        : t(locale, '即将到来', 'Upcoming', '予定')}
                  </span>
                </div>
                <h2 className="mb-1 text-base font-semibold text-game-text">
                  {localizeText(event.title, locale)}
                </h2>
                <p className="text-sm leading-relaxed text-game-text-muted">
                  {localizeText(event.summary, locale)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-game-primary">
                <Radio className="h-4 w-4" aria-hidden="true" />
                {t(locale, '打开', 'Open', '開く')}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 rounded-2xl border border-game-border bg-game-surface p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-game-text">
          <Clock3 className="h-4 w-4 text-game-primary" aria-hidden="true" />
          {t(locale, '维护说明', 'Maintenance Note', 'メンテナンス')}
        </div>
        <p className="text-sm leading-relaxed text-game-text-muted">
          {t(
            locale,
            '首版日历使用站内静态情报数据，后续可以迁移到 D1 或后台配置。高时效内容以对应版本页、卡池页和兑换码页的最后更新时间为准。',
            'This first calendar uses curated static site data. It can later move to D1 or an editorial backend. For fast-changing details, use the linked version, banner, and code pages as the source of truth.',
            '初版はサイト内の静的データを使用します。今後 D1 や編集バックエンドへ移行できます。変化の早い内容はリンク先ページの最終更新を基準にしてください。'
          )}
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-game-border bg-game-surface p-4">
      <div className="text-xs text-game-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-game-text">{value}</div>
    </div>
  );
}
