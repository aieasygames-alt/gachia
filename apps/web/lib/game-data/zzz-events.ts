import type { SupportedLocale } from '@gachia/core';

export type ZzzEventStatus = 'action' | 'watch' | 'planning';

export type ZzzEvent = {
  id: string;
  status: ZzzEventStatus;
  title: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
  action: Record<SupportedLocale, string>;
  href: string;
  source: Record<SupportedLocale, string>;
  updatedAt: string;
};

export const ZZZ_EVENT_UPDATED_AT = '2026-10-08';

// Keep live claims and unconfirmed preview information separate by status.
export const ZZZ_EVENTS: ZzzEvent[] = [
  {
    id: 'code-check',
    status: 'action',
    title: { zh: '现有兑换码与邮件检查', en: 'Check current codes and mail', ja: '既存コードとメール確認' },
    summary: { zh: '先领取已标记为有效的兑换码并检查邮件。3.3 直播码尚待官方在 10 月 9 日 19:30（UTC+8）节目后公布，不要输入未核验字符串。', en: 'Claim only codes marked active and check mail. v3.3 livestream codes await official publication after the October 9 19:30 UTC+8 program; do not enter unverified strings.', ja: '有効表示のコードのみ交換してメールを確認します。v3.3配信コードは10月9日19:30（UTC+8）の番組後に公式発表待ちです。未確認文字列は入力しません。' },
    action: { zh: '检查可领资源', en: 'Check claimable resources', ja: '受取可能な資源を確認' },
    href: '/zzz/redeem-codes',
    source: { zh: '站内兑换码状态维护', en: 'Gachia code-status maintenance', ja: 'サイト内コード状態管理' },
    updatedAt: ZZZ_EVENT_UPDATED_AT,
  },
  {
    id: 'roster-plan',
    status: 'action',
    title: { zh: '双队角色池检查', en: 'Two-team roster check', ja: '二編成の手持ち確認' },
    summary: { zh: '先标记已拥有代理人，找出能直接组出的队伍和缺失位，再决定当前资源投向。', en: 'Mark owned agents first, find immediately buildable teams and missing slots, then decide where current resources go.', ja: '所持エージェントを選び、今組める編成と不足枠を確認してから資源の行き先を決めます。' },
    action: { zh: '检查队伍缺口', en: 'Check roster gaps', ja: '編成不足を確認' },
    href: '/zzz/teams',
    source: { zh: '站内角色池与配队数据', en: 'Gachia roster and team data', ja: 'サイト内手持ち・編成データ' },
    updatedAt: ZZZ_EVENT_UPDATED_AT,
  },
  {
    id: 'progression-plan',
    status: 'planning',
    title: { zh: '菲林与养成资源安排', en: 'Polychrome and progression planning', ja: 'ポリクロームと育成資源計画' },
    summary: { zh: '节目日前先记录菲林、加密母带、保底和两队缺位；不要为未公布目标暂停已有代理人的核心技、技能、音擎和驱动盘养成。', en: 'Before the program, record Polychromes, Encrypted Master Tapes, pity, and two-team gaps. Do not pause Core Skills, skills, W-Engines, or Drive Disc work for unannounced targets.', ja: '番組前はポリクローム、暗号化マスターテープ、天井、二編成の不足を記録します。未発表目標のために既存エージェントのコア、スキル、音動機、ドライブ育成を止めません。' },
    action: { zh: '规划资源', en: 'Plan resources', ja: '資源を計画' },
    href: '/zzz/calculator',
    source: { zh: '站内规划工具', en: 'Gachia planning tools', ja: 'サイト内計画ツール' },
    updatedAt: ZZZ_EVENT_UPDATED_AT,
  },
  {
    id: 'version-watch',
    status: 'watch',
    title: { zh: '3.3 官方前瞻：10 月 9 日 19:30', en: 'v3.3 official program: October 9, 19:30', ja: 'v3.3公式番組：10月9日19:30' },
    summary: { zh: '3.3「重返天空的旅程」前瞻特别节目将于 10 月 9 日 19:30（UTC+8）播出。节目后再将官方卡池、角色、阶段与奖励写入具体入口。', en: 'The v3.3 “Journey Back to the Sky” special program airs October 9 at 19:30 UTC+8. Official banners, agents, phases, and rewards will be added to actionable routes only after the program.', ja: 'v3.3「空へ戻る旅」特別番組は10月9日19:30（UTC+8）です。公式バナー、キャラ、期間、報酬は番組後に実行導線へ追加します。' },
    action: { zh: '查看节目准备清单', en: 'Open program checklist', ja: '番組準備リストを見る' },
    href: '/zzz/guides/v3-3-special-program-prep-guide',
    source: { zh: '官方公告与站内版本快照', en: 'Official notices and Gachia version snapshot', ja: '公式告知とサイト内バージョンスナップショット' },
    updatedAt: ZZZ_EVENT_UPDATED_AT,
  },
];

export const ZZZ_EVENT_STATUS_COPY: Record<ZzzEventStatus, Record<SupportedLocale, string>> = {
  action: { zh: '现在可做', en: 'Do now', ja: '今やる' },
  planning: { zh: '资源路线', en: 'Resource route', ja: '資源ルート' },
  watch: { zh: '等待官方确认', en: 'Await official confirmation', ja: '公式確認待ち' },
};
