import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { regionDescription, regionName, regions } from '@/lib/data';
import { nteMetadata } from '@/lib/metadata';
import { NteNav } from '@/components/nte-nav';

const locationAnchors = [
  { id: 'hethereau', zh: '海瑟劳', en: 'Hethereau', ja: 'ヘテロー' },
  { id: 'sixth-street', zh: '六街', en: 'Sixth Street', ja: 'シックスストリート' },
  { id: 'hollow-zero', zh: '空洞零号', en: 'Hollow Zero', ja: 'ホロウ・ゼロ' },
  { id: 'lumina-square', zh: '光映广场', en: 'Lumina Square', ja: 'ルミナスクエア' },
] as const;

const regionIcons: Record<string, string> = {
  'central-district': 'Central',
  'industrial-zone': 'Industrial',
  'research-lab': 'Research',
  'abyss-zone': 'Abyss',
};

function pick(locale: SupportedLocale, values: { zh: string; en: string; ja: string }) {
  return values[locale];
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  return nteMetadata(locale, 'map', {
    zh: '异环互动地图 - 区域、Boss 与材料路线',
    en: 'NTE Map Guide - Regions, Bosses and Routes',
    ja: 'NTE マップ攻略 - エリア、Boss、素材ルート',
  }, {
    zh: '异环区域攻略，整理地点锚点、Boss、材料特产、挑战关卡与探索提示。',
    en: 'NTE region guide for location anchors, bosses, specialties, domains, and exploration notes.',
    ja: 'NTE の地点アンカー、Boss、特産品、挑戦ステージ、探索ヒントをまとめたエリア攻略です。',
  });
}

export default async function MapPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const sourceLanguage = locale === 'zh' ? undefined : 'zh';
  const stats = [
    [regions.length, pick(locale, { zh: '区域', en: 'Regions', ja: 'エリア' })],
    [regions.reduce((total, region) => total + region.subRegions.length, 0), pick(locale, { zh: '子区域', en: 'Sub-regions', ja: 'サブエリア' })],
    [regions.reduce((total, region) => total + region.bosses.length, 0), pick(locale, { zh: '异常 Boss', en: 'Anomaly bosses', ja: '異常 Boss' })],
    [regions.reduce((total, region) => total + region.domains.length, 0), pick(locale, { zh: '挑战关卡', en: 'Domains', ja: '挑戦ステージ' })],
  ];
  return <><NteNav locale={locale} current="map"/><main id="main-content" tabIndex={-1} className="content"><div className="eyebrow">NTE Map Guide</div><h1>{pick(locale, { zh: '异环区域攻略', en: 'NTE Region Guide', ja: 'NTE エリア攻略' })}</h1><p className="lead">{pick(locale, { zh: '按区域整理地点锚点、Boss、特产、挑战和探索提示。实际点位与开放条件请以游戏内信息为准。', en: 'Browse location anchors, bosses, specialties, domains, and exploration notes by region. Confirm exact markers and unlock conditions in game.', ja: 'エリアごとに地点アンカー、Boss、特産品、挑戦ステージ、探索ヒントを確認できます。正確な地点と解放条件はゲーム内で確認してください。' })}</p>{sourceLanguage && <p className="notice">{pick(locale, { zh: '', en: 'Region detail lists currently use the available Chinese source data.', ja: 'エリア詳細リストは、現在利用可能な中国語の原文データを掲載しています。' })}</p>}<section className="map-stats">{stats.map(([value, label]) => <div className="card" key={String(label)}><strong>{value}</strong><span>{label}</span></div>)}</section><section><h2>{pick(locale, { zh: '常见地点锚点', en: 'Common Location Anchors', ja: 'よく見る地点アンカー' })}</h2><div className="grid">{locationAnchors.map((anchor) => <article className="card" id={anchor.id} key={anchor.id}><div className="card__title">{anchor[locale]}</div><p>{pick(locale, { zh: '地图锚点与路线入口', en: 'Map anchor and route entry', ja: 'マップアンカーとルート入口' })}</p></article>)}</div></section><section className="region-list">{regions.map((region) => <article className="region-card" key={region.id}><div className="region-card__head"><div><div className="eyebrow">{regionIcons[region.id] ?? 'Region'}</div><h2>{regionName(region, locale)}</h2><p>{regionDescription(region, locale)}</p></div></div><div className="region-card__grid" lang={sourceLanguage}><InfoBlock title={pick(locale, { zh: '区域要点', en: 'Highlights', ja: 'エリア情報' })} values={region.highlights}/><InfoBlock title={pick(locale, { zh: '区域特产', en: 'Specialties', ja: '特産品' })} values={region.specialties}/><InfoBlock title={pick(locale, { zh: '子区域', en: 'Sub-regions', ja: 'サブエリア' })} values={region.subRegions}/><InfoBlock title={pick(locale, { zh: '异常 Boss', en: 'Anomaly Bosses', ja: '異常 Boss' })} values={region.bosses}/><InfoBlock title={pick(locale, { zh: '挑战关卡', en: 'Domains', ja: '挑戦ステージ' })} values={region.domains}/></div>{region.tips.length > 0 && <div className="notice" lang={sourceLanguage}><strong>{pick(locale, { zh: '探索提示', en: 'Exploration Tips', ja: '探索ヒント' })}</strong><ul>{region.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></div>}</article>)}</section><div className="link-list"><Link href={`/${locale}/nte/items`}>{pick(locale, { zh: '材料图鉴', en: 'Materials', ja: '素材図鑑' })}</Link><Link href={`/${locale}/nte/anomalies`}>{pick(locale, { zh: '异象机制', en: 'Anomalies', ja: '異象' })}</Link><Link href={`/${locale}/nte/build`}>{pick(locale, { zh: '角色配装', en: 'Character builds', ja: 'キャラビルド' })}</Link></div></main></>;
}

function InfoBlock({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;
  return <div><h3>{title}</h3><div className="tag-list">{values.map((value) => <span key={value}>{value}</span>)}</div></div>;
}
