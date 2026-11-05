import type { SupportedLocale } from '@gachia/core';
import Link from 'next/link';
import { guides } from '@/lib/data';
import { previewMetadata } from '@/lib/seo';
import { nteGuideReading } from '@/lib/guide-policy';
import { NteNav } from '@/components/nte-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  return previewMetadata(locale === 'zh' ? '异环攻略百科' : locale === 'ja' ? 'NTE 攻略' : 'NTE Guides', 'NTE guides preview', locale, '/guides');
}

export default async function Guides({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const title = locale === 'zh' ? '异环攻略百科' : locale === 'ja' ? 'NTE 攻略' : 'NTE Guides';
  return <><NteNav locale={locale} current="guides"/><main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">NTE Guides</div><h1>{title}</h1>
    <p className="lead">{locale === 'zh' ? `安装、版本、抽卡与养成攻略，共 ${guides.length} 篇内容。` : locale === 'ja' ? `インストール、バージョン、ガチャ、育成の攻略を ${guides.length} 件掲載しています。` : `Install, version, gacha, and progression guides. ${guides.length} entries.`}</p>
    <section className="grid">{guides.map(guide => {
      const reading = nteGuideReading(guide, locale);
      return <Link className="card" key={guide.id} href={`/${locale}/nte/guides/${guide.id}`}>
        <div className="card__title" lang={reading.lang}>{reading.title}</div>
        <div className="card__meta" lang={reading.lang}>{reading.summary}</div>
        {reading.fallback && <p className="translation-note">{locale === 'zh' ? '原文' : locale === 'ja' ? '原文' : 'Source'}: {reading.lang}</p>}
        <p lang={reading.lang}>{reading.content.replace(/[#*_`]/g, '').slice(0, 220)}...</p>
      </Link>;
    })}</section>
  </main></>;
}
