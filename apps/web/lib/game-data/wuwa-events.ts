import type { SupportedLocale } from '@gachia/core';

export type WuWaEventStatus = 'action' | 'planning' | 'watch';

export type WuWaEvent = {
  id: string;
  status: WuWaEventStatus;
  title: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
  action: Record<SupportedLocale, string>;
  href: string;
  source: Record<SupportedLocale, string>;
  updatedAt: string;
};

export const WUWA_EVENT_UPDATED_AT = '2026-10-09';

// Keep this board to facts that have an official v3.7 notice behind them.
export const WUWA_EVENTS: WuWaEvent[] = [
  {
    id: 'v3-7-route',
    status: 'action',
    title: { zh: '3.7「镜锁妄世，心照红尘」已上线', en: 'v3.7 "Prism\'s Illusion, Heart\'s Illumination" is live', ja: 'Ver.3.7「鏡に鎖す妄世、心で照らす紅塵」配信中' },
    summary: { zh: '先领取邮件中的维护与问题修复补偿，再按主线解锁情况进入梦枢天罗的新增内容。补偿领取条件与邮件有效期以游戏内公告为准。', en: 'Claim maintenance and issue-fix compensation from mail first, then enter the new Simulacrum Nexus of Mengzhou content when story progress permits. Use the in-game notice for eligibility and mail expiry.', ja: 'まずメールのメンテナンス・不具合修正補償を受け取り、ストーリー進行条件を満たしたら夢州の夢枢天羅の新規コンテンツへ進みます。受取条件と期限はゲーム内告知で確認してください。' },
    action: { zh: '查看 3.7 上线后路线', en: 'Open the v3.7 live route', ja: 'v3.7実装後ルートを見る' },
    href: '/wuwa/guides/v3-7-live-route',
    source: { zh: '《鸣潮》3.7 版本内容说明', en: 'Wuthering Waves v3.7 patch notes', ja: '『鳴潮』Ver.3.7パッチノート' },
    updatedAt: WUWA_EVENT_UPDATED_AT,
  },
  {
    id: 'phase-one-convene',
    status: 'action',
    title: { zh: '第一期唤取与星声止损', en: 'Phase I Convene and Astrite stop-loss', ja: '第1期集音と星声の使い止め' },
    summary: { zh: '3.7 第一期开放了心的限定唤取窗口。抽取前先核对游戏内结束时间、当前保底、已有队伍缺口和是否需要预留后续目标；不要把传闻角色或复刻时间当作已确认排期。', en: 'The v3.7 Phase I limited Convene features Hsin. Before pulling, verify the in-game end time, current pity, roster gaps, and future reserves. Do not treat rumor characters or rerun dates as confirmed schedules.', ja: 'v3.7第1期では心の限定集音が開催されています。抽選前にゲーム内終了時刻、現在の天井、編成不足、今後の温存を確認し、噂のキャラや復刻時期を確定日程として扱わないでください。' },
    action: { zh: '检查卡池与预算', en: 'Check banners and budget', ja: 'バナーと予算を確認' },
    href: '/wuwa/guides/banner-schedule-guide',
    source: { zh: '3.7 第一期共鸣者/武器唤取公告', en: 'v3.7 Phase I Resonator/Weapon Convene notice', ja: 'Ver.3.7第1期共鳴者・武器集音告知' },
    updatedAt: WUWA_EVENT_UPDATED_AT,
  },
  {
    id: 'heavenly-crafts-search',
    status: 'action',
    title: { zh: '「天工寻物」限时战斗活动', en: '"Tian Gong Search" limited combat event', ja: '「天工尋物」期間限定戦闘イベント' },
    summary: { zh: '官方公告列出的活动窗口为 10 月 8 日 04:00 至 10 月 26 日 03:59（服务器时间）。先在活动页核对前置条件和本服时间，再安排每日体力与挑战节奏。', en: 'The official notice lists October 8, 04:00 through October 26, 03:59 server time. Confirm prerequisites and your server clock on the event page before planning daily Waveplate and challenge runs.', ja: '公式告知の開催期間はサーバー時間で10月8日04:00から10月26日03:59です。日々のスタミナと挑戦計画の前に、イベントページで前提条件と自分のサーバー時刻を確認してください。' },
    action: { zh: '查看活动与配装', en: 'Review event and builds', ja: 'イベントとビルドを見る' },
    href: '/wuwa/build',
    source: { zh: '《鸣潮》3.7 版本内容说明', en: 'Wuthering Waves v3.7 patch notes', ja: '『鳴潮』Ver.3.7パッチノート' },
    updatedAt: WUWA_EVENT_UPDATED_AT,
  },
  {
    id: 'performance-check',
    status: 'planning',
    title: { zh: '更新后性能与资源下载检查', en: 'Post-update performance and resource-download check', ja: '更新後の性能・リソースDL確認' },
    summary: { zh: '官方已发布客户端资源分级说明，社区也有更新后性能反馈。先完成官方启动器/平台的资源更新，记录设备、画质、帧率和复现步骤；持续掉帧或崩溃应走游戏内客服或官方反馈渠道。', en: 'The official site has a tiered client-resource notice and community reports include post-update performance feedback. Complete official launcher/platform downloads first, record device, settings, frame rate, and repro steps, then use in-game support or official feedback for persistent issues.', ja: '公式サイトにはクライアントリソースの段階DL告知があり、更新後の性能についてのコミュニティ報告もあります。まず公式ランチャー/プラットフォームのDLを完了し、端末、設定、FPS、再現手順を記録してください。継続的な問題はゲーム内サポートまたは公式フィードバックへ送ります。' },
    action: { zh: '查看下载与平台检查', en: 'Review download and platform checks', ja: 'DL・プラットフォーム確認を見る' },
    href: '/wuwa/download',
    source: { zh: '官方客户端资源说明与玩家反馈帖', en: 'Official client-resource notice and player feedback threads', ja: '公式クライアントリソース告知とプレイヤーフィードバック' },
    updatedAt: WUWA_EVENT_UPDATED_AT,
  },
  {
    id: 'upcoming-events',
    status: 'watch',
    title: { zh: '后续活动节点：以游戏内公告为准', en: 'Upcoming event checkpoints: verify in-game', ja: '今後のイベント：ゲーム内告知で確認' },
    summary: { zh: '官方已公布后续小游戏、登录和委托活动的时间窗口。临近开启时应在游戏内和官方公告复核本服时间、解锁条件与奖励，不把社媒截图或第三方日历视为最终依据。', en: 'Official notices list later mini-game, login, and commission windows. Recheck server timing, unlock conditions, and rewards in-game and in official notices near launch; social screenshots and third-party calendars are not final sources.', ja: '公式告知には後続のミニゲーム、ログイン、依頼イベントの期間があります。開始前にゲーム内と公式告知でサーバー時刻、解放条件、報酬を再確認し、SNSの画像や第三者カレンダーを最終根拠にしないでください。' },
    action: { zh: '查看版本专题', en: 'Open version hub', ja: 'バージョン特集を見る' },
    href: '/wuwa/version',
    source: { zh: '《鸣潮》3.7 版本内容说明', en: 'Wuthering Waves v3.7 patch notes', ja: '『鳴潮』Ver.3.7パッチノート' },
    updatedAt: WUWA_EVENT_UPDATED_AT,
  },
];

export const WUWA_EVENT_STATUS_COPY: Record<WuWaEventStatus, Record<SupportedLocale, string>> = {
  action: { zh: '现在可做', en: 'Do now', ja: '今やる' },
  planning: { zh: '排查与规划', en: 'Check and plan', ja: '確認と計画' },
  watch: { zh: '临近开启再核验', en: 'Verify near start', ja: '開始前に再確認' },
};
