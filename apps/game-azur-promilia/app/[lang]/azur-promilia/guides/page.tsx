import Link from 'next/link';
import { guides } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return metadata(locale, localize(locale, { zh: '蓝色星原：旅谣攻略', en: 'Azur Promilia Guides', ja: 'アズールプロミリア 攻略' }), localize(locale, { zh: '蓝色星原：旅谣的官方信息核对与攻略。', en: 'Official-information checks and guides for Azur Promilia.', ja: 'アズールプロミリアの公式情報確認と攻略。' }), 'guides'); }
export default async function Guides({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = localize(locale, { zh: '攻略与核对清单', en: 'Guides and checklists', ja: '攻略と確認リスト' }); return <><GameNav locale={locale} current="guides"/><main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(locale, 'guides') }) }} /><h1>{title}</h1><section className="grid">{guides.map((guide) => <Link className="card" href={`/${locale}/azur-promilia/guides/${guide.id}`} key={guide.id}><div className="card__title">{guide.title[locale]}</div><p>{guide.summary[locale]}</p></Link>)}</section></main></>; }
