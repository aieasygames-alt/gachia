import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { GameId, SupportedLocale } from '@gachia/core';
import { GAMES } from '@gachia/core';

const TeamsClient = dynamic(() => import('./teams-client').then((m) => m.TeamsClient));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}): Promise<Metadata> {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];
  const gameName = locale === 'zh' ? gameConfig.name.zh : locale === 'ja' ? (gameConfig.name.ja ?? gameConfig.name.en) : gameConfig.name.en;
  const title = gameId === 'zzz'
    ? locale === 'zh' ? '绝区零配队模拟器 — 最佳队伍、代理人搭配与 Team Builder' : locale === 'ja' ? 'ZZZ パーティ編成 — おすすめチームと Team Builder' : 'ZZZ Team Builder — Best Teams, Team Comps & Agent Synergy'
    : gameId === 'skjh'
    ? locale === 'zh' ? `${gameName} 小队分工模拟器` : locale === 'ja' ? `${gameName} チーム役割シミュレーター` : `${gameName} Squad Role Simulator`
    : locale === 'zh' ? `${gameName} 配队模拟器` : locale === 'ja' ? `${gameName} パーティ編成` : `${gameName} Team Builder`;
  if (gameId === 'ananta' || gameId === 'sea') {
    return { title, robots: { index: false, follow: false } };
  }
  return {
    title,
    description: gameId === 'zzz'
      ? locale === 'zh'
        ? '绝区零配队模拟器，整理 ZZZ 最佳队伍、代理人协同、强攻/击破/异常/支援搭配、当前版本主流配队和新手队伍。'
        : locale === 'ja'
          ? 'ZZZ パーティ編成。おすすめチーム、エージェント相性、強攻/撃破/異常/支援、現在版本の編成を確認。'
          : 'ZZZ team builder for best teams, agent synergy, Attack/Stun/Anomaly/Support comps, current meta teams, F2P teams, and version-ready team planning.'
      : gameId === 'skjh'
      ? locale === 'zh'
        ? `${gameName}小队分工模拟器，按独狼、双人队、三人队、四人以上队伍规划建筑位、资源位、侦查位、战斗位和后勤位。`
        : locale === 'ja'
          ? `${gameName}チーム役割シミュレーター。ソロ、デュオ、トリオ、4人以上の役割分担を計画。`
          : `${gameName} squad role simulator for solo, duo, trio, and 4+ player groups across builder, runner, scout, fighter, and logistics roles.`
      : locale === 'zh' ? `${gameName} 角色配队模拟器，查看最佳阵容搭配` : locale === 'ja' ? `${gameName} パーティ編成シミュレーター、おすすめ編成` : `${gameName} team builder - best team compositions and synergies`,
    alternates: {
      canonical: `https://gachia.com/${locale}/${gameId}/teams`,
      languages: { 'zh-Hans': `https://gachia.com/zh/${gameId}/teams`, en: `https://gachia.com/en/${gameId}/teams`, ja: `https://gachia.com/ja/${gameId}/teams`, 'x-default': `https://gachia.com/zh/${gameId}/teams` },
    },
  };
}

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  return <TeamsClient gameId={gameId} locale={locale} />;
}
