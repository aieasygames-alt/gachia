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

export const ZZZ_EVENT_UPDATED_AT = '2026-10-18';

// Keep live claims and unconfirmed preview information separate by status.
export const ZZZ_EVENTS: ZzzEvent[] = [
  {
    id: 'code-check',
    status: 'action',
    title: { zh: '现有兑换码与邮件检查', en: 'Check current codes and mail', ja: '既存コードとメール確認' },
    summary: { zh: '先领取已标记为有效的兑换码并检查邮件。3.3节目码已于10月11日23:59:59（UTC+8）失效，不输入未核验字符串。', en: 'Claim only codes marked active and check mail. v3.3 program codes expired October 11 at 23:59:59 UTC+8; do not enter unverified strings.', ja: '有効表示のコードのみ交換してメールを確認します。v3.3番組コードは10月11日23:59:59（UTC+8）に失効しました。未確認文字列は入力しません。' },
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
    summary: { zh: '抽取前先记录菲林、加密母带、保底和两队缺位；不要为未公布目标暂停已有代理人的核心技、技能、音擎和驱动盘养成。', en: 'Before pulling, record Polychromes, Encrypted Master Tapes, pity, and two-team gaps. Do not pause Core Skills, skills, W-Engines, or Drive Disc work for unannounced targets.', ja: '抽選前はポリクローム、暗号化マスターテープ、天井、二編成の不足を記録します。未発表目標のために既存エージェントのコア、スキル、音動機、ドライブ育成を止めません。' },
    action: { zh: '规划资源', en: 'Plan resources', ja: '資源を計画' },
    href: '/zzz/calculator',
    source: { zh: '站内规划工具', en: 'Gachia planning tools', ja: 'サイト内計画ツール' },
    updatedAt: ZZZ_EVENT_UPDATED_AT,
  },
  {
    id: 'version-watch',
    status: 'watch',
    title: { zh: '3.3前瞻已发布 / 菲欧妮机制公开', en: 'v3.3 preview published / Feioni reference', ja: 'v3.3番組公開済み / 菲欧妮機構紹介' },
    summary: { zh: '10月9日前瞻已发布，10月17日菲欧妮机制介绍已公开。3.3实装日与卡池仍待正式公告核验，不能据角色宣传判定已上线。', en: 'The October 9 preview and October 17 Feioni reference are published. Verify the v3.3 release and banners separately; a character post does not establish launch.', ja: '10月9日番組と17日菲欧妮機構紹介は公開済み。3.3実装日・バナーは別途確認し、キャラ紹介を配信の証明としません。' },
    action: { zh: '查看前瞻与机制状态', en: 'Open preview and reference status', ja: '番組・機構状態を見る' },
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
