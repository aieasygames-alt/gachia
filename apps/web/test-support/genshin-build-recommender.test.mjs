import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { artifactSets, genshinCharacters, genshinWeapons, getGenshinCharacterImage } from '../../game-genshin/lib/data';
import { filterBuildCharacters, genericBuildWeapons, resolveBuildEquipment } from '../../game-genshin/lib/build-catalog';
import { BuildDetails } from '../../game-genshin/components/build-details';
import BuildPage from '../../game-genshin/app/[lang]/genshin/build/page';

const catalog = () => ({ characters: genshinCharacters.map(character => ({ ...character, image: getGenshinCharacterImage(character) })), weapons: genshinWeapons, artifacts: artifactSets });
const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);

it('wires the real page to the complete owner roster and provides no-JS profile links', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(await BuildPage({ params: Promise.resolve({ lang }) }));
    for (const character of genshinCharacters) expect(html).toContain(`/${lang}/genshin/characters/${character.id}#recommended-build`);
    expect(html.replace(/<!-- -->/g, '')).toContain('114 / 114'); expect(html).toContain('<noscript>');
    if (lang === 'en') { expect(html).toContain('aria-label="Element"'); expect(html).toContain('aria-label="Rarity"'); }
    expect(html).not.toContain('Character archive');
  }
});

it('renders every available build from the actual owner data in all supported locales', () => {
  let pages = 0, facts = 0;
  const data = catalog();
  for (const character of data.characters) for (const locale of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(createElement(BuildDetails, { catalog: data, character, locale }));
    const contains = value => { if (value) { expect(html, `${character.id}:${locale}:${value}`).toContain(escaped(value)); facts++; } };
    const build = character.recommendedBuild;
    const weapon = resolveBuildEquipment(data.weapons, build?.bestWeaponEn || build?.bestWeapon || '');
    if (weapon) { contains(locale === 'zh' ? weapon.name : weapon.nameEn); contains(weapon.baseAtk); contains(locale === 'zh' ? weapon.effectDescription : weapon.effectDescriptionEn); }
    else if (build?.bestWeaponEn?.toLowerCase().includes('generic')) {
      for (const item of genericBuildWeapons(data.weapons, character.weaponType)) { contains(locale === 'zh' ? item.name : item.nameEn); contains(item.baseAtk); }
    } else contains(locale === 'zh' ? build?.bestWeapon : build?.bestWeaponEn || build?.bestWeapon);
    for (const [local, english] of [[build?.bestArtifactSet, build?.bestArtifactSetEn], [build?.alternativeArtifactSet, build?.alternativeArtifactSetEn]]) {
      const item = resolveBuildEquipment(data.artifacts, english || local || '');
      if (item) for (const value of locale === 'zh' ? [item.name, item.bonus2pc, item.bonus4pc] : [item.nameEn, item.bonus2pcEn, item.bonus4pcEn]) contains(value);
      else contains(locale === 'zh' ? local : english || local);
    }
    for (const value of Object.values((locale === 'zh' ? build?.mainStats : build?.mainStatsEn) ?? {})) contains(value);
    for (const value of (locale === 'zh' ? build?.subStatPriority : build?.subStatPriorityEn) ?? []) contains(value);
    for (const value of build?.alternativeWeapons ?? []) contains(value);
    for (const team of character.teamComps ?? []) {
      contains(locale === 'zh' ? team.name : team.nameEn || team.name);
      contains(locale === 'zh' ? team.description : team.descriptionEn || team.description);
    }
    pages++;
  }
  expect(pages).toBe(342); expect(facts).toBeGreaterThan(1000);
  console.log(JSON.stringify({ actualOwnerBuildPages: pages, facts, characters: data.characters.length, cloudWrites: false }));
});

it('filters the whole visible roster by names/ID, element and rarity without mutating it', () => {
  const characters = catalog().characters, before = structuredClone(characters);
  for (const character of characters) for (const query of [character.id, character.name, character.nameEn, character.nameJa].filter(Boolean)) {
    expect(filterBuildCharacters(characters, query, character.element, String(character.rarity))).toContain(character);
  }
  expect(filterBuildCharacters(characters, '  HU TAO  ', 'pyro', '5').map(row => row.id)).toEqual(['hu-tao']);
  expect(filterBuildCharacters(characters, 'hu tao', 'hydro', 'all')).toEqual([]);
  expect(filterBuildCharacters(characters, 'not-a-character', 'all', 'all')).toEqual([]);
  expect(filterBuildCharacters(characters, '', 'all', 'all')).toHaveLength(114);
  expect(characters).toEqual(before);
});

it('keeps generic weapon ordering and resolves existing equipment by ID or localized name', () => {
  const before = structuredClone(genshinWeapons);
  for (const type of ['sword', 'claymore', 'polearm', 'bow', 'catalyst']) {
    expect(genericBuildWeapons(genshinWeapons, type)).toEqual(genshinWeapons.filter(row => row.weaponType === type && row.rarity >= 4).sort((a, b) => b.rarity - a.rarity || b.baseAtk - a.baseAtk).slice(0, 5));
  }
  for (const item of [...genshinWeapons, ...artifactSets]) for (const name of [item.id, item.name, item.nameEn.toUpperCase()]) expect(resolveBuildEquipment([item], name)).toBe(item);
  expect(genshinWeapons).toEqual(before);
});

it('follows owner changes, escapes text and preserves unresolved equipment and team names', () => {
  const data = structuredClone(catalog()), character = data.characters[0], marker = 'Owner B <script>not-code</script> & "quoted"';
  character.recommendedBuild = { bestWeapon: marker, bestWeaponEn: marker, alternativeWeapons: [marker], bestArtifactSet: marker, bestArtifactSetEn: marker,
    alternativeArtifactSet: marker, alternativeArtifactSetEn: marker, mainStatsEn: { Sands: marker }, subStatPriorityEn: [marker] };
  character.teamComps = [{ nameEn: marker, descriptionEn: marker, members: ['unknown-member'] }];
  const html = renderToStaticMarkup(createElement(BuildDetails, { catalog: data, character, locale: 'en' }));
  expect(html).toContain(escaped(marker)); expect(html).not.toContain('<script>not-code'); expect(html).toContain('unknown-member');
  data.weapons[0].nameEn = 'Weapon owner B'; data.weapons[0].effectDescriptionEn = marker;
  character.recommendedBuild.bestWeaponEn = data.weapons[0].id;
  const next = renderToStaticMarkup(createElement(BuildDetails, { catalog: data, character, locale: 'en' }));
  expect(next).toContain('Weapon owner B'); expect(next).toContain(escaped(marker));
});

it('shows an explicit empty state for legacy empty or missing build data', () => {
  const data = catalog(), character = { ...data.characters[0], recommendedBuild: {}, teamComps: [] };
  for (const build of [{}, undefined]) {
    character.recommendedBuild = build;
    const html = renderToStaticMarkup(createElement(BuildDetails, { catalog: data, character, locale: 'en' }));
    expect(html).toContain('No build recommendation available.'); expect(html).not.toContain('Staff of Homa');
  }
});
