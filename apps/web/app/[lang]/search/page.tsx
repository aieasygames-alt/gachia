import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LOCALES, type SupportedLocale } from '@gachia/core';
import { SearchPage } from '@/components/search/search-page';

const copy = {
  zh: { title: '站内搜索', description: '搜索角色、武器、材料与套装资料。', fallback: '搜索需要 JavaScript；也可以从首页按游戏浏览资料。', home: '返回首页' },
  en: { title: 'Site Search', description: 'Search characters, weapons, materials, and sets.', fallback: 'Search requires JavaScript. You can also browse games from the homepage.', home: 'Back to home' },
  ja: { title: 'サイト内検索', description: 'キャラ、武器、素材、セットを検索。', fallback: '検索には JavaScript が必要です。ホームからゲーム別の資料も閲覧できます。', home: 'ホームへ' },
};

function asLocale(lang: string): SupportedLocale {
  if (!LOCALES.includes(lang as SupportedLocale)) notFound();
  return lang as SupportedLocale;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = asLocale((await params).lang);
  return { title: copy[locale].title, description: copy[locale].description, robots: { index: false, follow: true }, alternates: { canonical: `https://gachia.com/${locale}/search` } };
}

export default async function Search({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const labels = copy[locale];
  return <div className="mx-auto w-full max-w-3xl px-4 py-10"><h1 className="text-3xl font-bold">{labels.title}</h1><p className="mt-3 text-game-text-muted">{labels.description}</p>
    <Suspense fallback={<p className="my-6">{labels.description}</p>}><SearchPage locale={locale} /></Suspense>
    <noscript><p className="my-6">{labels.fallback}</p></noscript><a className="mt-6 inline-block underline" href={`/${locale}`}>{labels.home}</a>
  </div>;
}
