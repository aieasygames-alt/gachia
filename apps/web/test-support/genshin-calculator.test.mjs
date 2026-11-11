import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { genshinCharacters, genshinMaterials, getGenshinCharacterImage } from '../../game-genshin/lib/data';
import { characterMaterials } from '@gachia/data/games/genshin/extras';
import { calculateMaterials, calculateDamage, DEFAULT_RANGE, DEFAULT_DAMAGE, CHARACTER_LEVELS, TALENT_LEVELS, ownedQuantity, parseOwnedMaterials } from '../../game-genshin/lib/calculator';
import { CalculatorResults } from '../../game-genshin/components/calculator-results';
import CalculatorPage from '../../game-genshin/app/[lang]/genshin/calculator/page';

const catalog = { characters: genshinCharacters.map(row => ({ ...row, image: getGenshinCharacterImage(row) })), requirements: characterMaterials, materials: genshinMaterials };
const sorted = items => [...items].sort((a, b) => a.id.localeCompare(b.id));
const sumRows = rows => sorted(Object.entries(rows.flatMap(row => row.materials).reduce((result, material) => ({ ...result, [material.id]: (result[material.id] || 0) + material.quantity }), {})).map(([id, quantity]) => ({ id, quantity })));
const noop = () => {};

it('uses all owner characters and preserves the dedicated watchlist plus a no-JS profile fallback', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(await CalculatorPage({ params: Promise.resolve({ lang }) }));
    expect(html).toContain('role="tablist"'); expect(html.match(/role="tab"/g)).toHaveLength(4);
    for (const row of genshinCharacters) expect(html).toContain(`/${lang}/genshin/characters/${row.id}`);
    expect(html).toContain('<noscript>'); expect(html).toContain('material-planner__watchlist'); expect(html).not.toContain('Character archive');
  }
});

it('matches every recorded ascension interval and each individual talent transition, with additive full plans', () => {
  let plans = 0;
  for (const data of characterMaterials) {
    for (const from of CHARACTER_LEVELS) for (const to of CHARACTER_LEVELS.filter(value => value >= from)) {
      const actual = calculateMaterials(characterMaterials, [data.characterId], { from, to, talentFrom: 1, talentTo: 1 });
      const rows = from === to ? [] : data.ascensionMaterials.filter(row => { const [lo, hi] = row.levelRange.split('-').map(Number); return hi > from && lo < to; });
      expect(sorted(actual.items)).toEqual(sumRows(rows)); expect(actual.invalidRows).toBe(0); plans++;
    }
    for (const talentFrom of TALENT_LEVELS) for (const talentTo of TALENT_LEVELS.filter(value => value >= talentFrom)) {
      const rows = data.talentMaterials.filter(row => { const start = Number(row.talentLevel.match(/^\d+/)[0]); return start >= talentFrom && start < talentTo; });
      const actual = calculateMaterials(characterMaterials, [data.characterId], { from: 1, to: 1, talentFrom, talentTo });
      expect(sorted(actual.items)).toEqual(sumRows(rows)); expect(actual.invalidRows).toBe(0); plans++;
    }
    expect(sorted(calculateMaterials(characterMaterials, [data.characterId], DEFAULT_RANGE).items)).toEqual(sumRows([...data.ascensionMaterials, ...data.talentMaterials]));
  }
  console.log(JSON.stringify({ actualRequirementCharacters: characterMaterials.length, intervalPlans: plans, correctedTalentTransitions: true }));
});

it('aggregates multiple characters once, reports absent requirements, and rejects invalid ranges', () => {
  const ids = characterMaterials.slice(0, 3).map(row => row.characterId);
  const full = calculateMaterials(characterMaterials, [...ids, ids[0], 'missing-character'], DEFAULT_RANGE);
  expect(sorted(full.items)).toEqual(sumRows(characterMaterials.slice(0, 3).flatMap(row => [...row.ascensionMaterials, ...row.talentMaterials])));
  expect(full.missingCharacters).toEqual(['missing-character']);
  for (const range of [{ from: 91 }, { from: 90, to: 1 }, { talentFrom: 8, talentTo: 1 }, { talentTo: NaN }]) expect(() => calculateMaterials(characterMaterials, ids, { ...DEFAULT_RANGE, ...range })).toThrow('Invalid material range');
  const invalid = [{ characterId: 'invalid', ascensionMaterials: [{ levelRange: 'oops', materials: [] }], talentMaterials: [{ talentLevel: '1→10', materials: [] }, { talentLevel: '1→2', materials: [{ id: 'mora', quantity: Infinity }] }] }];
  expect(calculateMaterials(invalid, ['invalid'], DEFAULT_RANGE)).toEqual({ items: [], missingCharacters: [], invalidRows: 3 });
});

it('renders actual required quantities in all locales, including uncatalogued IDs and zero deficits', () => {
  let views = 0, quantities = 0;
  for (const character of catalog.characters) for (const locale of ['zh', 'en', 'ja']) {
    const result = calculateMaterials(characterMaterials, [character.id], DEFAULT_RANGE);
    const owned = Object.fromEntries(result.items.map(row => [row.id, row.quantity]));
    const html = renderToStaticMarkup(createElement(CalculatorResults, { catalog, result, owned, onOwned: noop, locale }));
    for (const row of result.items) { const markup = html.split(`data-material-id="${row.id}"`)[1]?.split('</tr>')[0]; expect(markup).toContain(`data-required="true">${row.quantity}</td>`); quantities++; }
    expect(html.match(/data-complete="true"/g) ?? []).toHaveLength(result.items.length); views++;
  }
  expect(views).toBe(342); console.log(JSON.stringify({ actualMaterialViews: views, quantityAssertions: quantities }));
  const marker = '<script>owner-update</script>';
  const changed = { ...catalog, materials: [{ ...catalog.materials[0], id: 'new-material', nameEn: marker }] };
  const result = { items: [{ id: 'new-material', quantity: 7 }, { id: 'unresolved-id', quantity: 3 }], missingCharacters: [], invalidRows: 0 };
  const html = renderToStaticMarkup(createElement(CalculatorResults, { catalog: changed, result, owned: {}, onOwned: noop, locale: 'en' }));
  expect(html).toContain('&lt;script&gt;owner-update&lt;/script&gt;'); expect(html).not.toContain('<script>owner-update'); expect(html).toContain('unresolved-id');
});

it('validates legacy inventory without accepting arrays, prototype keys, non-numbers or unbounded quantities', () => {
  expect(parseOwnedMaterials(null)).toEqual({});
  expect(parseOwnedMaterials('{"mora":42,"bad":-1,"str":"2","fraction":1.5,"__proto__":7}')).toEqual({ mora: 42 });
  for (const raw of ['[]', 'null', 'broken', '"text"']) expect(() => parseOwnedMaterials(raw)).toThrow();
  for (const value of [Infinity, NaN, -1, undefined, '7']) expect(ownedQuantity(value)).toBe(0);
  expect(ownedQuantity(3.8)).toBe(3); expect(ownedQuantity(1e30)).toBe(Number.MAX_SAFE_INTEGER);
});

it('preserves the simplified Main damage formula and rejects unusable inputs', () => {
  for (const critRate of [0, 60, 100]) for (const skillMult of [0, 300, 999.9]) {
    const stats = { ...DEFAULT_DAMAGE, critRate, skillMult }, result = calculateDamage(stats);
    const attack = stats.baseAtk * (1 + stats.atkPercent / 100) + stats.flatAtk;
    expect(result.totalAtk).toBe(attack);
    expect(result.average).toBeCloseTo(attack * skillMult / 100 * (1 + stats.dmgBonus / 100) * (1 + critRate / 100 * stats.critDmg / 100), 8);
    expect(result.critical).toBeCloseTo(attack * skillMult / 100 * (1 + stats.dmgBonus / 100) * (1 + stats.critDmg / 100), 8);
    expect(result.critValue).toBe(critRate * stats.critDmg / 100);
  }
  for (const change of [{ baseAtk: -1 }, { critRate: 101 }, { critDmg: Infinity }, { skillMult: NaN }, { baseAtk: 1e308, flatAtk: 1e308 }]) expect(calculateDamage({ ...DEFAULT_DAMAGE, ...change })).toBeNull();
});
