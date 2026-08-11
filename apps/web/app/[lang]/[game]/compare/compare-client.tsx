'use client';

import type { GameId, SupportedLocale } from '@gachia/core';
import dynamic from 'next/dynamic';
import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';
import type { ReactNode } from 'react';

const GenshinCompare = dynamic(() => import('./genshin-compare-client').then((mod) => mod.GenshinCompare), { loading: () => <CompareLoading /> });
const StarRailCompare = dynamic(() => import('./starrail-compare-client').then((mod) => mod.StarRailCompare), { loading: () => <CompareLoading /> });
const WuWaCompare = dynamic(() => import('./wuwa-compare-client').then((mod) => mod.WuWaCompare), { loading: () => <CompareLoading /> });
const NteCompare = dynamic(() => import('./nte-compare-client').then((mod) => mod.NteCompare), { loading: () => <CompareLoading /> });
const ZzzCompare = dynamic(() => import('./zzz-compare-client').then((mod) => mod.ZzzCompare), { loading: () => <CompareLoading /> });
const GuihunCompare = dynamic(() => import('./guihuan-compare-client').then((mod) => mod.GuihunCompare), { loading: () => <CompareLoading /> });
const SeaCompare = dynamic(() => import('./sea-compare-client').then((mod) => mod.SeaCompare), { loading: () => <CompareLoading /> });
const EndfieldCompare = dynamic(() => import('./endfield-compare-client').then((mod) => mod.EndfieldCompare), { loading: () => <CompareLoading /> });

function CompareLoading() { return <div className="rounded-lg border border-game-border bg-game-surface p-8 text-center text-sm text-game-text-muted">Loading comparison...</div>; }



// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

function getCompareNextSteps(gameId: string, locale: SupportedLocale): NextStepLink[] {
  if (gameId === 'sea') {
    return [
      {
        href: '/sea/characters',
        title: { zh: '看船员图鉴', en: 'Browse Crew', ja: '船員図鑑を見る' },
        description: {
          zh: '先看船员定位和技能，再回到对比页判断会更稳。',
          en: 'Review crew roles and skills first, then compare with more context.',
          ja: 'まず船員の役割とスキルを見てから比較すると判断しやすくなります。',
        },
      },
      {
        href: '/sea/guides/launch-day-guide',
        title: { zh: '看开服路线', en: 'Open launch guide', ja: '開服ガイドを見る' },
        description: {
          zh: '把角色选择放回首日路线和资源节奏里看，会更接近真实决策。',
          en: 'Place crew choices back into your day-one route and resource rhythm.',
          ja: 'キャラ選択を初日ルートと資源配分に戻して考えると現実的です。',
        },
      },
      {
        href: '/sea/guides/character-vs-outfit-pull-guide',
        title: { zh: '看资源怎么花', en: 'Read spend plan', ja: '資源プランを見る' },
        description: {
          zh: '对比完角色后，继续解决首月抽角色还是追外观的问题。',
          en: 'After comparing crews, decide whether launch resources go to power or cosmetics.',
          ja: '比較の次は、初月の資源を戦力か外観かどちらに使うかを決めましょう。',
        },
      },
    ];
  }

  const titles = {
    characters: { zh: '看角色图鉴', en: 'Browse Characters', ja: 'キャラ図鑑を見る' },
    build: { zh: '看配装推荐', en: 'Open Build Recommender', ja: 'ビルドを見る' },
    version: { zh: '看版本更新', en: 'Check Version Updates', ja: '更新情報を見る' },
  } as const;

  const descriptions = {
    characters: {
      zh: '先确认角色定位和养成基础，再回来对比更容易看出差异。',
      en: 'Review character roles and basics first, then compare with more context.',
      ja: 'まず役割と基礎情報を確認すると、比較しやすくなります。',
    },
    build: {
      zh: '如果你已经选好角色，这里可以直接看对应配装和替代方案。',
      en: 'If you already picked a character, jump straight to the recommended build and backups.',
      ja: 'キャラが決まっているなら、推奨ビルドと代替案へ進めます。',
    },
    version: {
      zh: '想看当前版本更适合谁、谁被加强了，可以从这里继续。',
      en: 'For current patch winners, buffs, and meta shifts, this is the next stop.',
      ja: '現行バージョンの強化対象や環境変化を見るならここです。',
    },
  } as const;

  return [
    {
      href: `/${gameId}/characters`,
      title: titles.characters,
      description: descriptions.characters,
    },
    {
      href: `/${gameId}/build`,
      title: titles.build,
      description: descriptions.build,
    },
    {
      href: `/${gameId}/version`,
      title: titles.version,
      description: descriptions.version,
    },
  ];
}

function withNextSteps(content: ReactNode, locale: SupportedLocale, links: NextStepLink[]) {
  return (
    <>
      {content}
      <NextStepStrip locale={locale} links={links} />
    </>
  );
}

// =====================================================================
// Client Component
// =====================================================================

export function CompareClient({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  if (gameId === 'genshin') return withNextSteps(<GenshinCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  if (gameId === 'starrail') return withNextSteps(<StarRailCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  if (gameId === 'wuwa') return withNextSteps(<WuWaCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  if (gameId === 'nte') return withNextSteps(<NteCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  if (gameId === 'zzz') return withNextSteps(<ZzzCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  if (gameId === 'guihuan') return withNextSteps(<GuihunCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  if (gameId === 'endfield') return withNextSteps(<EndfieldCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  if (gameId === 'sea') return withNextSteps(<SeaCompare locale={locale} />, locale, getCompareNextSteps(gameId, locale));
  return <ComingSoon locale={locale} />;
}


function ComingSoon({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border-2 border-dashed border-game-border p-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-game-text-muted">{t(locale, '敬请期待', 'Coming Soon', 'Coming Soon')}</h2>
        <p className="text-sm text-game-text-muted">{t(locale, '该游戏的对比功能正在开发中', 'Compare tool for this game is under development', 'このゲームの比較機能は開発中です')}</p>
      </div>
    </div>
  );
}
