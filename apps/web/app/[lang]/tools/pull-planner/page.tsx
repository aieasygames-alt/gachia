import type { Metadata } from 'next';
import { LOCALES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';
import { PullPlannerClient } from './pull-planner-client';

const TITLE = {
  zh: '抽卡规划器',
  en: 'Pull Planner',
  ja: 'ガチャ計画ツール',
};

const DESCRIPTION = {
  zh: '跨游戏抽卡规划器，支持原神、星穹铁道、鸣潮和绝区零，估算保底缺口、剩余天数和资源风险。',
  en: 'A cross-game pull planner for Genshin Impact, Honkai: Star Rail, Wuthering Waves, and Zenless Zone Zero with pity-gap and risk estimates.',
  ja: '原神、スターレイル、鳴潮、ゼンレスゾーンゼロ対応のガチャ計画ツール。天井不足、残り日数、リスクを見積もります。',
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
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/tools/pull-planner`, LOCALES),
  };
}

export default async function PullPlannerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;

  return <PullPlannerClient locale={locale} />;
}
