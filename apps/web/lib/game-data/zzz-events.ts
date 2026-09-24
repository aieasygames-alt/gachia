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

export const ZZZ_EVENT_UPDATED_AT = '2026-09-24';

// Keep live claims and unconfirmed preview information separate by status.
export const ZZZ_EVENTS: ZzzEvent[] = [
  {
    id: 'code-check',
    status: 'action',
    title: { zh: '兑换码与邮件检查', en: 'Codes and mail check', ja: 'コードとメール確認' },
    summary: { zh: '兑换码页按 active、expired、unknown 分层；领取前先确认有效期和官方来源。', en: 'The code page separates active, expired, and unknown states. Verify expiry and official source before redeeming.', ja: 'コードページはactive、expired、unknownを分けます。交換前に期限と公式出典を確認してください。' },
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
    summary: { zh: '先用菲林规划器确认最坏情况资源缺口，再把主力代理人、核心技、技能与音擎拆成养成队列。', en: 'Use the pull planner for worst-case gaps, then turn core agents, Core Skills, skills, and W-Engines into a progression queue.', ja: 'ガチャ計画で最悪ケースの不足を確認し、主力エージェント、コア、スキル、Wエンジンを育成キューに分けます。' },
    action: { zh: '规划资源', en: 'Plan resources', ja: '資源を計画' },
    href: '/zzz/calculator',
    source: { zh: '站内规划工具', en: 'Gachia planning tools', ja: 'サイト内計画ツール' },
    updatedAt: ZZZ_EVENT_UPDATED_AT,
  },
  {
    id: 'version-watch',
    status: 'watch',
    title: { zh: '3.3 前瞻与下期卡池观察', en: 'v3.3 preview and next-banner watch', ja: 'v3.3前瞻と次回バナー注目' },
    summary: { zh: '未确认的角色、时间和奖励只保留观察状态；官方公告发布后再更新为具体活动或卡池信息。', en: 'Unconfirmed characters, dates, and rewards remain watch-only until an official notice is published.', ja: '未確認のキャラ、日程、報酬は公式告知まで注目状態として扱います。' },
    action: { zh: '查看版本观察', en: 'Open version watch', ja: 'バージョン注目を見る' },
    href: '/zzz/version',
    source: { zh: '官方公告与站内版本快照', en: 'Official notices and Gachia version snapshot', ja: '公式告知とサイト内バージョンスナップショット' },
    updatedAt: ZZZ_EVENT_UPDATED_AT,
  },
];

export const ZZZ_EVENT_STATUS_COPY: Record<ZzzEventStatus, Record<SupportedLocale, string>> = {
  action: { zh: '现在可做', en: 'Do now', ja: '今やる' },
  planning: { zh: '资源路线', en: 'Resource route', ja: '資源ルート' },
  watch: { zh: '等待官方确认', en: 'Await official confirmation', ja: '公式確認待ち' },
};
