import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { genshinCharacters, getGenshinCharacterImage } from '../../game-genshin/lib/data';
import { emptyTeam, fillTeam, filterTeamCharacters, plannedResonances, projectTeamCharacters, recommendTeams, resolveTeamMember, setTeamSlot, teamName, teamResonances } from '../../game-genshin/lib/teams';
import { TeamRecommendations } from '../../game-genshin/components/team-recommendations';
import TeamsPage from '../../game-genshin/app/[lang]/genshin/teams/page';

const catalog = () => projectTeamCharacters(genshinCharacters, getGenshinCharacterImage);
const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);

it('projects only team inputs from the owner without duplicating skills or equipment', () => {
  const data = catalog(); expect(data).toHaveLength(114);
  for (const [index, character] of data.entries()) {
    expect(Object.keys(character).sort()).toEqual(['id', 'name', 'nameEn', 'nameJa', 'element', 'rarity', 'tierRank', 'teamComps', 'image'].sort());
    expect(character.teamComps).toBe(genshinCharacters[index].teamComps);
    expect(character.image).toBe(getGenshinCharacterImage(genshinCharacters[index]));
  }
});

it('wires translated real pages, full no-JS roster, recommendations and existing research content', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(await TeamsPage({ params: Promise.resolve({ lang }) }));
    expect(html).toContain('<noscript>'); expect(html.replace(/<!-- -->/g, '')).toContain('114 / 114');
    for (const character of genshinCharacters) expect(html).toContain(`/${lang}/genshin/characters/${character.id}`);
    for (let slot = 1; slot <= 4; slot++) expect(html).toContain(`data-slot="${slot}"`);
    expect(html).toContain('role="tablist"'); expect(html).toContain('role="tabpanel"');
    for (const path of ['characters', 'build', 'gacha', 'version']) expect(html).toContain(`/${lang}/genshin/${path}`);
    expect(html).not.toContain('/api/shared-builds'); expect(html).not.toContain('Incoming Healing Bonus');
  }
});

it('searches every owner ID and translated name with element, whitespace and empty results', () => {
  const data = catalog(), before = structuredClone(data);
  for (const character of data) for (const query of [character.id, character.name, character.nameEn, character.nameJa].filter(Boolean)) expect(filterTeamCharacters(data, query, character.element)).toContain(character);
  expect(filterTeamCharacters(data, ' HU TAO ', 'pyro').map(row => row.id)).toEqual(['hu-tao']);
  expect(filterTeamCharacters(data, 'hu tao', 'hydro')).toEqual([]);
  expect(filterTeamCharacters(data, 'does-not-exist', 'all')).toEqual([]);
  expect(filterTeamCharacters(data, '', 'all')).toHaveLength(114); expect(data).toEqual(before);
});

it('keeps four distinct slots and preserves unresolved/repeated recommendation positions', () => {
  const data = catalog(), [a, b] = data;
  const original = [a.id, b.id, '', ''];
  expect(setTeamSlot(original, 2, a.id)).toEqual(original);
  expect(setTeamSlot(original, -1, 'x')).toEqual(original); expect(setTeamSlot(original, 4, 'x')).toEqual(original);
  expect(setTeamSlot(original, 1, '')).toEqual([a.id, '', '', '']); expect(original).toEqual([a.id, b.id, '', '']);
  expect(fillTeam(data, [a.name, 'unknown', b.nameEn, a.id, data[2].id])).toEqual([a.id, '', b.id, '']);
  expect(fillTeam(data, [])).toEqual(emptyTeam());
});

it('deduplicates unordered resolved identities without mutating members, and stably ranks unique overlap', () => {
  const data = structuredClone(catalog()).slice(0, 4), [a, b, c, d] = data;
  a.tierRank = 'SS'; b.tierRank = c.tierRank = d.tierRank = 'B';
  a.teamComps = [
    { name: 'First', members: [a.name, 'unknown', c.nameEn, d.id] },
    { name: 'Best', members: [b.id, a.id, c.id, d.id] },
    { name: 'Tie', members: [a.id, a.name, 'unresolved', c.id] },
  ];
  b.teamComps = [{ name: 'Duplicate', members: [d.name, c.id, a.nameEn, b.name] }]; c.teamComps = d.teamComps = [];
  const before = structuredClone(data);
  expect(recommendTeams(data, emptyTeam()).map(row => row.name)).toEqual(['First', 'Best']);
  const selected = recommendTeams(data, [a.id, b.id, '', '']);
  expect(selected.map(row => row.name)).toEqual(['Best', 'First', 'Tie']); expect(selected.map(row => row.overlap)).toEqual([2, 1, 1]);
  expect(selected[0].members).toEqual([b.id, a.id, c.id, d.id]); expect(data).toEqual(before);
});

it('previews every double-element and four-element resonance without claiming an incomplete party is active', () => {
  const data = catalog();
  for (const element of ['pyro', 'hydro', 'cryo', 'electro', 'anemo', 'geo', 'dendro']) {
    const pair = data.filter(character => character.element === element).slice(0, 2);
    expect(plannedResonances(data, [pair[0].id, pair[1].id, '', ''])).toEqual([`${element}2`]);
    expect(teamResonances[`${element}2`]).toHaveProperty('ja');
  }
  const four = ['pyro', 'hydro', 'cryo', 'electro'].map(element => data.find(character => character.element === element).id);
  expect(plannedResonances(data, four)).toEqual(['quad']); expect(plannedResonances(data, emptyTeam())).toEqual([]);
  const pair = element => data.filter(character => character.element === element).slice(0, 2).map(character => character.id);
  expect(plannedResonances(data, [...pair('pyro'), ...pair('hydro')])).toEqual(['pyro2', 'hydro2']);
});

it('renders every actual owner recommendation in all locales preserving name, description, member order and fallback', () => {
  const data = catalog(), before = JSON.stringify(genshinCharacters); let views = 0, comps = 0, facts = 0;
  for (const source of data) for (const locale of ['zh', 'en', 'ja']) {
    const rows = recommendTeams(data, [source.id, '', '', '']);
    const html = renderToStaticMarkup(createElement(TeamRecommendations, { characters: data, recommendations: rows, locale, onUse: () => {} }));
    for (const row of rows) {
      for (const value of [locale === 'zh' ? row.name : row.nameEn || row.name, locale === 'zh' ? row.description : row.descriptionEn || row.description]) if (value) { expect(html).toContain(escaped(value)); facts++; }
      for (const member of row.members) {
        const resolved = resolveTeamMember(data, member); expect(html).toContain(escaped(resolved ? teamName(resolved, locale) : member)); facts++;
      }
      comps++;
    }
    views++;
  }
  expect(views).toBe(342); expect(comps).toBeGreaterThan(300); expect(JSON.stringify(genshinCharacters)).toBe(before);
  console.log(JSON.stringify({ actualOwnerTeamViews: views, recommendations: comps, facts, characters: data.length, cloudWrites: false }));
});

it('follows changed owner facts and escapes missing/unresolved content instead of inventing teams', () => {
  const data = structuredClone(catalog()), marker = '<script>not-code</script> & "owner B"';
  data[0].teamComps = [{ nameEn: marker, descriptionEn: marker, members: [marker, data[0].id] }]; data[0].nameEn = marker;
  const html = renderToStaticMarkup(createElement(TeamRecommendations, { characters: data, recommendations: recommendTeams(data, [data[0].id, '', '', '']), locale: 'en', onUse: () => {} }));
  expect(html).toContain(escaped(marker)); expect(html).not.toContain('<script>not-code'); expect(html).toContain('slots resolved');
  data[0].teamComps = [];
  const empty = renderToStaticMarkup(createElement(TeamRecommendations, { characters: data, recommendations: recommendTeams(data, [data[0].id, '', '', '']), locale: 'en' }));
  expect(empty).toContain('No matching team references.'); expect(empty).not.toContain('data-team-key');
});
