import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { afterEach, expect, it } from 'vitest';
import { getMaterialsForCharacter } from '@gachia/data/games/genshin/extras';
import { getGenshinCharacterTierReason } from '@gachia/data/games/genshin/characters';
import { genshinCharacters, getGenshinCharacterName, getGenshinMaterialById, getGenshinMaterialName } from '../../game-genshin/lib/data';
import CharacterDetail from '../../game-genshin/app/[lang]/genshin/characters/[id]/page';

const locales = ['zh', 'en', 'ja'];
const render = async (id, lang) => renderToStaticMarkup(await CharacterDetail({ params: Promise.resolve({ id, lang }) }));
const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);
const section = (html, id) => html.match(new RegExp(`<section id="${id}"[^>]*>([\\s\\S]*?)</section>`))?.[1] ?? '';
const saved = structuredClone(genshinCharacters[0]);
afterEach(() => { Object.assign(genshinCharacters[0], structuredClone(saved)); });

it('renders the migrated source facts for every existing character in all three locales', async () => {
  let pages = 0, facts = 0;
  for (const character of genshinCharacters) for (const locale of locales) {
    const html = await render(character.id, locale);
    const contains = (id, value) => {
      if (value === '' || value == null) return;
      expect(section(html, id), `${character.id}:${locale}:${id}:${value}`).toContain(`>${escaped(value)}<`);
      facts++;
    };
    for (const value of [character.releaseVersion, character.tierRank, getGenshinCharacterTierReason(character, locale)]) contains('character-profile', value);
    const cv = locale === 'zh' ? character.cvZh : locale === 'ja' ? character.cvJp : character.cvEn;
    if (cv) contains('character-profile', cv);
    const build = character.recommendedBuild;
    if (build) {
      for (const value of [locale === 'zh' ? build.bestWeapon : build.bestWeaponEn,
        locale === 'zh' ? build.bestArtifactSet : build.bestArtifactSetEn,
        locale === 'zh' ? build.alternativeArtifactSet : build.alternativeArtifactSetEn,
        ...(build.alternativeWeapons ?? []), ...Object.values((locale === 'zh' ? build.mainStats : build.mainStatsEn) ?? {}),
        ...((locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn) ?? [])]) if (value) contains('recommended-build', value);
    }
    for (const team of character.teamComps ?? []) {
      contains('team-compositions', locale === 'zh' ? team.name : team.nameEn);
      contains('team-compositions', locale === 'zh' ? team.description : team.descriptionEn);
      for (const id of team.members) {
        const member = genshinCharacters.find(row => row.id === id);
        contains('team-compositions', member ? getGenshinCharacterName(member, locale) : id);
      }
    }
    const materials = getMaterialsForCharacter(character.id);
    for (const row of [...(materials?.ascensionMaterials ?? []), ...(materials?.talentMaterials ?? [])]) {
      contains('character-materials', 'levelRange' in row ? row.levelRange : row.talentLevel);
      for (const item of row.materials) {
        const material = getGenshinMaterialById(item.id);
        contains('character-materials', material ? getGenshinMaterialName(material, locale) : item.id);
        contains('character-materials', item.quantity);
      }
    }
    for (const faq of character.faq ?? []) {
      contains('character-faq', locale === 'zh' ? faq.questionZh : faq.question);
      contains('character-faq', locale === 'zh' ? faq.answerZh : faq.answer);
    }
    for (const id of character.relatedCharacters ?? []) {
      const related = genshinCharacters.find(row => row.id === id);
      if (related) contains('related-characters', getGenshinCharacterName(related, locale));
    }
    pages++;
  }
  console.log(JSON.stringify({ pages, facts, characters: genshinCharacters.length, actualServerRendering: true, cloudWrites: false }));
  expect(pages).toBe(genshinCharacters.length * 3);
  expect(facts).toBeGreaterThan(pages);
});

it('follows changed owner fields without a Main copy, preserving unresolved equipment text and safe FAQ JSON-LD', async () => {
  const character = genshinCharacters[0];
  const before = await render(character.id, 'en');
  const marker = 'Owner B & "quoted" </script><script>not-code</script>';
  character.recommendedBuild.bestWeaponEn = marker;
  character.recommendedBuild.alternativeWeapons = [marker];
  character.recommendedBuild.bestArtifactSetEn = marker;
  character.recommendedBuild.alternativeArtifactSetEn = marker;
  character.recommendedBuild.mainStatsEn = { sands: marker };
  character.recommendedBuild.subStatPriorityEn = [marker];
  character.teamComps = [{ name: '中文队伍', nameEn: marker, description: '中文说明', descriptionEn: marker, members: ['unknown-owner-member'] }];
  character.faq = [{ question: marker, answer: marker, questionZh: '中文问题', answerZh: '中文回答' }];
  const html = await render(character.id, 'en');
  expect(before).not.toContain(escaped(marker));
  for (const id of ['recommended-build', 'team-compositions', 'character-faq']) expect(section(html, id)).toContain(escaped(marker));
  expect(section(html, 'team-compositions')).toContain('unknown-owner-member');
  expect(html).not.toContain('</script><script>not-code');
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const faq = schemas.find(schema => schema['@type'] === 'FAQPage');
  expect(faq.mainEntity).toContainEqual({ '@type': 'Question', name: marker, acceptedAnswer: { '@type': 'Answer', text: marker } });
});

it('omits absent optional sections and rejects an unknown character', async () => {
  const character = genshinCharacters[0];
  character.recommendedBuild = { bestWeapon: '', bestWeaponEn: '', bestArtifactSet: '', bestArtifactSetEn: '', alternativeWeapons: [], mainStats: {}, mainStatsEn: {}, subStatPriority: [], subStatPriorityEn: [] };
  character.teamComps = []; character.faq = []; character.relatedCharacters = [];
  const html = await render(character.id, 'ja');
  for (const id of ['recommended-build', 'team-compositions', 'character-faq', 'related-characters']) expect(section(html, id)).toBe('');
  await expect(render('unknown-character', 'en')).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
});
