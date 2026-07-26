import type { Metadata } from 'next';
import { LOCALES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';
import { LIVE_CALENDAR_EVENTS, LIVE_UPDATED_AT, sortCalendarEvents } from '@/lib/live-content';
import { CalendarClient } from './calendar-client';

const TITLE = {
  zh: '跨游戏日历',
  en: 'Cross-Game Calendar',
  ja: 'クロスゲームカレンダー',
};

const DESCRIPTION = {
  zh: '查看 Gachia 重点游戏的版本更新、卡池、兑换码期限和活动节点，支持按游戏过滤并跳转到对应详情页。',
  en: 'Track version updates, banners, code deadlines, and events across Gachia priority games with game filters and direct detail links.',
  ja: 'Gachia の注目ゲームの版本更新、バナー、コード期限、イベントをゲーム別に確認できます。',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;

  return {
    title: `${TITLE[locale]} - Gachia`,
    description: DESCRIPTION[locale],
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/calendar`, LOCALES),
  };
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;

  return (
    <CalendarClient
      events={sortCalendarEvents(LIVE_CALENDAR_EVENTS)}
      lastUpdatedAt={LIVE_UPDATED_AT}
      locale={locale}
    />
  );
}
