import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { artifactSets, genshinCharacters, genshinWeapons, getGenshinCharacterImage } from '../../game-genshin/lib/data';
import { compareName, compareSkillKeys, compareWeaponLabel, compareWeaponTypes, filterCompareCharacters, projectCompareCatalog } from '../../game-genshin/lib/compare';
import { resolveBuildEquipment } from '../../game-genshin/lib/build-catalog';
import { CompareResults } from '../../game-genshin/components/compare-results';
import ComparePage from '../../game-genshin/app/[lang]/genshin/compare/page';

const catalog = () => projectCompareCatalog(genshinCharacters, genshinWeapons, artifactSets, getGenshinCharacterImage);
const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);

it('projects only comparison inputs from the existing owner source without another content copy', () => {
  const data = catalog();
  expect(data.characters).toHaveLength(114); expect(data.weapons).toHaveLength(genshinWeapons.length); expect(data.artifacts).toHaveLength(artifactSets.length);
  for (const character of data.characters) {
    expect(Object.keys(character.skills)).toEqual([...compareSkillKeys]);
    for (const key of ['constellations', 'faq', 'relatedCharacters', 'description', 'cvZh']) expect(character).not.toHaveProperty(key);
    const original = genshinCharacters.find(row => row.id === character.id);
    expect(character.recommendedBuild).toBe(original.recommendedBuild); expect(character.teamComps).toBe(original.teamComps);
  }
  expect(Object.keys(data.weapons[0]).sort()).toEqual(['id', 'name', 'nameEn', 'rarity', 'baseAtk'].sort());
  expect(Object.keys(data.artifacts[0]).sort()).toEqual(['id', 'name', 'nameEn'].sort());
});

it('wires the real page, full roster, translated controls, references and no-JS profile links', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ lang }) }));
    for (const character of genshinCharacters) expect(html).toContain(`/${lang}/genshin/characters/${character.id}`);
    expect(html.replace(/<!-- -->/g, '')).toContain('114 / 114'); expect(html).toContain('<noscript>');
    expect(html).toContain(`aria-label="${lang === 'en' ? 'Element' : '元素'}"`);
    for (const path of ['characters', 'build', 'version']) expect(html).toContain(`/${lang}/genshin/${path}`);
    expect(html).toContain('compare-selector'); expect(html).not.toContain('Character archive');
  }
});

it('renders all 114 actual characters in all three locales with skills, tier, equipment, teams and basics', () => {
  const data = catalog(); let views = 0, facts = 0;
  for (let index = 0; index < data.characters.length; index++) for (const locale of ['zh', 'en', 'ja']) {
    const character = data.characters[index], other = data.characters[(index + 1) % data.characters.length];
    const html = renderToStaticMarkup(createElement(CompareResults, { catalog: data, characters: [character, other], locale }));
    const contains = value => { if (value !== undefined && value !== '') { expect(html, `${character.id}:${locale}:${value}`).toContain(escaped(value)); facts++; } };
    for (const group of ['tier', 'skills', 'build', 'teams', 'basics']) expect(html).toContain(`data-compare-group="${group}"`);
    contains(compareName(character, locale)); contains(character.tierRank); contains(locale === 'zh' ? character.tierReasonZh : character.tierReason);
    expect(html).toContain(escaped(compareWeaponLabel(character.weaponType, locale)));
    for (const key of compareSkillKeys) {
      const skill = character.skills[key];
      contains(locale === 'zh' ? skill?.name : skill?.nameEn); contains(locale === 'zh' ? skill?.description : skill?.descriptionEn);
      if (skill && 'cooldown' in skill) contains(skill.cooldown);
      if (skill && 'cost' in skill) contains(skill.cost);
    }
    const build = character.recommendedBuild;
    const weapon = resolveBuildEquipment(data.weapons, build?.bestWeaponEn || build?.bestWeapon || '');
    if (weapon) { contains(locale === 'zh' ? weapon.name : weapon.nameEn); contains(weapon.baseAtk); expect(html).toContain(`/${locale}/genshin/weapons/${weapon.id}`); }
    else contains(locale === 'zh' ? build?.bestWeapon : build?.bestWeaponEn || build?.bestWeapon);
    const artifact = resolveBuildEquipment(data.artifacts, build?.bestArtifactSetEn || build?.bestArtifactSet || '');
    contains(artifact ? locale === 'zh' ? artifact.name : artifact.nameEn : locale === 'zh' ? build?.bestArtifactSet : build?.bestArtifactSetEn || build?.bestArtifactSet);
    for (const [slot, stat] of Object.entries((locale === 'zh' ? build?.mainStats : build?.mainStatsEn) ?? {})) { contains(slot); contains(stat); }
    for (const stat of (locale === 'zh' ? build?.subStatPriority : build?.subStatPriorityEn) ?? []) contains(stat);
    for (const team of (character.teamComps ?? []).slice(0, 3)) {
      contains(locale === 'zh' ? team.name : team.nameEn || team.name);
      for (const member of team.members) {
        const resolved = data.characters.find(row => [row.id, row.name, row.nameEn, row.nameJa].includes(member));
        contains(resolved ? compareName(resolved, locale) : member);
      }
    }
    contains(character.region); contains(character.releaseVersion); contains(locale === 'zh' ? character.acquisitionMethod : character.status);
    views++;
  }
  expect(views).toBe(342); expect(facts).toBeGreaterThan(5000);
  console.log(JSON.stringify({ actualOwnerComparisonViews: views, facts, characters: data.characters.length, cloudWrites: false }));
});

it('filters all names and IDs including Japanese, trims queries, and leaves inputs unchanged', () => {
  const data = catalog(), before = structuredClone(data);
  for (const character of data.characters) for (const query of [character.id, character.name, character.nameEn, character.nameJa].filter(Boolean)) {
    expect(filterCompareCharacters(data.characters, query, character.element)).toContain(character);
  }
  expect(filterCompareCharacters(data.characters, '  HU TAO  ', 'pyro').map(row => row.id)).toEqual(['hu-tao']);
  expect(filterCompareCharacters(data.characters, 'hu tao', 'hydro')).toEqual([]);
  expect(filterCompareCharacters(data.characters, 'does-not-exist', 'all')).toEqual([]);
  expect(filterCompareCharacters(data.characters, '', 'all')).toHaveLength(114); expect(data).toEqual(before);
  for (const [type, labels] of Object.entries(compareWeaponTypes)) for (const locale of ['zh', 'en', 'ja']) {
    expect(compareWeaponLabel(type.toUpperCase(), locale)).toBe(labels[locale]);
    expect(compareWeaponLabel(type[0].toUpperCase() + type.slice(1), locale)).toBe(labels[locale]);
  }
  expect(compareWeaponLabel('unknown-type', 'zh')).toBe('unknown-type');
});

it('follows changed owner facts and preserves unresolved equipment/member names as escaped text', () => {
  const data = structuredClone(catalog()), [character, other] = data.characters, marker = 'Owner B <script>not-code</script> & "quoted"';
  character.nameEn = marker; character.tierReason = marker;
  character.skills.elementalBurst = { nameEn: marker, descriptionEn: marker, cost: 0, cooldown: '0s' };
  character.recommendedBuild = { bestWeaponEn: marker, bestArtifactSetEn: marker, mainStatsEn: { Sands: marker }, subStatPriorityEn: [marker] };
  character.teamComps = Array.from({ length: 4 }, (_, index) => ({ nameEn: `${marker}${index}`, members: ['unknown-member'] }));
  const html = renderToStaticMarkup(createElement(CompareResults, { catalog: data, characters: [character, other], locale: 'en' }));
  expect(html).toContain(escaped(marker)); expect(html).not.toContain('<script>not-code'); expect(html).toContain('unknown-member');
  expect(html).toContain('Energy: 0'); expect(html).toContain(escaped(`${marker}2`)); expect(html).not.toContain(escaped(`${marker}3`));
  data.weapons[0].nameEn = 'Weapon owner B'; character.recommendedBuild.bestWeaponEn = data.weapons[0].id;
  data.artifacts[0].nameEn = 'Artifact owner B'; character.recommendedBuild.bestArtifactSetEn = data.artifacts[0].id;
  const next = renderToStaticMarkup(createElement(CompareResults, { catalog: data, characters: [character, other], locale: 'en' }));
  expect(next).toContain('Weapon owner B'); expect(next).toContain('Artifact owner B');
});

it('shows missing data explicitly without invented ranks, recommendations or skills', () => {
  const data = catalog(), character = { ...data.characters[0], tierRank: '', tierReason: '', skills: {}, recommendedBuild: undefined, teamComps: [] };
  const html = renderToStaticMarkup(createElement(CompareResults, { catalog: data, characters: [character, character], locale: 'en' }));
  expect(html.match(/Not available/g).length).toBeGreaterThan(10); expect(html).not.toContain('Staff of Homa'); expect(html).not.toContain('data-team=');
});
