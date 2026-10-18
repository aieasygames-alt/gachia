import type { SupportedLocale } from '@gachia/core';
import { getOfficialContentUpdates } from '@gachia/data/official-content-updates';

export function HotfixNotice({ locale }: { locale: SupportedLocale }) {
  const entry = getOfficialContentUpdates('nte')[0]!;
  return <section className="detail-section">
    <h2>{entry.title[locale]}</h2>
    <p>{entry.region[locale]} · {entry.checkedAt}</p>
    <ul>{entry.facts.map((fact, i) => <li key={i}>{fact[locale]}</li>)}</ul>
    <p className="notice">{entry.boundary[locale]}</p>
    <div className="link-list">{entry.sources.map((url, i) => <a key={url} href={url} rel="noreferrer">{locale === 'zh' ? '官方来源' : locale === 'ja' ? '公式出典' : 'Official source'} {i + 1}</a>)}</div>
  </section>;
}
