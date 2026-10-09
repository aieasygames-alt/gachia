'use client';

import type { GameId, SupportedLocale } from '@gachia/core';
import dynamic from 'next/dynamic';
import { NextStepStrip, type NextStepLink } from '@/components/wiki/next-step-strip';
import type { ReactNode } from 'react';

const GenshinBuildRecommender = dynamic(() => import('./genshin-build-client').then((mod) => mod.GenshinBuildRecommender), { loading: () => <BuildLoading /> });
const StarRailBuildRecommender = dynamic(() => import('./starrail-build-client').then((mod) => mod.StarRailBuildRecommender), { loading: () => <BuildLoading /> });
const WuWaBuildRecommender = dynamic(() => import('./wuwa-build-client').then((mod) => mod.WuWaBuildRecommender), { loading: () => <BuildLoading /> });
const NteBuildRecommender = dynamic(() => import('./nte-build-client').then((mod) => mod.NteBuildRecommender), { loading: () => <BuildLoading /> });
const ZzzBuildRecommender = dynamic(() => import('./zzz-build-client').then((mod) => mod.ZzzBuildRecommender), { loading: () => <BuildLoading /> });
const GuihuanBuildRecommender = dynamic(() => import('./guihuan-build-client').then((mod) => mod.GuihuanBuildRecommender), { loading: () => <BuildLoading /> });
const EndfieldBuildRecommender = dynamic(() => import('./endfield-build-client').then((mod) => mod.EndfieldBuildRecommender), { loading: () => <BuildLoading /> });

function BuildLoading() { return <div className="rounded-lg border border-game-border bg-game-surface p-8 text-center text-sm text-game-text-muted">Loading builds...</div>; }



// =====================================================================
// Client Component
// =====================================================================



// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

function getBuildNextSteps(gameId: string, locale: SupportedLocale): NextStepLink[] {
  if (gameId === 'wuwa') {
    return [
      {
        href: '/wuwa/artifacts',
        title: { zh: '查看 3.7 声骸合鸣', en: 'Browse v3.7 Echo sets', ja: 'Ver.3.7エコーセットを見る' },
        description: { zh: '核对新合鸣的触发条件、两件套与五件套效果。', en: 'Check new Sonata triggers plus 2-piece and 5-piece effects.', ja: '新ソナタの発動条件、2セット・5セット効果を確認。' },
      },
      {
        href: '/wuwa/guides/v3-7-live-route',
        title: { zh: '查看 3.7 上线后路线', en: 'Open the v3.7 live route', ja: 'Ver.3.7実装後ルートを見る' },
        description: { zh: '把梦枢天罗、活动、唤取和养成顺序接起来。', en: 'Connect Simulacrum Nexus, events, Convene, and progression order.', ja: '夢枢天羅、イベント、集音、育成順をつなげます。' },
      },
      {
        href: '/wuwa/events',
        title: { zh: '查看活动看板', en: 'Open the event board', ja: 'イベントボードを見る' },
        description: { zh: '先核对本服时间、前置条件和当前可领取奖励。', en: 'Verify server timing, prerequisites, and currently claimable rewards.', ja: 'サーバー時刻、前提条件、現在受取可能な報酬を確認。' },
      },
    ];
  }

  const titles = {
    characters: { zh: '看角色图鉴', en: 'Browse Characters', ja: 'キャラ図鑑を見る' },
    weapons: { zh: '看武器图鉴', en: 'Browse Weapons', ja: '武器図鑑を見る' },
    version: { zh: '看版本更新', en: 'Check Version Updates', ja: '更新情報を見る' },
  } as const;

  const descriptions = {
    characters: {
      zh: '先把角色底池和定位看清，再回到配装页挑最合适的方案。',
      en: 'Review the roster and roles first, then come back to the build page for the best fit.',
      ja: 'まずキャラの役割を確認してから、最適なビルドに戻りましょう。',
    },
    weapons: {
      zh: '对照可用武器和替代方案，快速补齐主武器选择。',
      en: 'Compare available weapons and backups to lock in the best main option.',
      ja: '候補武器を見比べて、主武器の選択を絞り込みます。',
    },
    version: {
      zh: '如果想看当前版本的角色调整、活动和趋势，这里是下一站。',
      en: 'For current patch changes, events, and meta shifts, this is the next stop.',
      ja: '最新パッチの調整、イベント、環境変化を見るならここです。',
    },
  } as const;

  return [
    {
      href: `/${gameId}/characters`,
      title: titles.characters,
      description: descriptions.characters,
    },
    {
      href: `/${gameId}/weapons`,
      title: titles.weapons,
      description: descriptions.weapons,
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
export function BuildClient({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  if (gameId === 'genshin') return withNextSteps(<GenshinBuildRecommender locale={locale} />, locale, getBuildNextSteps(gameId, locale));
  if (gameId === 'starrail') return withNextSteps(<StarRailBuildRecommender locale={locale} />, locale, getBuildNextSteps(gameId, locale));
  if (gameId === 'wuwa') return withNextSteps(<WuWaBuildRecommender locale={locale} />, locale, getBuildNextSteps(gameId, locale));
  if (gameId === 'nte') return withNextSteps(<NteBuildRecommender locale={locale} />, locale, getBuildNextSteps(gameId, locale));
  if (gameId === 'zzz') return withNextSteps(<ZzzBuildRecommender locale={locale} />, locale, getBuildNextSteps(gameId, locale));
  if (gameId === 'guihuan') return withNextSteps(<GuihuanBuildRecommender locale={locale} />, locale, getBuildNextSteps(gameId, locale));
  if (gameId === 'endfield') return withNextSteps(<EndfieldBuildRecommender locale={locale} />, locale, getBuildNextSteps(gameId, locale));
  return <ComingSoon locale={locale} />;
}


function ComingSoon({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border-2 border-dashed border-game-border p-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-game-text-muted">{t(locale, '敬请期待', 'Coming Soon', 'Coming Soon')}</h2>
        <p className="text-sm text-game-text-muted">{t(locale, '该游戏的配装功能正在开发中', 'Build tool for this game is under development', 'このゲームのビルド機能は開発中です')}</p>
      </div>
    </div>
  );
}
