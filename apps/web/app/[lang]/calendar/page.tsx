import type { Metadata } from 'next';
import { LOCALES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';
import { LIVE_CALENDAR_EVENTS, LIVE_UPDATED_AT, sortCalendarEvents } from '@/lib/live-content';
import { CalendarClient } from './calendar-client';

const TITLE = {
  zh: '跨游戏当前卡池、版本与兑换码日历',
  en: 'Gacha Banner Calendar: Current & Next Banners, Codes and Version Dates',
  ja: 'ガチャ現在バナー・版本・コードカレンダー',
};

const DESCRIPTION = {
  zh: '查看原神、崩铁、鸣潮、绝区零、异环等游戏的当前卡池、下期卡池、版本日期、兑换码期限和活动节点。',
  en: 'Track current banners, next banners, version dates, redeem-code deadlines, and events across Genshin, HSR, WuWa, ZZZ, NTE, and other Gachia games.',
  ja: '原神、スターレイル、鳴潮、ZZZ、NTE などの現在バナー、次回バナー、版本日、コード期限、イベントを確認できます。',
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
