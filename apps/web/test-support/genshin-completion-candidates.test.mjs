import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { completeGenshinCandidates } from '../../../services/content-cms/src/genshin-candidate-completion';
import { characterMaterials } from '@gachia/data/games/genshin/extras';
import { genshinCharacters, genshinMaterials } from '../../game-genshin/lib/data';
import CharacterDetail from '../../game-genshin/app/[lang]/genshin/characters/[id]/page';
import ItemDetail, { generateMetadata as itemMetadata } from '../../game-genshin/app/[lang]/genshin/items/[id]/page';
import ItemList from '../../game-genshin/app/[lang]/genshin/items/page';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('../../../services/content-cms/reviews/2026-11-20-genshin-completion-r137.json.gz', import.meta.url))).toString('utf8'));
const completion = completeGenshinCandidates(fixture.parent, fixture.parentKey, fixture.sources, fixture.evidence);
const locales = ['zh', 'en', 'ja'];
const saved = { characters: [...genshinCharacters], materials: [...genshinMaterials], relations: [...characterMaterials] };
const escaped = value => renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);
const replace = (target, rows) => target.splice(0, target.length, ...rows);
beforeAll(() => {
  // Memory-only candidate injection: no Git raw data, CMS or assets are written.
  replace(genshinMaterials, JSON.parse(completion.overlays[0].text));
  replace(characterMaterials, JSON.parse(completion.overlays[1].text));
  replace(genshinCharacters, JSON.parse(completion.overlays[2].text));
});
afterAll(() => {
  replace(genshinMaterials, saved.materials); replace(genshinCharacters, saved.characters); replace(characterMaterials, saved.relations);
});

it('renders both new character definitions with every source skill, constellation and resolved material link in three locales', async () => {
  let pages = 0;
  for (const review of completion.characterReviews) for (const locale of locales) {
    const character = review.record;
    const html = renderToStaticMarkup(await CharacterDetail({ params: Promise.resolve({ id: character.id, lang: locale }) }));
    expect(html).toContain(`<h1>${escaped(locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa : character.nameEn)}</h1>`);
    expect(html).toContain(escaped(character.releaseVersion));
    for (const skill of Object.values(character.skills)) {
      expect(html).toContain(escaped(locale === 'zh' ? skill.name : skill.nameEn));
      expect(html).toContain(escaped(locale === 'zh' ? skill.description : skill.descriptionEn));
    }
    for (const constellation of character.constellations) {
      expect(html).toContain(escaped(locale === 'zh' ? constellation.name : constellation.nameEn));
      expect(html).toContain(escaped(locale === 'zh' ? constellation.description : constellation.descriptionEn));
    }
    const relation = characterMaterials.find(row => row.characterId === character.id);
    for (const stage of [...relation.ascensionMaterials, ...relation.talentMaterials]) for (const entry of stage.materials) {
      expect(genshinMaterials.some(row => row.id === entry.id)).toBe(true);
      expect(html).toContain(`href="/${locale}/genshin/items/${entry.id}"`);
    }
    expect(html).not.toContain('id="recommended-build"');
    expect(html).not.toContain('id="team-compositions"');
    pages++;
  }
  expect(pages).toBe(6);
  expect(completion.publishable).toBe(false);
  expect(completion.characterReviews.every(row => row.mediaQualified === false)).toBe(true);
  console.log(JSON.stringify({ characterCandidatePages: pages, htmlDataContractOnly: true, mediaQualified: false, rawWrites: false }));
});

it('renders all 49 specialty display ranks, names, sources, detail metadata and collection links in three locales', async () => {
  let detailPages = 0, collectionPages = 0;
  for (const locale of locales) {
    const list = renderToStaticMarkup(await ItemList({ params: Promise.resolve({ lang: locale }) }));
    for (const review of completion.rankReviews) {
      const material = genshinMaterials.find(row => row.id === review.localId);
      const html = renderToStaticMarkup(await ItemDetail({ params: Promise.resolve({ id: material.id, lang: locale }) }));
      const name = locale === 'zh' ? material.name : material.nameEn;
      expect(html).toContain(`<h1>${escaped(name)}</h1>`);
      expect(html).toContain('<strong>1★</strong>');
      expect(html).toContain(escaped(locale === 'zh' ? material.source : material.sourceEn || material.source));
      expect(list).toContain(`href="/${locale}/genshin/items/${material.id}"`);
      const metadata = await itemMetadata({ params: Promise.resolve({ id: material.id, lang: locale }) });
      expect(metadata.alternates.canonical).toContain(`/${locale}/genshin/items/${material.id}`);
      detailPages++;
    }
    collectionPages++;
  }
  expect(detailPages).toBe(147); expect(collectionPages).toBe(3);
  console.log(JSON.stringify({ specialtyDetailCandidatePages: detailPages, collectionCandidatePages: collectionPages, htmlDataContractOnly: true, rawWrites: false }));
});
