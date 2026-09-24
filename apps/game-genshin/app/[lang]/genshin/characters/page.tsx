import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { genshinCharacterSummaries, getGenshinCharacterSummaryImage, getGenshinCharacterSummaryName } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return genshinMetadata(locale, 'characters', text(locale, { zh: '原神角色图鉴', en: 'Genshin Impact Characters', ja: '原神キャラクター図鑑' }), text(locale, { zh: '原神角色属性、武器类型、稀有度与培养资料。', en: 'Genshin Impact character attributes, weapon types, rarity, and build references.', ja: '原神キャラクターの元素、武器種、レアリティ、育成情報。' })); }
export default async function Characters({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return <><GameNav locale={locale} current="characters"/><main className="content"><h1>{text(locale, { zh: '原神角色图鉴', en: 'Genshin Impact Characters', ja: '原神キャラクター図鑑' })}</h1><div className="grid">{genshinCharacterSummaries.map((character) => <Link className="card" key={character.id} href={`/${locale}/genshin/characters/${character.id}`}><img alt="" loading="lazy" src={getGenshinCharacterSummaryImage(character)} style={{ width: '100%', height: 150, objectFit: 'cover' }}/><div className="card-title">{getGenshinCharacterSummaryName(character, locale)}</div><div className="meta">{character.element} · {character.weaponType} · {character.rarity}★</div></Link>)}</div></main></>; }
