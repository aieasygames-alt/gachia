import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { InteractiveMap } from '@/components/map';
import { asLocale, text } from '@/lib/i18n';
import { mapCatalog } from '@/lib/map-model';
import { genshinMetadata } from '@/lib/seo';

const title = { zh: '原神交互地图', en: 'Genshin Impact Interactive Map', ja: '原神インタラクティブマップ' };
const related = [
  { path: 'characters', names: { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター図鑑' } },
  { path: 'version', names: { zh: '版本专题', en: 'Version watch', ja: 'バージョン特集' } },
  { path: 'guides', names: { zh: '攻略百科', en: 'Guides', ja: '攻略' } },
];
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return genshinMetadata(locale, 'map', text(locale, title), text(locale, { zh: '原神区域、传送点、神瞳、秘境与资源点位参考。', en: 'Genshin Impact regions, waypoints, oculi, domains, and resource-point references.', ja: '原神の地域、ワープポイント、神の瞳、秘境、資源ポイント参考。' }));
}
export default async function MapPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang), catalog = mapCatalog(locale);
  return <><GameNav locale={locale} current="map" /><main id="main-content" tabIndex={-1} className="map-page">
    <header className="map-page-heading"><h1>{text(locale, title)}</h1><Link href={`/${locale}/genshin/items`}>{text(locale, { zh: '材料图鉴', en: 'Materials', ja: '素材図鑑' })}</Link></header>
    <InteractiveMap catalog={catalog} locale={locale} />
    <noscript><style>{'.map-tool { display: none; }'}</style><section className="map-fallback"><h2>{text(locale, { zh: '地图区域', en: 'Map regions', ja: 'マップ地域' })}</h2>
      <ul>{catalog.maps.map(map => <li key={map.id}>{locale === 'zh' ? map.nameZh : locale === 'ja' ? map.nameJa : map.nameEn}</li>)}</ul>
      <h2>{text(locale, { zh: '点位分类', en: 'Point categories', ja: 'ポイント分類' })}</h2><ul>{catalog.categories.map(category => <li key={category.id}>{category.name}</li>)}</ul>
    </section></noscript>
    <nav className="map-next" aria-label={text(locale, { zh: '相关资料', en: 'Related references', ja: '関連資料' })}>
      {related.map(({ path, names }) => <Link key={path} href={`/${locale}/genshin/${path}`}>{text(locale, names)}</Link>)}
    </nav>
  </main></>;
}
