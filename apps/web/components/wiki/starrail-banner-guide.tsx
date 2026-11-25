import type { SupportedLocale } from '@gachia/core';
import { loadStarRailUpdates } from '@/lib/starrail-publication';
import { StarRailUpdates } from './starrail-updates';
import { Link } from '@/lib/i18n/navigation';

export async function StarRailBannerGuide({ locale }: { locale: SupportedLocale }) {
  const result = await loadStarRailUpdates(locale);
  const banners = { ...result, updates: result.updates.filter(update => update.kind === 'banner') };
  const copy = {
    zh: { title: '星穹铁道当前跃迁日程与抽取规划', intro: '角色、光锥和复刻跃迁分别记录窗口。下列时间保留公告的区服与时区口径；实际剩余时间请核对所在服务器的跃迁页。', empty: '当前语言暂无已发布的跃迁公告，可查看中文资料及其区服说明。', plan: '抽取前的三步检查', steps: ['先确认目标所在的角色或光锥跃迁，以及该窗口的结束时间；复刻切换不代表全部跃迁一起结束。', '在游戏内查看对应跃迁的历史记录与规则，分别记录已抽次数及是否已有必得状态。不同类型跃迁不要合并计算。', '预算只计入现有资源和确定能领取的奖励；未核验的兑换码、未完成的终局挑战和未公布奖励不计入保底预算。'], version: '版本与奖励详情', codes: '兑换码状态', tools: '角色与养成资料' },
    en: { title: 'Honkai: Star Rail Current Warp Schedule and Planning', intro: 'Character, light cone and rerun warps have separate windows. Retain each notice’s region and time zone, and confirm the remaining time on your server.', empty: 'No warp notices are published in this language yet. Chinese records specify their regional scope.', plan: 'Three checks before pulling', steps: ['Identify the character or light cone warp and its closing time. A rerun switch does not end every warp.', 'Read the in-game history and rules for that warp type. Track pulls and any guarantee separately for each type.', 'Budget only owned resources and rewards you can certainly claim. Exclude unverified codes, unfinished endgame stages and unannounced rewards.'], version: 'Version and rewards', codes: 'Code status', tools: 'Characters and progression' },
    ja: { title: 'スターレイルの現在の跳躍日程と計画', intro: 'キャラ・光円錐・復刻はそれぞれ開催期間が異なります。告知の対象地域と時刻を確認し、残り時間は自身のサーバーで確認してください。', empty: 'この言語の跳躍告知は未掲載です。中国語の資料には対象地域を明記しています。', plan: '引く前の3つの確認', steps: ['目標のキャラ・光円錐と終了時刻を確認します。復刻の切替で全跳躍が終わるとは限りません。', 'ゲーム内の履歴とルールを確認し、跳躍の種類ごとに回数と確定状態を分けて記録します。', '所持資源と確実に受け取れる報酬だけで計画します。未確認コード、未クリア報酬、未発表報酬は含めません。'], version: '更新と報酬', codes: 'コード状況', tools: 'キャラと育成' },
  }[locale];
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold text-game-primary">{copy.title}</h1>
    <p className="text-sm leading-7 text-game-text-muted">{copy.intro}</p>
    {banners.updates.length ? <StarRailUpdates result={banners} locale={locale} /> : <p className="text-game-text-muted">{copy.empty} <Link className="text-game-primary underline" href="/starrail/guides/banner-schedule-guide" locale="zh">中文</Link></p>}
    <section className="rounded-xl border border-game-border bg-game-surface p-5">
      <h2 className="text-lg font-semibold text-game-text">{copy.plan}</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-7 text-game-text-muted">{copy.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </section>
    <nav className="flex flex-wrap gap-4 text-sm text-game-primary"><Link href="/starrail/version">{copy.version}</Link><Link href="/starrail/redeem-codes">{copy.codes}</Link><Link href="/starrail/characters">{copy.tools}</Link></nav>
  </div>;
}
