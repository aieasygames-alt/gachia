import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { genshinMaterials, getGenshinMaterialName } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { breadcrumbJsonLd, genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return genshinMetadata(locale, 'items', text(locale, { zh: '原神材料图鉴', en: 'Genshin Impact Materials', ja: '原神素材図鑑' }), text(locale, { zh: '原神角色突破、天赋、Boss、区域特产和通用材料。', en: 'Genshin Impact character ascension, talent, boss, local specialty, and common materials.', ja: '原神のキャラクター突破、天賦、ボス、地域特産品、共通素材。' })); }
export default async function Items({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = text(locale, { zh: '原神材料图鉴', en: 'Genshin Impact Materials', ja: '原神素材図鑑' }); return <><GameNav locale={locale} current="items"/><main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(locale, 'items', title)) }}/><h1>{title}</h1><div className="grid">{genshinMaterials.map((material) => <Link className="card" key={material.id} href={`/${locale}/genshin/items/${material.id}`}><div className="card-title">{getGenshinMaterialName(material, locale)}</div><div className="meta">{material.type} · {material.rarity}★</div></Link>)}</div></main></>; }
