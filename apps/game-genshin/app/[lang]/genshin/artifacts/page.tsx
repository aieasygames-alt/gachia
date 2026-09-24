import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { artifactSets, getArtifactSetDesc2pc, getArtifactSetDesc4pc, getArtifactSetName } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { breadcrumbJsonLd, genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return genshinMetadata(locale, 'artifacts', text(locale, { zh: '原神圣遗物图鉴', en: 'Genshin Impact Artifacts', ja: '原神聖遺物図鑑' }), text(locale, { zh: '原神圣遗物两件套、四件套效果和适配角色。', en: 'Genshin Impact artifact two-piece, four-piece effects, and character fit.', ja: '原神聖遺物の2セット・4セット効果と適性キャラクター。' })); }
export default async function Artifacts({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = text(locale, { zh: '原神圣遗物图鉴', en: 'Genshin Impact Artifacts', ja: '原神聖遺物図鑑' }); return <><GameNav locale={locale} current="artifacts"/><main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(locale, 'artifacts', title)) }}/><h1>{title}</h1><div className="grid">{artifactSets.map((set) => <Link className="card" key={set.id} href={`/${locale}/genshin/artifacts/${set.id}`}><div className="card-title">{getArtifactSetName(set, locale)}</div><p>2pc: {getArtifactSetDesc2pc(set, locale)}</p><p>4pc: {getArtifactSetDesc4pc(set, locale)}</p></Link>)}</div></main></>; }
