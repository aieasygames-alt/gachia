import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { text } from '../lib/i18n';
import type { CalculatorCatalog, calculateMaterials } from '../lib/calculator';
import { ownedQuantity } from '../lib/calculator';

const TYPES: Record<string, [string, string, string]> = {
  'character-ascension': ['角色突破', 'Ascension', '突破'], 'talent-book': ['天赋书', 'Talent books', '天賦本'],
  'boss-drop': ['首领材料', 'Boss drops', 'ボス素材'], 'weekly-boss': ['周本材料', 'Weekly boss', '週ボス素材'],
  'local-specialty': ['区域特产', 'Local specialties', '特産品'], 'common-drop': ['普通掉落', 'Common drops', '通常素材'],
  currency: ['货币', 'Currency', '通貨'], 'exp-material': ['经验材料', 'EXP materials', '経験値素材'], other: ['未收录材料', 'Uncatalogued materials', '未登録素材'],
};
export function CalculatorResults({ catalog, result, owned, onOwned, locale }: {
  catalog: CalculatorCatalog; result: ReturnType<typeof calculateMaterials>; owned: Record<string, number>;
  onOwned: (id: string, quantity: number) => void; locale: SupportedLocale;
}) {
  const t = (zh: string, en: string, ja: string) => text(locale, { zh, en, ja });
  const items = result.items.map(row => ({ ...row, material: catalog.materials.find(material => material.id === row.id) }));
  const groups = [...new Set(items.map(row => row.material?.type || 'other'))].sort((a, b) => {
    const order = Object.keys(TYPES); return (order.indexOf(a) < 0 ? order.length : order.indexOf(a)) - (order.indexOf(b) < 0 ? order.length : order.indexOf(b));
  });
  return <div className="calculator__results" data-material-results>
    {result.missingCharacters.length > 0 && <p role="status" className="notice">{t('以下角色暂无需求数据，未计入汇总：', 'No requirements available; excluded from totals: ', '必要数の資料がなく、合計に含まれないキャラ：')}{result.missingCharacters.map(id => {
      const character = catalog.characters.find(row => row.id === id);
      return character ? locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa || character.nameEn : character.nameEn : id;
    }).join(', ')}</p>}
    {result.invalidRows > 0 && <p className="notice" role="status">{t('部分需求记录无效，汇总不完整。', 'Some requirement rows are invalid; totals are incomplete.', '一部の必要数データが無効なため、合計は不完全です。')}</p>}
    <p className="calculator__summary">{t('材料种类', 'Material types', '素材の種類')}: <strong data-material-types>{items.length}</strong></p>
    {!items.length && <p role="status">{t('当前范围没有可汇总的材料需求。', 'No material requirements in this range.', 'この範囲で集計できる必要素材はありません。')}</p>}
    {groups.map(type => {
      const label = TYPES[type], name = label ? t(...label) : type;
      return <details open key={type} className="calculator__group"><summary>{name}</summary><div className="calculator__table"><table>
        <caption className="sr-only">{name}</caption><thead><tr><th scope="col">{t('材料', 'Material', '素材')}</th><th scope="col">{t('需要', 'Required', '必要数')}</th><th scope="col">{t('库存', 'Owned', '所持数')}</th><th scope="col">{t('缺口', 'Missing', '不足数')}</th></tr></thead>
        <tbody>{items.filter(row => (row.material?.type || 'other') === type).sort((a, b) => (b.material?.rarity ?? 1) - (a.material?.rarity ?? 1)).map(row => {
          const name = row.material ? locale === 'zh' ? row.material.name : row.material.nameEn : row.id;
          const have = ownedQuantity(owned[row.id]), deficit = Math.max(0, row.quantity - have);
          return <tr key={row.id} data-material-id={row.id}><th scope="row">{row.material ? <Link href={`/${locale}/genshin/items/${row.id}`}>{name}</Link> : name}</th>
            <td data-required>{row.quantity}</td><td><input type="number" min="0" step="1" max={Number.MAX_SAFE_INTEGER} value={have} aria-label={`${t('库存', 'Owned', '所持数')}: ${name}`} onChange={event => onOwned(row.id, event.target.valueAsNumber)} /></td><td data-deficit data-complete={deficit === 0}>{deficit}</td></tr>;
        })}</tbody></table></div></details>;
    })}
  </div>;
}
