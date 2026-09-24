import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { genshinWeapons, getGenshinWeaponEffect, getGenshinWeaponName } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { breadcrumbJsonLd, genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return genshinMetadata(locale, 'weapons', text(locale, { zh: '原神武器图鉴', en: 'Genshin Impact Weapons', ja: '原神武器図鑑' }), text(locale, { zh: '原神武器类型、属性、效果与获取方式。', en: 'Genshin Impact weapon types, stats, effects, and sources.', ja: '原神武器の種類、性能、効果、入手方法。' })); }
export default async function Weapons({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = text(locale, { zh: '原神武器图鉴', en: 'Genshin Impact Weapons', ja: '原神武器図鑑' }); return <><GameNav locale={locale} current="weapons"/><main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(locale, 'weapons', title)) }} /><h1>{title}</h1><div className="grid">{genshinWeapons.map((weapon) => { const effect = getGenshinWeaponEffect(weapon, locale); return <Link className="card" key={weapon.id} href={`/${locale}/genshin/weapons/${weapon.id}`}><div className="card-title">{getGenshinWeaponName(weapon, locale)}</div><div className="meta">{weapon.weaponType} · {weapon.rarity}★</div><p>{effect.description}</p></Link>; })}</div></main></>; }
