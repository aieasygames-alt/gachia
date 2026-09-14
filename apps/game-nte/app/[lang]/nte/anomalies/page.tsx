import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { NteNav } from '@/components/nte-nav';
import { anomalies } from '@/lib/data';
import { nteMetadata } from '@/lib/metadata';


const copy = {
  zh: { title: '异环异象图鉴：Boss、精英与掉落机制', description: '查看异环 Boss 与精英异象的属性、弱点、机制、掉落和实战策略。', lead: '按 Boss 与其他异象整理战斗信息。先确认属性弱点与机制，再结合队伍和配装调整进场方案。', boss: 'Boss 异象', other: '精英与普通异象', count: '收录异象', before: '战前准备', fields: { hp: '生命值', weakness: '弱点', mechanics: '核心机制', location: '出现地点', drops: '主要掉落', strategy: '应对策略' }, links: [['teams', '配队建议'], ['build', '角色配装'], ['disk-sets', '驱动盘套装'], ['items', '材料与掉落'], ['map', '地图与区域'], ['guides/boss-guide', 'Boss 攻略指南']] },
  en: { title: 'NTE Anomalies: Bosses, Elites & Drops', description: 'Browse NTE boss and elite anomaly attributes, weaknesses, mechanics, drops, and strategy notes.', lead: 'Combat notes are grouped into bosses and other anomalies. Confirm the weakness and key mechanic before adjusting your team and build.', boss: 'Boss anomalies', other: 'Elite and common anomalies', count: 'documented anomalies', before: 'Prepare before the fight', fields: { hp: 'HP', weakness: 'Weakness', mechanics: 'Key mechanic', location: 'Location', drops: 'Primary drops', strategy: 'Strategy' }, links: [['teams', 'Team builder'], ['build', 'Character builds'], ['disk-sets', 'Disk sets'], ['items', 'Materials and drops'], ['map', 'Map and regions'], ['guides/boss-guide', 'Boss guide']] },
  ja: { title: 'NTE 異象図鑑：Boss・精鋭・ドロップ', description: 'NTEのボス・精鋭異象の属性、弱点、ギミック、ドロップ、攻略メモを確認できます。', lead: 'ボスとその他の異象に分けて戦闘情報を整理しています。弱点と重要なギミックを確認してから、パーティとビルドを調整してください。', boss: 'ボス異象', other: '精鋭・通常異象', count: '収録異象', before: '挑戦前の準備', fields: { hp: 'HP', weakness: '弱点', mechanics: '主要ギミック', location: '出現場所', drops: '主なドロップ', strategy: '攻略メモ' }, links: [['teams', 'パーティ編成'], ['build', 'キャラクタービルド'], ['disk-sets', 'ディスクセット'], ['items', '素材とドロップ'], ['map', 'マップとエリア'], ['guides/boss-guide', 'ボス攻略ガイド']] },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const text = copy[locale] ?? copy.en;
  return nteMetadata(locale, 'anomalies', { zh: text.title, en: copy.en.title, ja: copy.ja.title }, { zh: text.description, en: copy.en.description, ja: copy.ja.description });
}

function AnomalyCard({ anomaly, locale }: { anomaly: (typeof anomalies)[number]; locale: SupportedLocale }) {
  const text = copy[locale] ?? copy.en;
  const english = locale !== 'zh';
  const value = (zh: string | undefined, en: string | undefined) => english ? en ?? zh : zh ?? en;
  const drops = english ? anomaly.dropsEn : anomaly.drops;
  return <article className="card" lang={locale === 'ja' ? 'en' : undefined}>
    <div className="card__title">{english ? anomaly.nameEn : anomaly.name}</div>
    <div className="tag-list"><span>{value(anomaly.categoryZh, anomaly.category) ?? value(anomaly.typeZh, anomaly.type)}</span><span>{value(anomaly.attribute, anomaly.attributeEn)}</span>{anomaly.hp && <span>{text.fields.hp}: {anomaly.hp}</span>}</div>
    {value(anomaly.weakness, anomaly.weaknessEn) && <p><strong>{text.fields.weakness}:</strong> {value(anomaly.weakness, anomaly.weaknessEn)}</p>}
    {value(anomaly.mechanics, anomaly.mechanicsEn) && <p><strong>{text.fields.mechanics}:</strong> {value(anomaly.mechanics, anomaly.mechanicsEn)}</p>}
    {value(anomaly.location, anomaly.locationEn) && <p><strong>{text.fields.location}:</strong> {value(anomaly.location, anomaly.locationEn)}</p>}
    {drops?.length ? <p><strong>{text.fields.drops}:</strong> {drops.join(' / ')}</p> : null}
    <p><strong>{text.fields.strategy}:</strong> {value(anomaly.strategy, anomaly.strategyEn)}</p>
  </article>;
}

export default async function Anomalies({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const text = copy[locale] ?? copy.en;
  const bosses = anomalies.filter((anomaly) => anomaly.category === 'boss' || anomaly.categoryZh === 'Boss');
  const others = anomalies.filter((anomaly) => !bosses.includes(anomaly));
  const origin = 'https://gachia.com';
  const pathname = `/${locale}/nte/anomalies`;
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Gachia', item: origin }, { '@type': 'ListItem', position: 2, name: 'NTE', item: `${origin}/${locale}/nte` }, { '@type': 'ListItem', position: 3, name: text.title, item: `${origin}${pathname}` }] },
    { '@type': 'CollectionPage', name: text.title, description: text.description, url: `${origin}${pathname}`, inLanguage: locale === 'zh' ? 'zh-CN' : locale },
  ] };
  return <><NteNav locale={locale} /><main className="content"><div className="eyebrow">NTE Anomalies</div><h1>{text.title}</h1><p className="lead">{text.lead}</p><div className="stat-row"><strong>{anomalies.length}</strong><span>{text.count}</span><strong>{bosses.length}</strong><span>{text.boss}</span></div><section className="detail-section"><h2>{text.boss}</h2><div className="grid">{bosses.map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} locale={locale} />)}</div></section><section className="detail-section"><h2>{text.other}</h2><div className="grid">{others.map((anomaly) => <AnomalyCard key={anomaly.id} anomaly={anomaly} locale={locale} />)}</div></section><section className="detail-section"><h2>{text.before}</h2><div className="link-list">{text.links.map(([href, label]) => <Link key={href} href={`/${locale}/nte/${href}`}>{label}</Link>)}</div></section></main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
