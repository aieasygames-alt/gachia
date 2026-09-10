import Link from 'next/link';
import { notFound } from 'next/navigation';
import { weapons, weaponName } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const weapon = weapons.find((entry) => entry.id === id); return weapon ? metadata(locale, `${weaponName(weapon, locale)} | Azur Promilia`, weapon.description[locale], `weapons/${id}`) : {}; }
export default async function WeaponDetail({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const weapon = weapons.find((entry) => entry.id === id); if (!weapon) notFound(); return <><GameNav locale={locale} current="weapons"/><main className="content article"><Link className="back" href={`/${locale}/azur-promilia/weapons`}>{localize(locale, { zh: '返回武器资料', en: 'Back to weapons', ja: '武器一覧に戻る' })}</Link><h1>{weaponName(weapon, locale)}</h1><p className="lead">{weapon.description[locale]}</p></main></>; }

