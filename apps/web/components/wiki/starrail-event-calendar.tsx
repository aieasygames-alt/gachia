import type { UpdateResult } from '@gachia/data/cms/starrail-client';
import type { EventStart, EventEnd } from '@gachia/data/cms/starrail-events';
import type { SupportedLocale } from '@gachia/core';

const printedTime = (value: string) => value.replaceAll('-', '/').replace('T', ' ');
function startLabel(start: EventStart) {
  return start.kind === 'at' ? printedTime(start.value) : `${start.date.replaceAll('-', '/')} ${start.version}版本更新后`;
}
function endLabel(end: EventEnd) {
  if (end.kind === 'at') return printedTime(end.value);
  return end.kind === 'version-end' ? `${end.version}版本结束前` : '未公告独立结束时间';
}
export function StarRailEventCalendar({ result, locale }: { result: UpdateResult; locale: SupportedLocale }) {
  const entries = result.updates.flatMap(update => (update.eventSchedule?.entries ?? []).map(entry => ({ entry, update })));
  if (!entries.length) return null;
  const copy = {
    zh: { title: '国服活动日历', scope: '时间保留国服公告原文，不换算为浏览器时区。更新后开放不等于维护预计结束时刻；活动窗口、限时奖励和版本结束请分别核对。未列出的活动仍需独立公告。', starts: '开放', ends: '截止', eligibility: '参与条件', checked: '来源核验', rules: '规则与资料边界', source: '国服官方公告' },
    en: { title: 'CN event calendar', scope: 'Times retain the CN announcement wording without browser timezone conversion. Update completion, limited rewards and version endings are separate. Unlisted events require their own notices.', starts: 'Opens', ends: 'Deadline', eligibility: 'Eligibility', checked: 'Source checked', rules: 'Rules and scope', source: 'Official CN notice' },
    ja: { title: '中国版イベント日程', scope: '中国版告知の表記を維持し、ブラウザーの時差変換は行いません。更新後の開始、期間限定報酬、バージョン終了はそれぞれ確認してください。未掲載のイベントには個別の告知が必要です。', starts: '開始', ends: '期限', eligibility: '参加条件', checked: '出典確認', rules: 'ルールと対象範囲', source: '中国版公式告知' },
  }[locale];
  const category = { limited: '限时活动', gift: '版本好礼', challenge: '周期挑战', season: '赛季更新' };
  return <section className="mt-8" aria-labelledby="starrail-event-calendar-title" data-event-calendar="cn">
    <h2 id="starrail-event-calendar-title" className="text-xl font-semibold text-game-text">{copy.title}</h2>
    <p className="mt-3 text-sm leading-7 text-game-text-muted">{copy.scope}</p>
    <div className="mt-5 grid gap-4 xl:grid-cols-2">{entries.map(({ entry, update }) => <article key={entry.id} data-event-id={entry.id} className="min-w-0 rounded-xl border border-game-border bg-game-surface p-5">
      <p className="text-xs text-game-text-muted">国服 · {category[entry.category]} · {copy.checked} <time dateTime={update.checkedAt}>{update.checkedAt}</time></p>
      <h3 className="mt-2 text-base font-semibold text-game-text">{entry.title}</h3>
      <dl className="mt-3 space-y-2 text-sm leading-6">
        <div><dt className="text-game-text-muted">{copy.starts}</dt><dd className="break-words text-game-text">{startLabel(entry.start)}</dd></div>
        <div><dt className="text-game-text-muted">{copy.ends}</dt><dd className="break-words font-medium text-game-primary">{endLabel(entry.end)}</dd></div>
        <div><dt className="text-game-text-muted">{copy.eligibility}</dt><dd className="text-game-text">{entry.eligibility}</dd></div>
      </dl>
      <p className="mt-3 text-sm leading-6 text-game-text-muted">{entry.note}</p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-game-primary underline"><a href={`#${update.slug}`}>{copy.rules}</a><a href={entry.sourceUrl} rel="noreferrer">{copy.source}</a></div>
    </article>)}</div>
  </section>;
}
