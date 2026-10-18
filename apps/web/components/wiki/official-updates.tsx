import type { GameId, SupportedLocale } from '@gachia/core';
import { getOfficialContentUpdates } from '@gachia/data/official-content-updates';

export function OfficialUpdates({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  const entries = getOfficialContentUpdates(gameId);
  if (!entries.length) return null;
  const copy = {
    zh: { title: '近期官方更新与适用范围', checked: '来源核验', published: '公告发布', source: '官方来源', boundary: '资料边界' },
    en: { title: 'Recent official updates and scope', checked: 'Source checked', published: 'Published', source: 'Official source', boundary: 'Data boundary' },
    ja: { title: '直近の公式更新と対象範囲', checked: '出典確認', published: '掲載日', source: '公式出典', boundary: '情報の範囲' },
  }[locale];
  return <section className="my-8 space-y-4" aria-labelledby="official-updates-title">
    <h2 id="official-updates-title" className="text-xl font-semibold text-game-text">{copy.title}</h2>
    {entries.map((entry) => <article key={entry.id} className="rounded-xl border border-game-border bg-game-surface p-5">
      <p className="text-xs text-game-text-muted">{entry.region[locale]} · {copy.checked} <time dateTime={entry.checkedAt}>{entry.checkedAt}</time>{entry.publishedAt && <> · {copy.published} <time dateTime={entry.publishedAt}>{entry.publishedAt}</time></>}</p>
      <h3 className="mt-2 text-lg font-semibold text-game-text">{entry.title[locale]}</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-game-text-muted">{entry.facts.map((fact, i) => <li key={i}>{fact[locale]}</li>)}</ul>
      <p className="mt-4 border-l-2 border-game-primary pl-3 text-sm leading-6 text-game-text-muted">{copy.boundary}：{entry.boundary[locale]}</p>
      <div className="mt-4 flex flex-wrap gap-4">{entry.sources.map((url, i) => <a key={url} href={url} rel="noreferrer" className="text-sm text-game-primary underline">{copy.source} {i + 1}</a>)}</div>
    </article>)}
  </section>;
}
