import type { UpdateResult } from '@gachia/data/cms/starrail-client';
import type { SupportedLocale } from '@gachia/core';
import { isCommunityStarRailSource } from '@gachia/data/cms/starrail-updates';

export function StarRailUpdates({ result, locale }: { result: UpdateResult; locale: SupportedLocale }) {
  if (!result.updates.length) return null;
  const copy = {
    zh: { title: '星铁近期更新', checked: '来源核验', snapshot: '当前显示已核验的本地快照', cms: '已发布更新', boundary: '适用范围与待核验项', source: '官方来源' },
    en: { title: 'Recent Star Rail updates', checked: 'Source checked', snapshot: 'Showing the verified local snapshot', cms: 'Published updates', boundary: 'Scope and pending checks', source: 'Official source' },
    ja: { title: 'スターレイルの直近更新', checked: '出典確認', snapshot: '確認済みローカル記録を表示', cms: '公開済み更新', boundary: '対象範囲と未確認事項', source: '公式出典' },
  }[locale];
  return <section className="my-8 space-y-4" aria-labelledby="starrail-updates-title">
    <h2 id="starrail-updates-title" className="text-xl font-semibold text-game-text">{copy.title}</h2>
    <p className="text-xs text-game-text-muted">{result.source === 'cms' ? copy.cms : copy.snapshot}</p>
    {result.updates.map(update => <article key={update.slug} className="rounded-xl border border-game-border bg-game-surface p-5">
      <p className="text-xs text-game-text-muted">{update.region} · {copy.checked} <time dateTime={update.checkedAt}>{update.checkedAt}</time></p>
      <h3 className="mt-2 text-lg font-semibold text-game-text">{update.title}</h3>
      <p className="mt-2 text-sm leading-6 text-game-text-muted">{update.summary}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-game-text-muted">{update.facts.map((fact, i) => <li key={i}>{fact.text}</li>)}</ul>
      <p className="mt-4 border-l-2 border-game-primary pl-3 text-sm leading-6 text-game-text-muted">{copy.boundary}：{update.boundary}</p>
      <div className="mt-4 flex flex-wrap gap-4">{update.sources.map((source, i) => <a key={source.url} href={source.url} rel="noreferrer" className="text-sm text-game-primary underline">{isCommunityStarRailSource(source.url) ? ({ zh: '第三方资料', en: 'Community reference', ja: 'コミュニティ資料' }[locale]) : copy.source} {i + 1}</a>)}</div>
    </article>)}
  </section>;
}
