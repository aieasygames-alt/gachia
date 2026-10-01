import Link from 'next/link';
import { notFound } from 'next/navigation';
import { diskSetEffect, diskSets, getNteDiskSetName } from '@/lib/data';
import type { SupportedLocale } from '@gachia/core';
import { NteNav } from '@/components/nte-nav';
import { previewMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const set = diskSets.find((item) => item.id === id);
  if (!set) return {};
  const name = getNteDiskSetName(set, locale);
  const description = locale === 'zh' ? `${name} 的 2 件套与 4 件套效果。` : locale === 'ja' ? `${name}の2セット・4セット効果。` : `${name} 2-piece and 4-piece effects.`;
  return previewMetadata(`${name} — NTE`, description, locale, `/disk-sets/${id}`);
}
export default async function DiskSetDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params; const locale = lang as SupportedLocale; const set = diskSets.find((item) => item.id === id);
  if (!set) notFound();
  return <><NteNav locale={locale} current="build"/><main id="main-content" tabIndex={-1} className="content article"><Link className="back" href={`/${locale}/nte/disk-sets`}>{locale==='zh'?'返回驱动盘图鉴':locale==='ja'?'ディスクセット一覧に戻る':'Back to disk sets'}</Link><div className="eyebrow">NTE Disk Set</div><h1>{getNteDiskSetName(set, locale)}</h1><div className="card"><div className="card__title">{locale==='zh'?'2 件套效果':locale==='ja'?'2セット効果':'2-piece effect'}</div><p>{diskSetEffect(set, 2, locale)}</p></div><div className="card"><div className="card__title">{locale==='zh'?'4 件套效果':locale==='ja'?'4セット効果':'4-piece effect'}</div><p>{diskSetEffect(set, 4, locale)}</p></div><div className="link-list"><Link href={`/${locale}/nte/build`}>{locale==='zh'?'角色配装':locale==='ja'?'キャラクタービルド':'Character builds'}</Link><Link href={`/${locale}/nte/characters`}>{locale==='zh'?'角色图鉴':locale==='ja'?'キャラクター図鑑':'Characters'}</Link></div></main></>;
}
