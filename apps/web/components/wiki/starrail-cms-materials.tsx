import { cache } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { STARRAIL_CMS_MATERIALS, isStarRailCmsMaterial } from '@gachia/data/cms/starrail-materials';
import { isCommunityStarRailSource } from '@gachia/data/cms/starrail-updates';
import { loadStarRailUpdates } from '@/lib/starrail-publication';
import { Link } from '@/lib/i18n/navigation';

const copy = {
  zh: { title: '已核验材料资料', pending: '当前语言暂无已发布的材料资料。中文页面会标明获取条件、来源和核验范围。', checked: '来源核验', scope: '适用范围与待核验项', official: '官方来源', community: '第三方资料', all: '材料图鉴', related: '关联已核验光锥', routes: '晋阶材料获取途径' },
  en: { title: 'Verified materials', pending: 'No verified material entry is published in this language yet. The Chinese page states acquisition conditions, sources and scope.', checked: 'Source checked', scope: 'Scope and pending checks', official: 'Official source', community: 'Community reference', all: 'Materials', related: 'Related verified light cones', routes: 'Ascension material sources' },
  ja: { title: '確認済み素材資料', pending: 'この言語の確認済み素材資料は未公開です。中国語ページで入手条件、出典、対象範囲を確認してください。', checked: '出典確認', scope: '対象範囲と未確認事項', official: '公式出典', community: 'コミュニティ資料', all: '素材図鑑', related: '関連する確認済み光円錐', routes: '昇格素材の入手先' },
};
export const loadStarRailMaterials = cache(async (locale: SupportedLocale) => {
  const result = await loadStarRailUpdates(locale);
  return result.updates.filter(d => d.locale === locale && d.kind === 'material' && isStarRailCmsMaterial(d.slug));
});
export async function starRailMaterialMetadata(locale: SupportedLocale, id: string) {
  const doc = (await loadStarRailMaterials(locale)).find(d => d.slug === id);
  return { title: doc?.title ?? copy[locale].title, description: doc?.summary ?? copy[locale].pending, robots: { index: Boolean(doc), follow: true }, alternates: { canonical: `https://gachia.com/${locale}/starrail/items/${id}` } };
}
export async function StarRailCmsMaterialCards({ locale }: { locale: SupportedLocale }) {
  const docs = await loadStarRailMaterials(locale);
  if (!docs.length) return null;
  return <section className="mb-8 space-y-4" data-starrail-material-index><h2 className="text-lg font-semibold">{copy[locale].title} ({docs.length})</h2><div className="grid gap-4 md:grid-cols-2">{docs.map(d => <article key={d.slug} className="rounded-xl border border-game-primary/40 bg-game-surface p-5"><Link href={`/starrail/items/${d.slug}` as '/'} className="font-semibold text-game-primary">{d.title}</Link><p className="mt-2 text-sm leading-7 text-game-text-muted">{d.summary}</p><p className="mt-2 text-xs text-game-text-muted">{d.region} · {d.checkedAt}</p></article>)}</div></section>;
}
export async function StarRailEquipmentMaterialLinks({ locale, equipmentId }: { locale: SupportedLocale; equipmentId: string }) {
  const docs = (await loadStarRailMaterials(locale)).filter(d => isStarRailCmsMaterial(d.slug) && (STARRAIL_CMS_MATERIALS[d.slug].equipment as readonly string[]).includes(equipmentId));
  if (!docs.length) return null;
  return <section data-starrail-equipment-materials><h2 className="font-semibold">{copy[locale].routes}</h2><div className="mt-3 flex flex-wrap gap-4">{docs.map(d => <Link key={d.slug} href={`/starrail/items/${d.slug}` as '/'} className="text-sm text-game-primary underline">{d.title}</Link>)}</div></section>;
}
export async function StarRailCmsMaterial({ locale, id }: { locale: SupportedLocale; id: string }) {
  const doc = (await loadStarRailMaterials(locale)).find(d => d.slug === id);
  const c = copy[locale];
  const result = doc ? await loadStarRailUpdates(locale) : null;
  const related = result?.updates.filter(d => d.locale === locale && d.kind === 'equipment' && isStarRailCmsMaterial(id) && (STARRAIL_CMS_MATERIALS[id].equipment as readonly string[]).includes(d.slug)) ?? [];
  return <article className="space-y-6" data-starrail-material={id}>
    <h1 className="text-2xl font-bold text-game-primary">{doc?.title ?? c.title}</h1>
    {doc ? <><p className="text-sm leading-7">{doc.summary}</p><p className="text-xs text-game-text-muted">{doc.region} · {c.checked} <time dateTime={doc.checkedAt}>{doc.checkedAt}</time></p>
      {doc.facts.map((f, i) => { const [heading, ...paragraphs] = f.text.split('\n').filter(Boolean); return <section key={i} className="rounded-xl border border-game-border bg-game-surface p-5"><h2 className="font-semibold">{heading}</h2>{paragraphs.map((p, j) => <p key={j} className="mt-3 text-sm leading-7 text-game-text-muted">{p}</p>)}</section>; })}
      {related.length > 0 && <section data-starrail-material-equipment><h2 className="font-semibold">{c.related}</h2><div className="mt-3 flex flex-wrap gap-4">{related.map(d => <Link key={d.slug} href={`/starrail/weapons/${d.slug}` as '/'} className="text-sm text-game-primary underline">{d.title}</Link>)}</div></section>}
      <section className="border-l-2 border-game-primary pl-4"><h2 className="font-semibold">{c.scope}</h2><p className="mt-2 text-sm leading-7 text-game-text-muted">{doc.boundary}</p></section>
      <div className="flex flex-wrap gap-4">{doc.sources.map((s, i) => <a key={s.url} href={s.url} rel="noreferrer" className="text-sm text-game-primary underline">{isCommunityStarRailSource(s.url) ? c.community : c.official} {i + 1}</a>)}</div>
    </> : <p className="text-sm leading-7">{c.pending} <Link locale="zh" href={`/starrail/items/${id}` as '/'} className="text-game-primary underline">中文</Link></p>}
    <nav className="flex flex-wrap gap-4 text-sm text-game-primary"><Link href="/starrail/items">{c.all}</Link><Link href="/starrail/weapons">{locale === 'zh' ? '光锥图鉴' : 'Light cones'}</Link></nav>
  </article>;
}
