import { Link } from '@/lib/i18n/navigation';
import type { SupportedLocale } from '@gachia/core';
import { loadStarRailUpdates } from '@/lib/starrail-publication';
import { StarRailUpdates } from './starrail-updates';

export async function StarRailEvents({ locale }: { locale: SupportedLocale }) {
  const result = await loadStarRailUpdates(locale);
  const events = { ...result, updates: result.updates.filter(update => update.kind === 'event') };
  const copy = {
    zh: { title: '星穹铁道活动与奖励日程', intro: '按公告保留国服、国际服和各项领取条件。活动结束、奖励领取和版本维护可能是不同时间，请分别查看下方条目。', empty: '当前语言的活动资料正在补充；中文资料保留各自的区服与时间说明。' },
    en: { title: 'Star Rail Events and Reward Schedule', intro: 'Notices retain their CN or global scope and claim conditions. Event endings, reward deadlines and maintenance may occur at different times.', empty: 'Event records in this language are being prepared. Chinese records retain their regional scope and time details.' },
    ja: { title: 'スターレイルのイベントと報酬日程', intro: '中国版・グローバル版の対象範囲と受取条件を区別しています。イベント終了、報酬受取期限、メンテナンスはそれぞれ確認してください。', empty: 'この言語のイベント資料は準備中です。中国語の資料には対象地域と時刻を記載しています。' },
  }[locale];
  return <div><h1 className="mb-4 text-2xl font-bold text-game-primary">{copy.title}</h1><p className="text-sm leading-7 text-game-text-muted">{copy.intro}</p>
    {events.updates.length ? <StarRailUpdates result={events} locale={locale} /> : <p className="mt-6 text-game-text-muted">{copy.empty} <Link className="text-game-primary underline" href="/starrail/events" locale="zh">中文</Link></p>}
  </div>;
}
