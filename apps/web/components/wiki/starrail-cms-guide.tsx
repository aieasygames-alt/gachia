import type { SupportedLocale } from '@gachia/core';
import { isCommunityStarRailSource } from '@gachia/data/cms/starrail-updates';
import { STARRAIL_CMS_GUIDES } from '@gachia/data/cms/starrail-guides';
import { loadStarRailUpdates } from '@/lib/starrail-publication';
import { Link } from '@/lib/i18n/navigation';

export async function loadStarRailGuide(locale: SupportedLocale, slug: string) {
  const result = await loadStarRailUpdates(locale);
  return result.updates.find(doc => doc.locale === locale && doc.kind === 'guide' && doc.slug === slug) ?? null;
}

export async function starRailGuideMetadata(locale: SupportedLocale, slug: keyof typeof STARRAIL_CMS_GUIDES) {
  const guide = await loadStarRailGuide(locale, slug);
  const title = guide?.title ?? STARRAIL_CMS_GUIDES[slug][locale];
  const description = guide?.summary ?? ({ zh: '本页资料正在核验，已发布资料及适用范围请查看中文页面。', en: 'This guide is awaiting a verified publication in this language. The Chinese page states its scope and sources.', ja: 'この言語の確認済み資料は準備中です。中国語ページで対象範囲と出典を確認してください。' }[locale]);
  return { title, description, robots: { index: Boolean(guide), follow: true }, alternates: { canonical: `https://gachia.com/${locale}/starrail/guides/${slug}` }, openGraph: { title, description, url: `https://gachia.com/${locale}/starrail/guides/${slug}`, siteName: 'Gachia' } };
}

export async function StarRailCmsGuide({ locale, slug }: { locale: SupportedLocale; slug: keyof typeof STARRAIL_CMS_GUIDES }) {
  const guide = await loadStarRailGuide(locale, slug);
  const copy = {
    zh: { checked: '来源核验', scope: '适用范围与待核验项', source: '官方来源', community: '第三方资料', empty: '当前语言暂无已发布的核验正文。中文页面会标明资料来源与适用范围。', all: '攻略目录', version: '当前版本与公告' },
    en: { checked: 'Source checked', scope: 'Scope and pending checks', source: 'Official source', community: 'Community reference', empty: 'No verified guide is published in this language yet. The Chinese page states its sources and scope.', all: 'All guides', version: 'Current version and notices' },
    ja: { checked: '出典確認', scope: '対象範囲と未確認事項', source: '公式出典', community: 'コミュニティ資料', empty: 'この言語の確認済みガイドは未公開です。中国語ページに出典と対象範囲を明記しています。', all: 'ガイド一覧', version: '現在の更新と告知' },
  }[locale];
  return <article className="space-y-6">
    <h1 className="text-2xl font-bold text-game-primary">{guide?.title ?? STARRAIL_CMS_GUIDES[slug][locale]}</h1>
    {guide ? <>
      <p className="text-sm leading-7 text-game-text-muted">{guide.summary}</p>
      <p className="text-xs text-game-text-muted">{guide.region} · {copy.checked} <time dateTime={guide.checkedAt}>{guide.checkedAt}</time></p>
      {guide.facts.map((fact, index) => {
        const [heading, ...paragraphs] = fact.text.split('\n').filter(Boolean);
        return <section key={index} className="rounded-xl border border-game-border bg-game-surface p-5">
          <h2 className="text-lg font-semibold text-game-text">{heading}</h2>
          {paragraphs.map((text, i) => <p key={i} className="mt-3 text-sm leading-7 text-game-text-muted">{text}</p>)}
        </section>;
      })}
      <section className="border-l-2 border-game-primary pl-4"><h2 className="font-semibold text-game-text">{copy.scope}</h2><p className="mt-2 text-sm leading-7 text-game-text-muted">{guide.boundary}</p></section>
      <div className="flex flex-wrap gap-4">{guide.sources.map((source, i) => <a key={source.url} href={source.url} rel="noreferrer" className="text-sm text-game-primary underline">{isCommunityStarRailSource(source.url) ? copy.community : copy.source} {i + 1}</a>)}</div>
    </> : <p className="text-sm leading-7 text-game-text-muted">{copy.empty} <Link className="text-game-primary underline" locale="zh" href={`/starrail/guides/${slug}`}>中文</Link></p>}
    <nav className="flex flex-wrap gap-4 text-sm text-game-primary"><Link href="/starrail/guides">{copy.all}</Link><Link href="/starrail/version">{copy.version}</Link></nav>
  </article>;
}
