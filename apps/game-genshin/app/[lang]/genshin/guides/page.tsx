import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { genshinGuides, getGuideSummary, getGuideTitle } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return genshinMetadata(locale, 'guides', text(locale, { zh: '原神攻略百科', en: 'Genshin Impact Guides', ja: '原神攻略' }), text(locale, { zh: '原神版本、抽卡、养成、地图和玩法攻略。', en: 'Genshin Impact version, pulls, progression, maps, and gameplay guides.', ja: '原神のバージョン、ガチャ、育成、マップ、ゲームプレイ攻略。' })); }
export default async function Guides({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return <><GameNav locale={locale} current="guides"/><main className="content"><h1>{text(locale, { zh: '原神攻略百科', en: 'Genshin Impact Guides', ja: '原神攻略' })}</h1><div className="grid">{genshinGuides.map((guide) => <Link className="card" key={guide.id} href={`/${locale}/genshin/guides/${guide.id}`}><div className="card-title">{getGuideTitle(guide, locale)}</div><p>{getGuideSummary(guide, locale)}</p></Link>)}</div></main></>; }
