import { serializeJsonLd, type SupportedLocale } from '@gachia/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guides } from '@/lib/data';
import { previewMetadata } from '@/lib/seo';
import { nteGuideFaq, nteGuideReading } from '@/lib/guide-policy';
import { NteNav } from '@/components/nte-nav';
import { GuideContent } from '@/components/guide-content';

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang, slug } = await params;
  const locale = lang as SupportedLocale, guide = guides.find(entry => entry.id === slug);
  if (!guide) return {};
  const reading = nteGuideReading(guide, locale);
  return previewMetadata(`${reading.title} — NTE`, reading.summary, locale, `/guides/${slug}`);
}

export default async function GuideDetail({ params }: Props) {
  const { lang, slug } = await params;
  const locale = lang as SupportedLocale, guide = guides.find(entry => entry.id === slug);
  if (!guide) notFound();
  const reading = nteGuideReading(guide, locale), faq = nteGuideFaq(guide, reading.locale);
  const url = `https://gachia.com/${locale}/nte/guides/${slug}`;
  const structuredData = [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Gachia', item: `https://gachia.com/${locale}` },
    { '@type': 'ListItem', position: 2, name: 'NTE', item: `https://gachia.com/${locale}/nte` },
    { '@type': 'ListItem', position: 3, name: reading.title, item: url },
  ] }, { '@context': 'https://schema.org', '@type': 'Article', inLanguage: reading.lang, headline: reading.title,
    description: reading.summary, datePublished: guide.date, mainEntityOfPage: url },
  ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: reading.lang,
    mainEntity: faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }] : [])];
  return <><NteNav locale={locale} current="guides"/><main id="main-content" tabIndex={-1} className="content article">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    <Link className="back" href={`/${locale}/nte/guides`}>{locale === 'zh' ? '返回攻略列表' : locale === 'ja' ? '攻略一覧に戻る' : 'Back to guides'}</Link>
    <div className="eyebrow">NTE Guide</div>
    {reading.fallback && <aside className="notice" data-guide-fallback>
      <p>{locale === 'zh' ? '中文译文尚未完成，以下显示原文。' : locale === 'ja' ? '日本語訳は未完了です。以下に原文を表示します。' : 'An English translation is not complete. The source text is shown below.'}</p>
      <Link href={`/${reading.locale}/nte/guides/${slug}`}>{locale === 'zh' ? '打开原文页面' : locale === 'ja' ? '原文のページを開く' : 'Open the source-language page'}</Link>
    </aside>}
    <h1 lang={reading.lang}>{reading.title}</h1>
    {reading.summary && <p className="notice" lang={reading.lang}>{reading.summary}</p>}
    <div data-guide-content lang={reading.lang}><GuideContent content={reading.content} locale={locale}/></div>
    {faq.length > 0 && <section className="detail-section" lang={reading.lang}><h2>{locale === 'zh' ? '常见问题' : locale === 'ja' ? 'よくある質問' : 'FAQ'}</h2>
      <div className="faq-list">{faq.map((item, index) => <article className="card" key={index}><div className="card__title">{item.question}</div><p>{item.answer}</p></article>)}</div>
    </section>}
    <div className="link-list"><Link href={`/${locale}/nte/characters`}>{locale === 'zh' ? '角色图鉴' : locale === 'ja' ? 'キャラクター図鑑' : 'Characters'}</Link>
      <Link href={`/${locale}/nte/version`}>{locale === 'zh' ? '版本专题' : locale === 'ja' ? 'バージョン情報' : 'Version hub'}</Link></div>
  </main></>;
}
