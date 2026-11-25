import { cache } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { STARRAIL_CMS_CHARACTERS } from '@gachia/data/cms/starrail-character';
import { isCommunityStarRailSource } from '@gachia/data/cms/starrail-updates';
import { loadStarRailUpdates } from '@/lib/starrail-publication';
import { Link } from '@/lib/i18n/navigation';
import { StarRailVerifiedMaterials } from './starrail-verified-materials';

export const loadStarRailCharacterPublication = cache(async (locale: SupportedLocale, id: keyof typeof STARRAIL_CMS_CHARACTERS) => {
  const result = await loadStarRailUpdates(locale);
  return result.updates.find(d => d.locale === locale && d.kind === 'character' && d.slug === STARRAIL_CMS_CHARACTERS[id] && d.characterData?.id === id) ?? null;
});
const pending = { zh: '阿哈资料暂未发布，请稍后查看。', en: 'A verified character page is not yet published in this language. See the Chinese page for its sources and scope.', ja: 'この言語の確認済みキャラクター資料は未公開です。中国語ページで出典と対象範囲を確認してください。' };

export async function starRailCharacterMetadata(locale: SupportedLocale, id: keyof typeof STARRAIL_CMS_CHARACTERS) {
  const doc = await loadStarRailCharacterPublication(locale, id);
  return { title: doc?.title ?? { zh: '阿哈资料待发布', en: 'Aha — Publication Pending', ja: 'Aha — 資料準備中' }[locale], description: doc?.summary ?? pending[locale], robots: { index: Boolean(doc), follow: true }, alternates: { canonical: `https://gachia.com/${locale}/starrail/characters/${id}` } };
}

export async function StarRailCmsCharacterCard({ locale }: { locale: SupportedLocale }) {
  const doc = await loadStarRailCharacterPublication(locale, 'aha');
  if (!doc?.characterData) return null;
  return <section className="mb-6 rounded-xl border border-game-primary/40 bg-game-surface p-5"><Link href="/starrail/characters/aha" className="text-lg font-semibold text-game-primary">{doc.title}</Link><p className="mt-2 text-sm text-game-text-muted">{doc.summary}</p><p className="mt-2 text-xs text-game-text-muted">{doc.region} · {doc.checkedAt}</p></section>;
}

export async function StarRailCmsCharacter({ locale, id }: { locale: SupportedLocale; id: keyof typeof STARRAIL_CMS_CHARACTERS }) {
  const doc = await loadStarRailCharacterPublication(locale, id);
  const p = doc?.characterData;
  if (!doc || !p) return <article className="space-y-5"><h1 className="text-2xl font-bold">{locale === 'zh' ? '阿哈资料待发布' : 'Aha'}</h1><p>{pending[locale]}</p><Link locale="zh" href="/starrail/characters/aha" className="text-game-primary underline">中文</Link></article>;
  return <article className="space-y-6">
    <h1 className="text-2xl font-bold text-game-primary">{doc.title}</h1><p className="text-sm leading-7">{doc.summary}</p><p className="text-sm text-game-text-muted">{p.identity} · {doc.region} · 来源核验 <time dateTime={doc.checkedAt}>{doc.checkedAt}</time></p>
    <nav className="flex flex-wrap gap-4 text-sm text-game-primary"><a href="#skills">逐级倍率</a><a href="#materials">材料计算</a><Link href="/starrail/characters">角色目录</Link><Link href="/starrail/calculator">养成计算器</Link></nav>
    <section id="skills" className="space-y-5"><h2 className="text-xl font-semibold">技能倍率</h2>{p.skills.map(s => <section key={s.key} className="rounded-xl border border-game-border bg-game-surface p-5"><h3 className="font-semibold">{s.label} · {s.name}</h3><p className="my-3 text-sm leading-7 text-game-text-muted">{s.note}</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{s.name}逐级倍率；培养上限{s.trainableMax}级</caption><thead><tr><th className="p-2">等级</th>{s.columns.map(c => <th key={c} className="p-2">{c}</th>)}</tr></thead><tbody>{s.levels.map(r => <tr key={r.level} className="border-t border-game-border"><th className="p-2 font-normal">Lv{r.level}{r.level > s.trainableMax ? '（星魂加级）' : ''}</th>{r.values.map((v, i) => <td key={i} className="p-2 font-mono">{v}</td>)}</tr>)}</tbody></table></div></section>)}</section>
    <section className="space-y-3"><h2 className="text-xl font-semibold">机制与等级边界</h2>{doc.facts.map((f, i) => <p className="text-sm leading-7 text-game-text-muted" key={i}>{f.text}</p>)}</section>
    <StarRailVerifiedMaterials character={p} />
    <details className="rounded-xl border border-game-border p-5"><summary className="cursor-pointer font-semibold">逐项材料：晋阶、技能升级与节点</summary><div className="mt-4 space-y-4">{[...p.ascensions.map(r => ({ name: `${r.atLevel}级晋阶（第${r.stage}次）`, materials: r.materials })), ...p.skills.flatMap(s => s.upgrades.map(r => ({ name: `${s.label} ${r.toLevel - 1}→${r.toLevel}级`, materials: r.materials }))), ...p.nodes].map((r, i) => <div key={i}><h3 className="text-sm font-medium">{r.name}</h3><p className="mt-1 text-sm text-game-text-muted">{r.materials.map(c => `${c.name} × ${c.quantity.toLocaleString('en-US')}`).join('、')}</p></div>)}</div></details>
    <section className="border-l-2 border-game-primary pl-4"><h2 className="font-semibold">适用范围与待核验项</h2><p className="mt-2 text-sm leading-7 text-game-text-muted">{doc.boundary}</p></section>
    <div className="flex flex-wrap gap-4">{doc.sources.map((s, i) => <a key={s.url} href={s.url} rel="noreferrer" className="text-sm text-game-primary underline">{isCommunityStarRailSource(s.url) ? '第三方资料' : '官方来源'} {i + 1}</a>)}</div>
  </article>;
}
