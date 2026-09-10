import Link from 'next/link';
import { diskSetEffect, diskSets, getNteDiskSetName } from '@/lib/data';
import type { SupportedLocale } from '@gachia/core';
import { nteMetadata } from '@/lib/metadata';
import { NteNav } from '@/components/nte-nav';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale=(await params).lang as SupportedLocale; return nteMetadata(locale,'disk-sets',{zh:'异环光盘套装',en:'NTE Disk Sets',ja:'NTE ディスクセット'},{zh:'异环光盘套装效果与推荐。',en:'NTE disk set effects and recommendations.',ja:'異環ディスクセットの効果とおすすめ。'}); }
export default async function DiskSets({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const title = locale === 'zh' ? '异环光盘套装' : locale === 'ja' ? 'NTE ディスクセット' : 'NTE Disk Sets';
  const lead = locale === 'zh' ? `共 ${diskSets.length} 套驱动盘，包含 2 件和 4 件套效果及适配角色参考。` : locale === 'ja' ? `${diskSets.length}種類のディスクセットについて、2・4セット効果と適性を確認できます。` : `${diskSets.length} disk sets with 2-piece, 4-piece effects, and character references.`;
  const jsonLd = { '@context': 'https://schema.org', '@graph': [{ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Gachia', item: 'https://gachia.com' }, { '@type': 'ListItem', position: 2, name: 'NTE', item: `https://gachia.com/${locale}/nte` }, { '@type': 'ListItem', position: 3, name: title, item: `https://gachia.com/${locale}/nte/disk-sets` }] }, { '@type': 'CollectionPage', name: title, description: lead, url: `https://gachia.com/${locale}/nte/disk-sets`, inLanguage: locale === 'zh' ? 'zh-CN' : locale }] };
  return <><NteNav locale={locale}/><main className="content"><div className="eyebrow">NTE Database</div><h1>{title}</h1><p className="lead">{lead}</p><div className="stat-row"><strong>{diskSets.length}</strong><span>{locale === 'zh' ? '套驱动盘' : locale === 'ja' ? 'セット' : 'disk sets'}</span></div><section className="grid">{diskSets.map((set) => <Link className="card" key={set.id} href={`/${locale}/nte/disk-sets/${set.id}`}><div className="card__title">{getNteDiskSetName(set, locale)}</div><div className="card__meta">{set.element ?? 'General'}</div><p>{diskSetEffect(set, 2, locale)}</p><p>{diskSetEffect(set, 4, locale)}</p></Link>)}</section></main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
