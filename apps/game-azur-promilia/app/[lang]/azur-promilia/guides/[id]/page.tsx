import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guides } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const guide = guides.find((entry) => entry.id === id); return guide ? metadata(locale, guide.title[locale], guide.summary[locale], `guides/${id}`) : {}; }
export default async function Guide({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const guide = guides.find((entry) => entry.id === id); if (!guide) notFound(); return <><GameNav locale={locale} current="guides"/><main className="content article"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: guide.title[locale], description: guide.summary[locale], mainEntityOfPage: url(locale, `guides/${id}`) }) }} /><Link className="back" href={`/${locale}/azur-promilia/guides`}>{localize(locale, { zh: '返回攻略列表', en: 'Back to guides', ja: '攻略一覧に戻る' })}</Link><h1>{guide.title[locale]}</h1><p className="notice">{guide.summary[locale]}</p><p className="guide-content">{guide.content[locale]}</p>{guide.source && <p className="source-line">{localize(locale, { zh: '资料来源：', en: 'Source: ', ja: '出典：' })}<a href={guide.source.url} rel="noreferrer" target="_blank">{guide.source.name}</a> ({guide.source.checkedAt})</p>}</main></>; }
