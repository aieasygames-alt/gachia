import { kiboLifecycle, tuningMarkGlossary } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return metadata(locale, localize(locale, { zh: '蓝色星原：旅谣系统词典', en: 'Azur Promilia Systems Glossary', ja: 'アズールプロミリア システム用語集' }), localize(locale, { zh: '调谐印记、Kibo 捕捉进化和生产设施的可信系统参考。', en: 'Trusted references for Tuning Marks, Kibo capture and evolution, and production facilities.', ja: '調律マーク、キボ捕獲・進化、生産施設の信頼できるシステム参照。' }), 'systems');
}

export default async function Systems({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '系统词典', en: 'Systems Glossary', ja: 'システム用語集' });
  const sections = [
    { title: localize(locale, { zh: '调谐印记', en: 'Tuning Marks', ja: '調律マーク' }), entries: tuningMarkGlossary },
    { title: localize(locale, { zh: 'Kibo 捕捉与进化', en: 'Kibo capture and evolution', ja: 'キボ捕獲・進化' }), entries: kiboLifecycle },
  ];
  return <><GameNav locale={locale} current="systems" /><main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(locale, 'systems') }) }} /><h1>{title}</h1><p className="lead">{localize(locale, { zh: '按系统拆分的 CBT 参考词典。正式版本发布后会逐条更新并保留核验记录。', en: 'A system-by-system CBT reference glossary. Each entry will retain its verification record when release data becomes available.', ja: 'システム別のCBT参照用語集。正式版データ公開後も確認履歴を保持して更新します。' })}</p>{sections.map((section) => <section className="article" key={section.title}><h2>{section.title}</h2><div className="grid">{section.entries.map((entry) => <article className="card" key={entry.id}><div className="card__title">{entry.label[locale]}</div><p>{entry.description[locale]}</p></article>)}</div></section>)}</main></>;
}
