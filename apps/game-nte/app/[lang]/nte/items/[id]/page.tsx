import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SupportedLocale } from '@gachia/core';
import { materials, characterName } from '@/lib/data';
import { nteMaterialDetail } from '@/lib/material-detail';
import { nteMetadata } from '@/lib/metadata';
import { NteNav } from '@/components/nte-nav';
import { CharacterPortrait } from '@/components/character-portrait';

const locales = ['zh', 'en', 'ja'] as const;
const text = (locale: SupportedLocale, zh: string, en: string, ja: string) => ({ zh, en, ja })[locale];
const serialize = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
export function generateStaticParams() { return locales.flatMap(lang => materials.map(row => ({ lang, id: row.id }))); }

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const data = nteMaterialDetail(id, locale);
  if (!data) return {};
  const titles = {
    zh: `${data.name} — 异环材料获取攻略 | 掉落来源与角色需求`,
    en: `${data.name} — Neverness to Everness Material Guide | Drop Sources & Characters`,
    ja: `${data.name} — 異環素材入手方法 | ドロップ場所と必要キャラ一覧`,
  };
  const descriptions = { zh: data.source || data.description, en: data.source || data.description, ja: data.source || data.description };
  if (id === 'tri-key') {
    titles.zh = '三把钥匙获取攻略：用途、来源与刷取路线';
    titles.en = 'Tri-Key NTE Guide: Uses, Sources & Farming Route';
    descriptions.zh = '异环三把钥匙 Tri-Key 材料攻略，整理灭碑石加工、猎手交易所、活动奖励、用途说明和刷取优先级。';
    descriptions.en = 'Tri-Key guide for Neverness to Everness with sources, Hunter Exchange, event rewards, crafting routes, uses, and farming priorities.';
  }
  return nteMetadata(locale, `items/${id}`, titles, descriptions);
}

export default async function MaterialDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const data = nteMaterialDetail(id, locale);
  if (!data) notFound();
  const url = `https://gachia.com/${locale}/nte/items/${id}`;
  const schemas = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Gachia', item: 'https://gachia.com' },
      { '@type': 'ListItem', position: 2, name: 'NTE', item: `https://gachia.com/${locale}/nte` },
      { '@type': 'ListItem', position: 3, name: text(locale, '材料', 'Materials', '素材'), item: `https://gachia.com/${locale}/nte/items` },
      { '@type': 'ListItem', position: 4, name: data.name, item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'WebPage', name: data.name, description: data.description, url, inLanguage: locale === 'zh' ? 'zh-CN' : locale },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: data.faqs.map(row => ({ '@type': 'Question', name: row.question,
      acceptedAnswer: { '@type': 'Answer', text: row.answer } })) },
  ];
  return <><NteNav locale={locale} current="items" /><main id="main-content" tabIndex={-1} className="content">
    <nav aria-label={text(locale, '面包屑', 'Breadcrumb', 'パンくず')} className="link-list"><Link href={`/${locale}/nte`}>NTE</Link><span>/</span><Link href={`/${locale}/nte/items`}>{text(locale, '材料', 'Materials', '素材')}</Link><span>/</span><span>{data.name}</span></nav>
    <h1>{data.name}</h1><p className="lead">{data.nameAlt}</p><p aria-label={text(locale, '稀有度', 'Rarity', 'レアリティ')}>{'★'.repeat(data.material.rarity ?? 0)}</p>
    <p>{data.description}</p>
    <section className="grid"><div className="card"><h2>{text(locale, '类型', 'Type', 'タイプ')}</h2><p>{data.type}</p></div><div className="card"><h2>{text(locale, '来源', 'Source', '入手方法')}</h2><p>{data.source || text(locale, '暂未收录', 'Not recorded', '未収録')}</p></div></section>
    {data.characters.length > 0 && <section><h2>{text(locale, '需要此材料的角色', 'Characters That Need This', 'この素材が必要なキャラ')} ({data.characters.length})</h2><div className="grid">{data.characters.map(row => <Link className="card" key={row.id} href={`/${locale}/nte/characters/${row.id}`}><CharacterPortrait id={row.id} name={characterName(row, locale)} locale={locale} className="portrait" /><span>{characterName(row, locale)}</span></Link>)}</div></section>}
    <section className="card"><h2>{text(locale, '使用建议', 'Usage Tips', '使用アドバイス')}</h2><p>{text(locale,
      '养成前建议先确认角色、武器和技能所需材料。先核对背包数量与当前目标，再决定刷取路线。',
      'Confirm character, weapon, and skill requirements before farming. Check inventory and your current target before choosing a route.',
      '育成前にキャラクター・武器・スキルの必要素材と所持数を確認し、目標に合わせて周回先を選んでください。')}</p></section>
    <section><h2>{text(locale, '常见问题', 'FAQ', 'よくある質問')}</h2>{data.faqs.map(row => <details className="card" key={row.question}><summary>{row.question}</summary><p>{row.answer}</p></details>)}</section>
    <section><h2>{text(locale, '下一步去看', 'Next Steps', '次に見るページ')}</h2><div className="link-list">{[['characters', text(locale, '看角色图鉴', 'Browse characters', 'キャラ図鑑へ')], ['weapons', text(locale, '看武器图鉴', 'Browse weapons', '武器図鑑へ')], ['guides', text(locale, '看攻略专题', 'Open guide hub', '攻略特集へ')]].map(([path, title]) => <Link key={path} href={`/${locale}/nte/${path}`}>{title}</Link>)}</div></section>
  </main>{schemas.map((schema, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(schema) }} />)}</>;
}
