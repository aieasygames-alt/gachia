import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GameNav } from '@/components/game-nav';
import { genshinMaterials, getGenshinMaterialById, getGenshinMaterialName } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateStaticParams() { return ['zh', 'en', 'ja'].flatMap((lang) => genshinMaterials.map((material) => ({ lang, id: material.id }))); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const material = getGenshinMaterialById(id); return material ? genshinMetadata(locale, `items/${id}`, `${getGenshinMaterialName(material, locale)} - Genshin Impact`, material.sourceEn || material.source) : {}; }
export default async function ItemDetail({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const material = getGenshinMaterialById(id); if (!material) notFound(); return <><GameNav locale={locale} current="items"/><main className="content article"><Link className="back" href={`/${locale}/genshin/items`}>{text(locale, { zh: '返回材料图鉴', en: 'Back to materials', ja: '素材一覧に戻る' })}</Link><h1>{getGenshinMaterialName(material, locale)}</h1><div className="facts"><div><span>{text(locale, { zh: '类型', en: 'Type', ja: '種類' })}</span><strong>{material.type}</strong></div><div><span>{text(locale, { zh: '稀有度', en: 'Rarity', ja: 'レアリティ' })}</span><strong>{material.rarity}★</strong></div></div><h2>{text(locale, { zh: '获取方式', en: 'Source', ja: '入手方法' })}</h2><p>{locale === 'zh' ? material.source : material.sourceEn || material.source}</p></main></>; }
