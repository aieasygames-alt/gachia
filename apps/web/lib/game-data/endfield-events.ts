import type { SupportedLocale } from '@gachia/core';
import { getOfficialContentUpdates } from '@gachia/data/official-content-updates';

export type EndfieldEventStatus = 'action' | 'planning' | 'watch';
export type EndfieldEvent = {
  id: string;
  status: EndfieldEventStatus;
  title: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
  action: Record<SupportedLocale, string>;
  href: string;
  source: Record<SupportedLocale, string>;
  updatedAt: string;
};

export const ENDFIELD_EVENT_UPDATED_AT = '2026-10-18';
const update = getOfficialContentUpdates('endfield')[0]!;
const source = { zh: '国服10月15日丹青渡更新公告', en: 'October 15 CN Danqingdu update notice', ja: '中国版10月15日丹青渡更新告知' };
const action = { zh: '查看官方更新整理', en: 'Read the sourced update guide', ja: '公式更新整理を見る' };

// Dated notice facts, not clock-driven assertions that an event is open now.
export const ENDFIELD_EVENTS: EndfieldEvent[] = [
  ...[
    { id: 'cn-search-phases', index: 1, title: { zh: '国服寻访分阶段', en: 'CN search phases', ja: '中国版尋訪段階' } },
    { id: 'cn-compensation', index: 2, title: { zh: '补偿资格与邮件期限', en: 'Compensation eligibility and mail expiry', ja: '補償資格とメール期限' } },
    { id: 'cn-event-calendar', index: 4, title: { zh: '签到与后续活动节点', en: 'Sign-in and scheduled events', ja: 'ログインと後続イベント日時' } },
  ].map((entry): EndfieldEvent => ({
    id: entry.id, status: 'action', title: entry.title,
    summary: update.facts[entry.index]!, action, source,
    href: '/endfield/guides/danqingdu-cn-update-guide', updatedAt: ENDFIELD_EVENT_UPDATED_AT,
  })),
  {
    id: 'aic-plan', status: 'planning',
    title: { zh: '工业系统已更新：旧蓝图需重验', en: 'Industry update: revalidate old blueprints', ja: '工業更新：旧設計図は再検証' },
    summary: update.facts[3]!, action, source,
    href: '/endfield/guides/danqingdu-cn-update-guide', updatedAt: ENDFIELD_EVENT_UPDATED_AT,
  },
  {
    id: 'test-recap', status: 'watch',
    title: { zh: 'Pioneer Test历史档案 / 其他地区独立核验', en: 'Pioneer Test archive / verify other regions separately', ja: 'Pioneer Test履歴 / 他地域は別途確認' },
    summary: update.boundary,
    action: { zh: '查看历史资料边界', en: 'Review the historical scope', ja: '旧資料の範囲を見る' },
    source: { zh: '历史测试资料，不是当前国服状态', en: 'Historical test material, not current CN status', ja: '旧テスト資料。現行中国版ではありません' },
    href: '/endfield/guides/pioneer-test-post-test-route', updatedAt: ENDFIELD_EVENT_UPDATED_AT,
  },
];

export const ENDFIELD_EVENT_STATUS_COPY: Record<EndfieldEventStatus, Record<SupportedLocale, string>> = {
  action: { zh: '国服公告与活动节点', en: 'CN notice and event schedule', ja: '中国版告知・イベント日時' },
  planning: { zh: '系统更新与重新核验', en: 'System updates and revalidation', ja: 'システム更新と再検証' },
  watch: { zh: '历史与地区边界', en: 'Historical and regional scope', ja: '履歴・地域の範囲' },
};
