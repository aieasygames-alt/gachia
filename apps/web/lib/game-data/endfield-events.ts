import type { SupportedLocale } from '@gachia/core';

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

export const ENDFIELD_EVENT_UPDATED_AT = '2026-10-08';

// Keep historical Pioneer Test material distinct from any future official test or launch notice.
export const ENDFIELD_EVENTS: EndfieldEvent[] = [
  {
    id: 'test-recap',
    status: 'action',
    title: { zh: 'Pioneer Test 复盘与奖励核对', en: 'Pioneer Test recap and reward check', ja: 'Pioneer Testのまとめと報酬確認' },
    summary: { zh: 'Pioneer Test 招募已结束。整理测试账号、平台、奖励结算与反馈时，只使用官方站、Steam 页面、官方邮件或官方社区公告核对。', en: 'Pioneer Test recruitment has ended. Verify test account, platform, reward settlement, and feedback only through the official site, Steam, official email, or official community notices.', ja: 'Pioneer Testの募集は終了しました。テストアカウント、プラットフォーム、報酬精算、フィードバックは公式サイト、Steam、公式メール、公式コミュニティのみで確認します。' },
    action: { zh: '查看测试后路线', en: 'Open post-test route', ja: 'テスト後ルートを見る' },
    href: '/endfield/guides/pioneer-test-post-test-route',
    source: { zh: '官方测试与平台公告口径', en: 'Official test and platform notices', ja: '公式テスト・プラットフォーム告知' },
    updatedAt: ENDFIELD_EVENT_UPDATED_AT,
  },
  {
    id: 'aic-plan',
    status: 'planning',
    title: { zh: 'AIC 工厂与 Wuling 蓝图整理', en: 'AIC factory and Wuling blueprint planning', ja: 'AIC工場とWuling設計図の整理' },
    summary: { zh: '把测试期的生产线按输入、输出和瓶颈拆成小模块，优先保留可复用蓝图；下一轮测试或正式版的配方、成本与解锁条件仍需官方确认。', en: 'Break test-period production lines into small input/output/bottleneck modules and keep reusable blueprints. Recipes, costs, and unlock conditions for a future test or release still require official confirmation.', ja: 'テスト時の生産ラインを入力・出力・ボトルネックごとの小モジュールに分け、再利用できる設計図を残します。次回テストや正式版のレシピ、コスト、解放条件は公式確認が必要です。' },
    action: { zh: '查看蓝图与工厂', en: 'Review blueprints and factory', ja: '設計図と工場を見る' },
    href: '/endfield/guides/blueprint-aic-factory-guide',
    source: { zh: '站内测试复盘与蓝图攻略', en: 'Gachia test recap and blueprint guide', ja: 'サイト内テストまとめ・設計図ガイド' },
    updatedAt: ENDFIELD_EVENT_UPDATED_AT,
  },
  {
    id: 'operator-plan',
    status: 'planning',
    title: { zh: '已有干员的队伍与养成复盘', en: 'Review owned-operator teams and builds', ja: '所持オペレーターの編成・育成を見直す' },
    summary: { zh: '先按已有干员的职业、元素、武器与队伍分工整理培养路线；没有官方测试或正式版更新时，不把旧强度、配方或新干员传闻当作当前结论。', en: 'Plan around owned operators by profession, element, weapon, and team duty. Without an official test or release update, do not treat older tier ratings, recipes, or rumored operators as current conclusions.', ja: '所持オペレーターの職分、元素、武器、編成役割から育成を整理します。公式テストや正式版更新がない限り、旧Tier、レシピ、新キャラの噂を現在の結論にしません。' },
    action: { zh: '检查配队与配装', en: 'Check teams and builds', ja: '編成とビルドを確認' },
    href: '/endfield/teams',
    source: { zh: '站内干员、配队与配装数据', en: 'Gachia operator, team, and build data', ja: 'サイト内オペレーター・編成・ビルドデータ' },
    updatedAt: ENDFIELD_EVENT_UPDATED_AT,
  },
  {
    id: 'official-watch',
    status: 'watch',
    title: { zh: '下一轮测试与正式上线：等待官方确认', en: 'Next test and full release: await official confirmation', ja: '次回テスト・正式リリース：公式確認待ち' },
    summary: { zh: '当前没有把下一轮测试、预下载、正式上线日期或兑换码列为已确认活动。出现官网、Steam 或官方社区公告后，再更新到具体下载、奖励和版本入口。', en: 'No next-test window, preload, full release date, or redeem code is presented as confirmed now. These will move into download, reward, and version routes only after official site, Steam, or official community notices appear.', ja: '現時点では次回テスト、事前DL、正式リリース日、交換コードを確定イベントとして扱いません。公式サイト、Steam、公式コミュニティの告知後にのみDL、報酬、バージョン導線へ反映します。' },
    action: { zh: '查看官方状态清单', en: 'Open official-status checklist', ja: '公式状態チェックを見る' },
    href: '/endfield/guides/pioneer-test-post-test-route',
    source: { zh: '官方站、Steam 与官方社区公告', en: 'Official site, Steam, and official community notices', ja: '公式サイト、Steam、公式コミュニティ告知' },
    updatedAt: ENDFIELD_EVENT_UPDATED_AT,
  },
];

export const ENDFIELD_EVENT_STATUS_COPY: Record<EndfieldEventStatus, Record<SupportedLocale, string>> = {
  action: { zh: '现在可做', en: 'Do now', ja: '今やる' },
  planning: { zh: '资料与养成路线', en: 'Planning route', ja: '計画ルート' },
  watch: { zh: '等待官方确认', en: 'Await official confirmation', ja: '公式確認待ち' },
};
