import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

type Step = {
  href: string;
  label: Record<SupportedLocale, string>;
  status: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  action: Record<SupportedLocale, string>;
};

const S1_STEPS: Step[] = [
  {
    href: '/aniimo/download',
    label: { zh: '官方客户端与账号', en: 'Official client and account', ja: '公式クライアントとアカウント' },
    status: { zh: 'S1 已全平台上线', en: 'S1 live across platforms', ja: 'S1は全プラットフォームで配信中' },
    description: { zh: '先从官方入口确认 PC、主机、云端或移动端客户端，并在首次登录前核对账号和区服。', en: 'Start with the official PC, console, cloud, or mobile client, then verify your account and region before first login.', ja: '公式のPC、コンソール、クラウド、モバイル版から始め、初回ログイン前にアカウントと地域を確認します。' },
    action: { zh: '打开下载页', en: 'Open download hub', ja: 'ダウンロードへ' },
  },
  {
    href: '/aniimo/guides/s1-new-player-route',
    label: { zh: 'S1 首日路线', en: 'S1 first-session route', ja: 'S1初日ルート' },
    status: { zh: '当前版本参考', en: 'Current-version reference', ja: '現行バージョン参照' },
    description: { zh: '优先完成系统引导、基础探索和队伍操作，再决定是否投入到更长线的收集与养成。', en: 'Complete system onboarding, basic exploration, and team controls before committing to longer-term collection or progression.', ja: 'システム導入、基礎探索、チーム操作を終えてから、長期の収集や育成に進みます。' },
    action: { zh: '查看首日路线', en: 'View first-session route', ja: '初日ルートを見る' },
  },
  {
    href: '/aniimo/guides/rainbow-aniimo-guide',
    label: { zh: '虹光与收集判断', en: 'Rainbow and collection checks', ja: '虹光と収集の確認' },
    status: { zh: '按当前客户端核验', en: 'Verify in the current client', ja: '現行クライアントで確認' },
    description: { zh: '把遇到、捕捉、用途和来源分开记录；不要用单次发现或旧视频推导固定概率。', en: 'Keep encounters, capture, use cases, and source separate; do not infer fixed odds from one discovery or old footage.', ja: '遭遇、捕獲、用途、出典を分け、単発の発見や古い映像から固定確率を推測しません。' },
    action: { zh: '查看虹光指南', en: 'Open Rainbow guide', ja: '虹光ガイドへ' },
  },
  {
    href: '/aniimo/guides/homeland-resource-guide',
    label: { zh: '家园与资源循环', en: 'Homeland and resource loop', ja: 'ホームランドと資源循環' },
    status: { zh: '需求驱动投入', en: 'Invest by current need', ja: '現在の需要で投資' },
    description: { zh: '先解决当前制作或探索缺口，再扩展资源循环，避免把所有设施和材料都当成首日目标。', en: 'Solve the current crafting or exploration gap before expanding resource loops; do not treat every facility and material as a day-one goal.', ja: '現在の製作・探索不足を解決してから資源循環を広げ、すべての施設や素材を初日の目標にしません。' },
    action: { zh: '查看家园指南', en: 'Open homeland guide', ja: 'ホームランドガイドへ' },
  },
  {
    href: '/aniimo/map',
    label: { zh: '地图与区域信息', en: 'Map and region reference', ja: 'マップと地域情報' },
    status: { zh: '公开区域参考', en: 'Public-region reference', ja: '公開地域の参照' },
    description: { zh: '地图页用于确认公开区域和路线脉络，不替代逐点标记式的互动地图。', en: 'The map page confirms public regions and routing context; it is not a marker-by-marker interactive map.', ja: 'マップページは公開地域とルートの文脈を確認するもので、マーカー単位のインタラクティブマップではありません。' },
    action: { zh: '查看地图', en: 'Open map', ja: 'マップを見る' },
  },
  {
    href: '/aniimo/redeem-codes',
    label: { zh: '兑换码与奖励状态', en: 'Codes and reward status', ja: 'コードと報酬状況' },
    status: { zh: '仅收录已核验信息', en: 'Verified information only', ja: '確認済み情報のみ' },
    description: { zh: '兑换码、活动奖励和账号绑定是不同事项；未被公开确认的内容不计入资源规划。', en: 'Codes, event rewards, and account linking are separate concerns; unconfirmed items do not belong in resource planning.', ja: 'コード、イベント報酬、アカウント連携は別項目です。未確認情報は資源計画に入れません。' },
    action: { zh: '查看奖励状态', en: 'Check reward status', ja: '報酬状況を見る' },
  },
];

export async function generateMetadata({ params }: { params: Promise<{ lang: string; game: string }> }) {
  const { lang, game } = await params;
  if (game !== 'aniimo') return {};
  const locale = (['zh', 'en', 'ja'].includes(lang) ? lang : 'zh') as SupportedLocale;
  const title = { zh: '伊莫 S1 入坑检查台', en: 'Aniimo S1 Starter Checks', ja: 'アニモ S1入門チェック' }[locale];
  const description = { zh: '伊莫 S1「逐风启程」全平台上线后的入坑检查台：下载、首日路线、虹光、家园、地图与兑换码状态。', en: 'Aniimo S1 starter checks for the live multi-platform launch: download, first-session route, Rainbow, homeland, map, and code status.', ja: '全プラットフォーム配信中のアニモS1「逐風出発」向けに、DL、初日ルート、虹光、ホームランド、マップ、コード状況を確認します。' }[locale];
  return {
    title,
    description: ensureMetaLength(description, locale),
    alternates: buildLocalizedAlternates(locale, (entry) => `/${entry}/aniimo/s1-check`, LOCALES),
    openGraph: { title, description, url: `${BASE_URL}/${locale}/aniimo/s1-check`, type: 'website' },
  };
}

export default async function AniimoS1CheckPage({ params }: { params: Promise<{ lang: string; game: string }> }) {
  const { lang, game } = await params;
  if (game !== 'aniimo' || !GAMES[game as GameId]) notFound();
  const locale = (['zh', 'en', 'ja'].includes(lang) ? lang : 'zh') as SupportedLocale;
  const copy = {
    zh: { kicker: 'S1 逐风启程', title: '伊莫 S1 入坑检查台', lead: '按实际游玩顺序核对下载、入门、收集、家园、地图与奖励入口。页面仅连接当前已发布的资料，不把未确认信息写成客户端规则。', notice: 'S1 已于 2026 年 9 月分阶段登陆 PC、主机、云端与移动端。账号、地区、资源包、活动和兑换状态可能按平台变化，请以官方入口和当前客户端为准。', sequence: '建议顺序' },
    en: { kicker: 'S1 Ride the Wind', title: 'Aniimo S1 Starter Checks', lead: 'Work through download, onboarding, collection, homeland, map, and reward entry points in play order. This page links only to published current material and does not turn unverified claims into client rules.', notice: 'S1 launched in stages across PC, console, cloud, and mobile during September 2026. Account, region, asset package, event, and code status can vary by platform; follow official entry points and the current client.', sequence: 'Suggested order' },
    ja: { kicker: 'S1 逐風出発', title: 'アニモ S1入門チェック', lead: 'DL、入門、収集、ホームランド、マップ、報酬入口をプレイ順に確認します。本ページは公開済みの現行資料だけをつなぎ、未確認情報をクライアント規則として扱いません。', notice: 'S1は2026年9月にPC、コンソール、クラウド、モバイルへ段階配信されました。アカウント、地域、追加データ、イベント、コード状況はプラットフォームで異なるため、公式入口と現行クライアントを確認してください。', sequence: '推奨順序' },
  }[locale];

  return <main className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: copy.title, numberOfItems: S1_STEPS.length, itemListElement: S1_STEPS.map((step, index) => ({ '@type': 'ListItem', position: index + 1, name: step.label[locale], url: `${BASE_URL}/${locale}${step.href}` })) }) }} />
    <p className="text-sm font-semibold text-game-primary">{copy.kicker}</p>
    <h1 className="mt-2 text-3xl font-bold text-game-text sm:text-4xl">{copy.title}</h1>
    <p className="mt-4 max-w-3xl text-base leading-7 text-game-text-muted">{copy.lead}</p>
    <p className="mt-6 rounded-lg border border-game-border bg-game-surface px-4 py-3 text-sm leading-6 text-game-text-muted">{copy.notice}</p>
    <h2 className="mt-10 text-xl font-semibold text-game-text">{copy.sequence}</h2>
    <ol className="mt-4 grid gap-4 md:grid-cols-2">
      {S1_STEPS.map((step, index) => <li key={step.href} className="rounded-lg border border-game-border bg-game-surface p-5">
        <p className="text-xs font-semibold text-game-primary">{index + 1}. {step.status[locale]}</p>
        <h3 className="mt-2 text-lg font-semibold text-game-text">{step.label[locale]}</h3>
        <p className="mt-2 text-sm leading-6 text-game-text-muted">{step.description[locale]}</p>
        <p className="mt-3 text-sm leading-6 text-game-text-muted"><span className="font-medium text-game-text">{locale === 'zh' ? '先做：' : locale === 'ja' ? '最初に：' : 'First: '}</span>{step.action[locale]}</p>
        <Link href={step.href as '/'} className="mt-4 inline-flex text-sm font-semibold text-game-primary hover:underline">{step.action[locale]} <span aria-hidden="true" className="ml-1">→</span></Link>
      </li>)}
    </ol>
  </main>;
}
