import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { genshinCharacterSummaries, genshinGuides } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { breadcrumbJsonLd, genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return genshinMetadata(locale, '', text(locale, { zh: '原神攻略 Wiki - 角色、武器、圣遗物与攻略', en: 'Genshin Impact Wiki - Characters, Weapons, Artifacts and Guides', ja: '原神 Wiki - キャラ、武器、聖遺物、攻略' }), text(locale, { zh: '原神角色图鉴、武器数据库、圣遗物、材料、攻略、地图与版本资料。', en: 'Genshin Impact characters, weapons, artifacts, materials, guides, map, and version references.', ja: '原神のキャラクター、武器、聖遺物、素材、攻略、マップ、バージョン情報。' }));
}

export default async function GenshinHome({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const paths = ['characters', 'weapons', 'artifacts', 'items', 'guides', 'redeem-codes', 'version', 'gacha', 'map', 'build', 'teams', 'tier-list', 'compare', 'calculator', 'download'];
  const labels: Record<string, Record<SupportedLocale, string>> = {
    characters: { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' }, weapons: { zh: '武器图鉴', en: 'Weapons', ja: '武器' }, artifacts: { zh: '圣遗物', en: 'Artifacts', ja: '聖遺物' }, items: { zh: '材料', en: 'Materials', ja: '素材' }, guides: { zh: '攻略', en: 'Guides', ja: '攻略' }, 'redeem-codes': { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, version: { zh: '版本专题', en: 'Version', ja: 'バージョン' }, gacha: { zh: '祈愿与保底', en: 'Gacha and pity', ja: 'ガチャと天井' }, map: { zh: '交互地图', en: 'Interactive map', ja: 'インタラクティブマップ' }, build: { zh: '配装推荐', en: 'Builds', ja: 'ビルド' }, teams: { zh: '配队参考', en: 'Teams', ja: 'パーティ編成' }, 'tier-list': { zh: '强度参考', en: 'Tier reference', ja: 'Tier参考' }, compare: { zh: '角色对比', en: 'Compare', ja: 'キャラ比較' }, calculator: { zh: '材料计算', en: 'Material planner', ja: '素材計画' }, download: { zh: '下载与平台', en: 'Download', ja: 'DLとプラットフォーム' },
  };
  const title = text(locale, { zh: '原神资料与攻略', en: 'Genshin Impact reference hub', ja: '原神資料と攻略' });
  const overview = text(locale, { zh: '这里汇总角色、武器、圣遗物、材料、攻略、地图与版本资料。准备抽卡时可先确认卡池和兑换码，再从角色定位、已有武器、材料储备与队伍缺口逐步判断；养成时则可从图鉴进入具体资料页核对来源和适配关系。', en: 'This hub connects character, weapon, artifact, material, guide, map, and version references. Before pulling, check banners and redeem codes, then compare a target character with available weapons, materials, and roster gaps. For progression, open the relevant index and verify sources and fit on the detail pages.', ja: 'キャラ、武器、聖遺物、素材、攻略、マップ、バージョン資料をまとめています。ガチャ前はバナーと交換コードを確認し、目標キャラ、使える武器、素材、編成不足を順に見直してください。育成時は図鑑から詳細ページを開き、入手先と適性を確認できます。' });
  const priorities = [
    { path: 'version', label: text(locale, { zh: '先看版本与卡池', en: 'Start with version and banners', ja: 'まずバージョンとバナー' }) },
    { path: 'characters', label: text(locale, { zh: '再看角色定位', en: 'Review character roles', ja: 'キャラの役割を確認' }) },
    { path: 'items', label: text(locale, { zh: '核对养成材料', en: 'Check upgrade materials', ja: '育成素材を確認' }) },
  ];
  const featuredGuides = genshinGuides.slice(0, 12);
  return <main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(locale, '', title)) }} /><div className="eyebrow">Genshin Impact</div><h1>{title}</h1><p className="lead">{text(locale, { zh: `收录 ${genshinCharacterSummaries.length} 名角色、${genshinGuides.length} 篇攻略，以及武器、圣遗物、材料、地图和版本入口。`, en: `${genshinCharacterSummaries.length} characters, ${genshinGuides.length} guides, weapons, artifacts, materials, maps, and version references.`, ja: `${genshinCharacterSummaries.length} 人のキャラ、${genshinGuides.length} 件の攻略、武器、聖遺物、素材、マップ、バージョン情報を掲載。` })}</p><section><h2>{text(locale, { zh: '资料使用顺序', en: 'How to use these references', ja: '資料を見る順番' })}</h2><p>{overview}</p><div className="grid">{priorities.map((entry) => <Link className="card" key={entry.path} href={`/${locale}/genshin/${entry.path}`}><div className="card-title">{entry.label}</div></Link>)}</div></section><section><h2>{text(locale, { zh: '图鉴、攻略与工具', en: 'Indexes, guides, and tools', ja: '図鑑、攻略、ツール' })}</h2><div className="grid">{paths.map((path) => <Link className="card" key={path} href={`/${locale}/genshin/${path}`}><div className="card-title">{labels[path]?.[locale] ?? path}</div></Link>)}</div></section><section><h2>{text(locale, { zh: '精选攻略', en: 'Featured guides', ja: '注目の攻略' })}</h2><div className="grid">{featuredGuides.map((guide) => <Link className="card" key={guide.id} href={`/${locale}/genshin/guides/${guide.id}`}>{locale === 'zh' ? guide.title : locale === 'ja' ? guide.titleJa ?? guide.titleEn : guide.titleEn}</Link>)}</div></section></main>;
}
