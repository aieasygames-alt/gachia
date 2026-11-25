import { StarRailEvents } from '@/components/wiki/starrail-events';
import { OfficialUpdates } from '@/components/wiki/official-updates';
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
import { ZZZ_EVENTS, ZZZ_EVENT_STATUS_COPY, ZZZ_EVENT_UPDATED_AT, type ZzzEventStatus } from '@/lib/game-data/zzz-events';
import { ENDFIELD_EVENTS, ENDFIELD_EVENT_STATUS_COPY, ENDFIELD_EVENT_UPDATED_AT, type EndfieldEventStatus } from '@/lib/game-data/endfield-events';
import { WUWA_EVENTS, WUWA_EVENT_STATUS_COPY, WUWA_EVENT_UPDATED_AT, type WuWaEventStatus } from '@/lib/game-data/wuwa-events';

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
    (['roco', 'roco-cn', 'wuwa', 'zzz', 'endfield'] as const).map((game) => ({ lang, game })),
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

  if (!isRocoEventGame(gameId) && gameId !== 'wuwa' && gameId !== 'zzz' && gameId !== 'endfield') {
    return { robots: { index: false, follow: false } };
  }

  if (gameId === 'zzz') {
    const title = locale === 'zh'
      ? '绝区零活动看板｜兑换码、养成与版本观察'
      : locale === 'ja'
        ? 'ゼンレスゾーンゼロ 活動ボード｜コード・育成・バージョン情報'
        : 'Zenless Zone Zero Event Board — Codes, Planning and Version Watch';
    const description = ensureMetaLength(
      locale === 'zh'
        ? '绝区零活动看板集中当前可执行事项、兑换码检查、双队规划与养成入口，并清晰区分待确认的版本和卡池观察内容。'
        : locale === 'ja'
          ? 'ゼンレスゾーンゼロの活動ボード。コード確認、編成・育成の導線、未確定のバージョンやバナー情報を区別して整理します。'
          : 'Zenless Zone Zero event board for current actions, code checks, roster planning, resource routes, and clearly labeled preview watch items.',
      locale,
    );

    return {
      title,
      description,
      alternates: buildLocalizedAlternates(locale, (entry) => `/${entry}/zzz/events`, LOCALES),
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/${locale}/zzz/events`,
        siteName: 'Gachia',
        images: [{ url: `${BASE_URL}/images/og/zzz.webp`, width: 1200, height: 630 }],
        locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
      },
    };
  }

  if (gameId === 'endfield') {
    const title = locale === 'zh'
      ? '明日方舟：终末地活动看板｜测试复盘、AIC 与官方状态'
      : locale === 'ja'
        ? 'アークナイツ：エンドフィールド 状態ボード｜テストまとめ・AIC・公式情報'
        : 'Arknights: Endfield Status Board — Test Recap, AIC, and Official Watch';
    const description = ensureMetaLength(
      locale === 'zh'
        ? '终末地国服丹青渡活动看板：寻访阶段、补偿资格、服务器时间、工业更新与历史测试分流。'
        : locale === 'ja'
          ? 'エンドフィールド中国版丹青渡の尋訪段階、補償資格、サーバー時刻、工業更新と旧テストを整理。'
          : 'Endfield CN Danqingdu event board: search phases, compensation eligibility, server time, industry updates and historical test scope.',
      locale,
    );

    return {
      title,
      description,
      alternates: buildLocalizedAlternates(locale, (entry) => `/${entry}/endfield/events`, LOCALES),
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/${locale}/endfield/events`,
        siteName: 'Gachia',
        images: [{ url: `${BASE_URL}/images/og/endfield.webp`, width: 1200, height: 630 }],
        locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
      },
    };
  }

  if (gameId === 'wuwa') {
    const title = locale === 'zh'
      ? '鸣潮 3.7 活动看板｜梦枢天罗、心与活动时间'
      : locale === 'ja'
        ? '鳴潮 Ver.3.7 イベントボード｜夢枢天羅・心・開催時刻'
        : 'Wuthering Waves v3.7 Event Board — Simulacrum Nexus, Hsin and Event Timing';
    const description = ensureMetaLength(
      locale === 'zh'
        ? '鸣潮 3.7 活动看板整理梦枢天罗、新角色唤取、限时战斗活动、资源下载检查与后续活动的官方核验入口。'
        : locale === 'ja'
          ? '鳴潮Ver.3.7の夢枢天羅、新キャラ集音、期間限定戦闘、リソースDL確認、今後のイベントを公式情報に基づき整理します。'
          : 'Official-status v3.7 board for the Simulacrum Nexus, Hsin Convene, limited combat events, resource-download checks, and upcoming event verification.',
      locale,
    );

    return {
      title,
      description,
      alternates: buildLocalizedAlternates(locale, (entry) => `/${entry}/wuwa/events`, LOCALES),
      openGraph: {
        title,
        description,
        url: `${BASE_URL}/${locale}/wuwa/events`,
        siteName: 'Gachia',
        images: [{ url: `${BASE_URL}/images/og/wuwa.webp`, width: 1200, height: 630 }],
        locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
      },
    };
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
  if (gameId === 'starrail') return <StarRailEvents locale={locale} />;

  if (gameId === 'zzz') return <><ZzzEventsPage locale={locale} /><OfficialUpdates gameId="zzz" locale={locale} /></>;
  if (gameId === 'endfield') return <EndfieldEventsPage locale={locale} />;
  if (gameId === 'wuwa') return <><WuWaEventsPage locale={locale} /><OfficialUpdates gameId="wuwa" locale={locale} /></>;

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
      {gameId === 'roco' && <aside data-roco-schedule-review className="mb-6 rounded-md border border-game-border bg-game-surface p-4 text-sm text-game-text-muted">
        {locale === 'zh'
          ? '测试日程待核实：旧 Steam App ID 对应其他游戏，已撤回其确认支持。报名与开测条目暂不参与日历分类，不代表测试取消；旧攻略仍在复核。'
          : locale === 'ja'
            ? 'テスト日程未確認：旧Steam App IDは別のゲームを示すため、確認根拠を撤回しました。応募・開始情報はカレンダー分類から外しています。中止告知ではなく、旧ガイドは再確認中です。'
            : 'Test schedule unverified: the old Steam App ID identifies another game and its confirmation is withdrawn. Signup and test entries are excluded from calendar categories, not declared cancelled; older guides remain under review.'}
      </aside>}

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
  const statuses: ZzzEventStatus[] = ['action', 'planning', 'watch'];
  return <div><h1 className="mb-2 text-2xl font-bold text-game-text">{locale === 'zh' ? '绝区零版本活动看板' : locale === 'ja' ? 'ZZZ バージョン・イベント看板' : 'ZZZ Version and Event Board'}</h1><p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">{locale === 'zh' ? `更新时间：${ZZZ_EVENT_UPDATED_AT}。此页只整理可执行的版本事项；未有官方公告支撑的日期、角色和奖励不会伪装成已上线活动。` : locale === 'ja' ? `更新日：${ZZZ_EVENT_UPDATED_AT}。実行できるバージョン事項だけを整理し、公式告知のない日程・キャラ・報酬は開催済みとして扱いません。` : `Updated ${ZZZ_EVENT_UPDATED_AT}. This board lists actionable version items; dates, characters, and rewards without official notices are not presented as live events.`}</p><div className="space-y-6">{statuses.map((status) => <section key={status}><h2 className="mb-3 text-base font-semibold text-game-text">{ZZZ_EVENT_STATUS_COPY[status][locale]}</h2><div className="grid gap-4 md:grid-cols-2">{ZZZ_EVENTS.filter((entry) => entry.status === status).map((entry) => <article key={entry.id} className="border border-game-border bg-game-surface p-4"><span className="text-xs font-semibold text-game-primary">{ZZZ_EVENT_STATUS_COPY[entry.status][locale]}</span><h3 className="mt-2 text-lg font-semibold text-game-text">{entry.title[locale]}</h3><p className="mt-2 text-sm leading-6 text-game-text-muted">{entry.summary[locale]}</p><p className="mt-3 text-xs text-game-text-muted">{locale === 'zh' ? '来源：' : locale === 'ja' ? '出典：' : 'Source: '}{entry.source[locale]} · {entry.updatedAt}</p><Link href={entry.href as '/'} className="mt-4 inline-block text-sm font-semibold text-game-primary hover:text-game-accent">{entry.action[locale]} →</Link></article>)}</div></section>)}</div></div>;
}

function EndfieldEventsPage({ locale }: { locale: SupportedLocale }) {
  const statuses: EndfieldEventStatus[] = ['action', 'planning', 'watch'];
  return <div><h1 className="mb-2 text-2xl font-bold text-game-text">{locale === 'zh' ? '终末地国服丹青渡活动看板' : locale === 'ja' ? 'エンドフィールド中国版丹青渡イベント' : 'Endfield CN Danqingdu Event Board'}</h1><p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">{locale === 'zh' ? `更新时间：${ENDFIELD_EVENT_UPDATED_AT}。本页按国服官方公告列出寻访、签到、补偿与系统更新；时间保留服务器时间口径，不直接外推国际服。` : locale === 'ja' ? `更新日：${ENDFIELD_EVENT_UPDATED_AT}。中国版告知に基づく尋訪・ログイン・補償・システム更新です。サーバー時刻を保持し、国際版へ流用しません。` : `Updated ${ENDFIELD_EVENT_UPDATED_AT}. CN notice facts for searches, sign-in, compensation and systems. Server times are retained and do not establish international timing.`}</p><div className="space-y-6">{statuses.map((status) => <section key={status}><h2 className="mb-3 text-base font-semibold text-game-text">{ENDFIELD_EVENT_STATUS_COPY[status][locale]}</h2><div className="grid gap-4 md:grid-cols-2">{ENDFIELD_EVENTS.filter((entry) => entry.status === status).map((entry) => <article key={entry.id} className="border border-game-border bg-game-surface p-4"><span className="text-xs font-semibold text-game-primary">{ENDFIELD_EVENT_STATUS_COPY[entry.status][locale]}</span><h3 className="mt-2 text-lg font-semibold text-game-text">{entry.title[locale]}</h3><p className="mt-2 text-sm leading-6 text-game-text-muted">{entry.summary[locale]}</p><p className="mt-3 text-xs text-game-text-muted">{locale === 'zh' ? '来源：' : locale === 'ja' ? '出典：' : 'Source: '}{entry.source[locale]} · {entry.updatedAt}</p><Link href={entry.href as '/'} className="mt-4 inline-block text-sm font-semibold text-game-primary hover:text-game-accent">{entry.action[locale]} →</Link></article>)}</div></section>)}</div></div>;
}

function WuWaEventsPage({ locale }: { locale: SupportedLocale }) {
  const statuses: WuWaEventStatus[] = ['action', 'planning', 'watch'];
  return <div><h1 className="mb-2 text-2xl font-bold text-game-text">{locale === 'zh' ? '鸣潮 3.7 活动看板' : locale === 'ja' ? '鳴潮 Ver.3.7 イベントボード' : 'Wuthering Waves v3.7 Event Board'}</h1><p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">{locale === 'zh' ? `更新时间：${WUWA_EVENT_UPDATED_AT}。本页只列出官方公告可核验的 3.7 行动、活动时间与排查入口；具体区服时间、前置条件和奖励以游戏内显示为准。` : locale === 'ja' ? `更新日：${WUWA_EVENT_UPDATED_AT}。このページは公式告知で確認できるVer.3.7の行動、開催時刻、確認入口のみを掲載します。サーバー時刻、前提条件、報酬はゲーム内表示を基準にしてください。` : `Updated ${WUWA_EVENT_UPDATED_AT}. This board lists only v3.7 actions, timing, and checks verifiable from official notices. Use the live client for server timing, prerequisites, and rewards.`}</p><div className="space-y-6">{statuses.map((status) => <section key={status}><h2 className="mb-3 text-base font-semibold text-game-text">{WUWA_EVENT_STATUS_COPY[status][locale]}</h2><div className="grid gap-4 md:grid-cols-2">{WUWA_EVENTS.filter((entry) => entry.status === status).map((entry) => <article key={entry.id} className="border border-game-border bg-game-surface p-4"><span className="text-xs font-semibold text-game-primary">{WUWA_EVENT_STATUS_COPY[entry.status][locale]}</span><h3 className="mt-2 text-lg font-semibold text-game-text">{entry.title[locale]}</h3><p className="mt-2 text-sm leading-6 text-game-text-muted">{entry.summary[locale]}</p><p className="mt-3 text-xs text-game-text-muted">{locale === 'zh' ? '来源：' : locale === 'ja' ? '出典：' : 'Source: '}{entry.source[locale]} · {entry.updatedAt}</p><Link href={entry.href as '/'} className="mt-4 inline-block text-sm font-semibold text-game-primary hover:text-game-accent">{entry.action[locale]} →</Link></article>)}</div></section>)}</div></div>;
}
