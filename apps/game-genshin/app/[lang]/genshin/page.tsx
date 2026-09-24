import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { genshinCharacterSummaries, genshinGuides } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return genshinMetadata(locale, '', text(locale, { zh: '原神攻略 Wiki - 角色、武器、圣遗物与攻略', en: 'Genshin Impact Wiki - Characters, Weapons, Artifacts and Guides', ja: '原神 Wiki - キャラ、武器、聖遺物、攻略' }), text(locale, { zh: '原神角色图鉴、武器数据库、圣遗物、材料、攻略、地图与版本资料。', en: 'Genshin Impact characters, weapons, artifacts, materials, guides, map, and version references.', ja: '原神のキャラクター、武器、聖遺物、素材、攻略、マップ、バージョン情報。' }));
}

export default async function GenshinHome({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const paths = ['characters', 'weapons', 'artifacts', 'items', 'guides', 'redeem-codes', 'version', 'gacha', 'map'];
  const labels: Record<string, Record<SupportedLocale, string>> = {
    characters: { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' }, weapons: { zh: '武器图鉴', en: 'Weapons', ja: '武器' }, artifacts: { zh: '圣遗物', en: 'Artifacts', ja: '聖遺物' }, items: { zh: '材料', en: 'Materials', ja: '素材' }, guides: { zh: '攻略', en: 'Guides', ja: '攻略' }, 'redeem-codes': { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, version: { zh: '版本专题', en: 'Version', ja: 'バージョン' }, gacha: { zh: '祈愿与保底', en: 'Gacha and pity', ja: 'ガチャと天井' }, map: { zh: '交互地图', en: 'Interactive map', ja: 'インタラクティブマップ' },
  };
  const title = text(locale, { zh: '原神资料与攻略', en: 'Genshin Impact reference hub', ja: '原神資料と攻略' });
  return <main className="content"><div className="eyebrow">Genshin Impact</div><h1>{title}</h1><p className="lead">{text(locale, { zh: `收录 ${genshinCharacterSummaries.length} 名角色、${genshinGuides.length} 篇攻略，以及武器、圣遗物、材料、地图和版本入口。`, en: `${genshinCharacterSummaries.length} characters, ${genshinGuides.length} guides, weapons, artifacts, materials, maps, and version references.`, ja: `${genshinCharacterSummaries.length} 人のキャラ、${genshinGuides.length} 件の攻略、武器、聖遺物、素材、マップ、バージョン情報を掲載。` })}</p><section className="grid">{paths.map((path) => <Link className="card" key={path} href={`/${locale}/genshin/${path}`}><div className="card-title">{labels[path]?.[locale] ?? path}</div></Link>)}</section></main>;
}
