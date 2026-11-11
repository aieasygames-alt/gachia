import { GameNav } from '@/components/game-nav';
import Link from 'next/link';
import { CharacterCompare } from '@/components/compare';
import { projectCompareCatalog } from '@/lib/compare';
import { artifactSets, genshinCharacters, genshinWeapons, getGenshinCharacterImage } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = text(locale, { zh: '原神角色对比', en: 'Genshin Impact Character Compare', ja: '原神キャラクター比較' }); return genshinMetadata(locale, 'compare', title, text(locale, { zh: '原神角色元素、武器类型、稀有度和培养方向对比。', en: 'Compare Genshin Impact character elements, weapon types, rarity, and build direction.', ja: '原神キャラクターの元素、武器種、レアリティ、育成方針を比較。' })); }
export default async function Compare({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = text(locale, { zh: '原神角色对比', en: 'Genshin Impact Character Compare', ja: '原神キャラクター比較' });
  const catalog = projectCompareCatalog(genshinCharacters, genshinWeapons, artifactSets, getGenshinCharacterImage);
  return <><GameNav locale={locale} current="compare"/><main id="main-content" tabIndex={-1} className="content compare-page"><h1>{title}</h1><p className="lead">{text(locale, { zh: '比较前先明确要解决的队伍缺口。角色实际价值会随武器、圣遗物、命座和队友变化。', en: 'Define the roster gap before comparing. Character value changes with weapons, artifacts, constellations, and teammates.', ja: '比較前に編成不足を明確にしてください。キャラの価値は武器、聖遺物、命ノ星座、仲間で変わります。' })}</p>
    <CharacterCompare catalog={catalog} locale={locale} />
    <nav className="compare-next" aria-label={text(locale, { zh: '相关资料', en: 'Related references', ja: '関連資料' })}>
      <Link href={`/${locale}/genshin/characters`}>{text(locale, { zh: '看角色图鉴', en: 'Browse Characters', ja: 'キャラ図鑑を見る' })}</Link>
      <Link href={`/${locale}/genshin/build`}>{text(locale, { zh: '看配装推荐', en: 'Open Build Recommender', ja: 'ビルドを見る' })}</Link>
      <Link href={`/${locale}/genshin/version`}>{text(locale, { zh: '看版本更新', en: 'Check Version Updates', ja: '更新情報を見る' })}</Link>
    </nav></main></>;
}
