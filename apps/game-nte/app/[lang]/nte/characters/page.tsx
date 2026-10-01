import type { SupportedLocale } from '@gachia/core';
import { nteCharacterSummaries } from '@/lib/data';
import { previewMetadata } from '@/lib/seo';
import { NteNav } from '@/components/nte-nav';
import { CharacterDirectory } from '@/components/character-directory';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = (await params).lang as SupportedLocale; return previewMetadata(locale === 'zh' ? '异环角色图鉴' : locale === 'ja' ? 'NTE キャラクター' : 'NTE Characters', 'NTE character database preview', locale, '/characters'); }
export default async function Characters({ params }: { params: Promise<{ lang: string }> }) { const locale = (await params).lang as SupportedLocale; const title = locale === 'zh' ? '异环角色图鉴' : locale === 'ja' ? 'NTE キャラクター図鑑' : 'NTE Character Database'; return <><NteNav locale={locale} current="characters"/><main id="main-content" tabIndex={-1} className="content"><div className="eyebrow">NTE Database</div><h1>{title}</h1><p className="lead">{locale === 'zh' ? `收录 ${nteCharacterSummaries.length} 名角色，查看属性、稀有度、定位与对应攻略。` : locale === 'ja' ? `${nteCharacterSummaries.length}人の属性・レアリティ・役割と攻略を確認できます。` : `Browse ${nteCharacterSummaries.length} characters by attribute, rank, role and related guides.`}</p><CharacterDirectory characters={nteCharacterSummaries} locale={locale}/></main></>; }
