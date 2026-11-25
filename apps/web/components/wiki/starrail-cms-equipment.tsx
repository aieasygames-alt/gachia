import { cache } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { STARRAIL_CMS_EQUIPMENT, type StarRailEquipmentCategory } from '@gachia/data/cms/starrail-equipment';
import { isCommunityStarRailSource } from '@gachia/data/cms/starrail-updates';
import { loadStarRailUpdates } from '@/lib/starrail-publication';
import { Link } from '@/lib/i18n/navigation';

const copy = {
  zh: { title: '已核验装备资料', pending: '当前语言暂无已发布的装备资料。中文页面会标明来源与适用范围。', checked: '来源核验', scope: '适用范围与待核验项', official: '官方来源', community: '第三方资料', all: '返回图鉴', warps: '跃迁日程' },
  en: { title: 'Verified equipment', pending: 'No verified equipment entry is published in this language yet. The Chinese page states its sources and scope.', checked: 'Source checked', scope: 'Scope and pending checks', official: 'Official source', community: 'Community reference', all: 'Back to encyclopedia', warps: 'Warp schedule' },
  ja: { title: '確認済み装備資料', pending: 'この言語の確認済み装備資料は未公開です。中国語ページで出典と対象範囲を確認してください。', checked: '出典確認', scope: '対象範囲と未確認事項', official: '公式出典', community: 'コミュニティ資料', all: '図鑑へ戻る', warps: '跳躍日程' },
};
export const loadStarRailEquipment = cache(async (locale: SupportedLocale, category: StarRailEquipmentCategory) => {
  const result = await loadStarRailUpdates(locale);
  return result.updates.filter(d => d.locale === locale && d.kind === 'equipment' && Object.hasOwn(STARRAIL_CMS_EQUIPMENT[category], d.slug));
});
export async function starRailEquipmentMetadata(locale: SupportedLocale, category: StarRailEquipmentCategory, id: string) {
  const doc = (await loadStarRailEquipment(locale, category)).find(d => d.slug === id);
  return { title: doc?.title ?? copy[locale].title, description: doc?.summary ?? copy[locale].pending, robots: { index: Boolean(doc), follow: true }, alternates: { canonical: `https://gachia.com/${locale}/starrail/${category}/${id}` } };
}
export async function StarRailCmsEquipmentCards({ locale, category }: { locale: SupportedLocale; category: StarRailEquipmentCategory }) {
  const docs = await loadStarRailEquipment(locale, category);
  if (!docs.length) return null;
  return <section className="mb-8 space-y-4" data-starrail-equipment-index={category}><h2 className="text-lg font-semibold">{copy[locale].title} ({docs.length})</h2><div className="grid gap-4 md:grid-cols-2">{docs.map(d => <article key={d.slug} className="rounded-xl border border-game-primary/40 bg-game-surface p-5"><Link href={`/starrail/${category}/${d.slug}` as '/'} className="font-semibold text-game-primary">{d.title}</Link><p className="mt-2 text-sm leading-7 text-game-text-muted">{d.summary}</p><p className="mt-2 text-xs text-game-text-muted">{d.region} · {d.checkedAt}</p></article>)}</div></section>;
}
export async function StarRailCmsEquipment({ locale, category, id }: { locale: SupportedLocale; category: StarRailEquipmentCategory; id: string }) {
  const doc = (await loadStarRailEquipment(locale, category)).find(d => d.slug === id);
  const c = copy[locale];
  return <article className="space-y-6" data-starrail-equipment={id}>
    <h1 className="text-2xl font-bold text-game-primary">{doc?.title ?? c.title}</h1>
    {doc ? <><p className="text-sm leading-7">{doc.summary}</p><p className="text-xs text-game-text-muted">{doc.region} · {c.checked} <time dateTime={doc.checkedAt}>{doc.checkedAt}</time></p>
      {doc.facts.map((f, i) => { const [heading, ...paragraphs] = f.text.split('\n').filter(Boolean); return <section key={i} className="rounded-xl border border-game-border bg-game-surface p-5"><h2 className="font-semibold">{heading}</h2>{paragraphs.map((p, j) => <p key={j} className="mt-3 text-sm leading-7 text-game-text-muted">{p}</p>)}</section>; })}
      <section className="border-l-2 border-game-primary pl-4"><h2 className="font-semibold">{c.scope}</h2><p className="mt-2 text-sm leading-7 text-game-text-muted">{doc.boundary}</p></section>
      <div className="flex flex-wrap gap-4">{doc.sources.map((s, i) => <a key={s.url} href={s.url} rel="noreferrer" className="text-sm text-game-primary underline">{isCommunityStarRailSource(s.url) ? c.community : c.official} {i + 1}</a>)}</div>
    </> : <p className="text-sm leading-7">{c.pending} <Link locale="zh" href={`/starrail/${category}/${id}` as '/'} className="text-game-primary underline">中文</Link></p>}
    <nav className="flex flex-wrap gap-4 text-sm text-game-primary"><Link href={`/starrail/${category}` as '/'}>{c.all}</Link><Link href="/starrail/guides/banner-schedule-guide">{c.warps}</Link><Link href="/starrail/characters/aha">{locale === 'zh' ? '阿哈技能与材料' : '中文 · 阿哈'}</Link></nav>
  </article>;
}
