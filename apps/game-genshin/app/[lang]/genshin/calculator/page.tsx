import { GameNav } from '@/components/game-nav';
import { genshinCharacters, genshinMaterials, getGenshinCharacterImage } from '@/lib/data';
import { characterMaterials } from '@gachia/data/games/genshin/extras';
import { GenshinCalculator } from '@/components/calculator';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

const titleFor = (locale: ReturnType<typeof asLocale>) => text(locale, { zh: '原神养成与伤害计算器', en: 'Genshin Impact Calculator', ja: '原神育成・ダメージ計算機' });
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return genshinMetadata(locale, 'calculator', titleFor(locale), text(locale, { zh: '原神角色养成材料、库存和简化伤害计算。', en: 'Genshin Impact character materials, inventory, and simplified damage calculations.', ja: '原神キャラクター育成素材、在庫、簡易ダメージ計算。' }));
}
export default async function Calculator({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const characters = genshinCharacters.map(character => {
    const { id, name, nameEn, nameJa, element, rarity } = character;
    return { id, name, nameEn, nameJa, element, rarity, image: getGenshinCharacterImage(character) };
  });
  return <><GameNav locale={locale} current="calculator"/><main id="main-content" tabIndex={-1} className="content calculator-page">
    <h1>{titleFor(locale)}</h1><p className="lead">{text(locale, { zh: '具体消耗与账号库存仍以游戏内资料为准。', en: 'Confirm exact costs and account inventory in-game.', ja: '正確な消費量と在庫はゲーム内で確認してください。' })}</p>
    <GenshinCalculator catalog={{ characters, materials: genshinMaterials, requirements: characterMaterials }} locale={locale} />
  </main></>;
}
