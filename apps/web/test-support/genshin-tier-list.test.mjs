import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { genshinCharacters, getGenshinCharacterImage } from '../../game-genshin/lib/data';
import { compareElements, compareWeaponLabel, compareWeaponTypes } from '../../game-genshin/lib/compare';
import { emptyTierFilters, filterTierCharacters, groupTierCharacters, projectTierCharacters, tierName, tierOrder } from '../../game-genshin/lib/tier-list';
import { TierDistribution, TierResults } from '../../game-genshin/components/tier-results';
import TierListPage from '../../game-genshin/app/[lang]/genshin/tier-list/page';

const catalog = () => projectTierCharacters(genshinCharacters, getGenshinCharacterImage);
const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);

it('projects only the current owner rating identities without a second tier dataset', () => {
  const data = catalog(); expect(data).toHaveLength(114);
  for (const [index, character] of data.entries()) {
    expect(Object.keys(character).sort()).toEqual(['id', 'name', 'nameEn', 'nameJa', 'element', 'weaponType', 'rarity', 'tierRank', 'image'].sort());
    expect(character.tierRank).toBe(genshinCharacters[index].tierRank); expect(character.image).toBe(getGenshinCharacterImage(genshinCharacters[index]));
  }
});

it('renders the real three-language page with all 114 including C, no-JS results and legacy date caveat', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(await TierListPage({ params: Promise.resolve({ lang }) }));
    expect(html.match(/data-tier-character=/g)).toHaveLength(114); expect(html).toContain('<noscript>'); expect(html).toContain('2026-06-28');
    expect(html.replace(/<!-- -->/g, '')).toContain('114 / 114'); expect(html).toContain('data-tier="C"');
    for (const character of genshinCharacters) expect(html).toContain(`/${lang}/genshin/characters/${character.id}`);
    for (const path of ['teams', 'build', 'version']) expect(html).toContain(`/${lang}/genshin/${path}`);
    expect(html).not.toContain('/data-client/tier-list-genshin.json'); expect(html).not.toContain('raidenshogoku');
  }
});

it('searches all translated names and IDs and normalizes all actual Title Case weapon enums', () => {
  const data = catalog(), before = structuredClone(data);
  for (const character of data) for (const query of [character.id, character.name, character.nameEn, character.nameJa].filter(Boolean)) {
    expect(filterTierCharacters(data, { query: ` ${query.toUpperCase()} `, element: character.element, weapon: character.weaponType.toLowerCase(), rarity: String(character.rarity) })).toContain(character);
  }
  expect(filterTierCharacters(data, { ...emptyTierFilters(), query: ' HU TAO ', weapon: 'POLEARM' }).map(row => row.id)).toEqual(['hu-tao']);
  expect(filterTierCharacters(data, { ...emptyTierFilters(), query: 'hu tao', rarity: '4' })).toEqual([]);
  expect(data).toEqual(before);
});

it('keeps every actual rank, roster order and exact distribution without source mutation', () => {
  const data = catalog(), before = structuredClone(data), groups = groupTierCharacters(data);
  expect(groups.map(group => group.tier)).toEqual(tierOrder);
  expect(groups.map(({ tier, count }) => [tier, count])).toEqual([['SS', 13], ['S+', 0], ['S', 27], ['A+', 0], ['A', 34], ['B', 35], ['C', 5]]);
  expect(groups.reduce((sum, group) => sum + group.count, 0)).toBe(114); expect(groups.reduce((sum, group) => sum + group.percentage, 0)).toBeCloseTo(100);
  for (const group of groups) expect(group.characters).toEqual(data.filter(character => character.tierRank === group.tier));
  expect(data).toEqual(before);
});

it('renders 162 real filter intersections in all locales with matching groups and distribution totals', () => {
  const data = catalog(); let views = 0;
  for (const element of ['all', ...new Set([...Object.keys(compareElements), ...data.map(character => character.element)])]) for (const weapon of ['all', ...Object.keys(compareWeaponTypes)]) for (const rarity of ['all', '4', '5']) {
    const filtered = filterTierCharacters(data, { query: '', element, weapon, rarity });
    const expected = genshinCharacters.filter(character => (element === 'all' || character.element === element) && (weapon === 'all' || character.weaponType.toLowerCase() === weapon) && (rarity === 'all' || String(character.rarity) === rarity));
    expect(filtered.map(row => row.id)).toEqual(expected.map(row => row.id));
    const groups = groupTierCharacters(filtered); expect(groups.reduce((sum, group) => sum + group.count, 0)).toBe(expected.length);
    for (const locale of ['zh', 'en', 'ja']) {
      const html = renderToStaticMarkup(createElement(TierResults, { characters: filtered, locale }));
      expect(html.match(/data-tier-character=/g) ?? []).toHaveLength(expected.length);
      for (const character of expected) expect(html).toContain(`/${locale}/genshin/characters/${character.id}`);
      const chart = renderToStaticMarkup(createElement(TierDistribution, { characters: filtered, locale }));
      expect(chart).not.toContain('NaN'); expect(chart).not.toContain('Infinity');
      for (const group of groups) expect(chart).toContain(`aria-valuenow="${group.count}"`);
      views++;
    }
  }
  expect(views).toBe(486); console.log(JSON.stringify({ actualTierFilterIntersections: 162, renderedViews: views, cloudWrites: false }));
});

it('renders all 114 real identities and source ranks in three locales without replacing content facts', () => {
  const data = catalog(); let views = 0, facts = 0;
  for (const character of data) for (const locale of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(createElement(TierResults, { characters: [character], locale }));
    for (const value of [tierName(character, locale), compareElements[character.element]?.[locale] ?? character.element, compareWeaponLabel(character.weaponType, locale), `${character.rarity}★`]) { expect(html).toContain(escaped(value)); facts++; }
    expect(html).toContain(`data-tier="${character.tierRank}"`); expect(html).toContain(`/${locale}/genshin/characters/${character.id}`); facts += 2; views++;
  }
  expect(views).toBe(342); expect(facts).toBe(2052);
  console.log(JSON.stringify({ actualOwnerTierViews: views, facts, characters: data.length, cloudWrites: false }));
});

it('preserves unfamiliar/missing ranks safely and draws exact zero bars for empty results', () => {
  const data = catalog(), changed = [
    { ...data[0], tierRank: '' }, { ...data[1], tierRank: 'X <script>not-code</script>', nameEn: 'Owner B <script>not-code</script>' },
    { ...data[2], tierRank: 'S+' }, { ...data[3], tierRank: 'A+' },
  ];
  const groups = groupTierCharacters(changed); expect(groups.find(row => row.tier === null).count).toBe(1); expect(groups.find(row => row.tier === 'B').count).toBe(0);
  expect(groups.reduce((sum, row) => sum + row.count, 0)).toBe(4);
  const html = renderToStaticMarkup(createElement(TierResults, { characters: changed, locale: 'en' }));
  expect(html).toContain('Unrated'); expect(html).toContain(escaped(changed[1].nameEn)); expect(html).toContain(escaped(changed[1].tierRank)); expect(html).not.toContain('<script>not-code');
  expect(html).toContain('data-tier="S+"'); expect(html).toContain('data-tier="A+"');
  const chart = renderToStaticMarkup(createElement(TierDistribution, { characters: [], locale: 'en' }));
  expect(chart.match(/width:0%/g)).toHaveLength(7); expect(chart).not.toContain('width:2%'); expect(chart).not.toContain('NaN');
  const empty = renderToStaticMarkup(createElement(TierResults, { characters: [], locale: 'en' })); expect(empty).toContain('No matching characters.');
});
