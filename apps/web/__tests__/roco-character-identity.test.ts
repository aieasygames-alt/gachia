import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getCharacterListData, getCharacterMetaData, getCharactersForStaticParams, getCharacterSummariesByIds } from '@/lib/game-data/characters';
import { getRocoLegacyCharacterName, rocoLegacyCharacterEntries, ROCO_CHARACTER_IDENTITY_REVIEW } from '@gachia/data/games/roco/character-review';

it.each(['zh', 'en', 'ja'] as const)('exposes only neutral URL identity across %s character consumers', async locale => {
  const list = await getCharacterListData('roco', locale);
  const ids = rocoLegacyCharacterEntries.map(row => row.id);
  expect(await getCharactersForStaticParams('roco')).toEqual(ids.map(id => ({ id })));
  expect(list.map(row => row.id)).toEqual(ids);
  expect(await getCharacterSummariesByIds('roco', [...ids, 'missing'], locale)).toEqual(ids.map(id => ({ id, name: getRocoLegacyCharacterName(id, locale), image: '' })));
  for (const card of list) {
    expect(card).toMatchObject({ image: '', element: '', rankGroup: 'all', name: getRocoLegacyCharacterName(card.id, locale), elementLabel: ROCO_CHARACTER_IDENTITY_REVIEW[locale].unverified });
    expect(card.rarityLabel).toBeUndefined();
    const meta = await getCharacterMetaData('roco', card.id, locale);
    expect(meta).toMatchObject({ name: card.name, image: '', element: '', description: ROCO_CHARACTER_IDENTITY_REVIEW[locale].description, contentReview: { status: 'needs_verification' } });
  }
  expect(await getCharacterMetaData('roco', 'missing', locale)).toBeNull();
  const cn = await getCharacterListData('roco-cn', locale);
  expect(cn.length).toBeGreaterThan(6);
  expect(cn[0]!.image).toContain('/images/roco-cn/');
  expect(cn[0]!.element).not.toBe('');
});

it('removes homepage endorsements and dormant metadata overrides instead of relying on branch ordering', () => {
  const home = readFileSync(new URL('../app/[lang]/page.tsx', import.meta.url), 'utf8');
  const shared = readFileSync(new URL('../app/[lang]/[game]/characters/[id]/character-detail-shared.tsx', import.meta.url), 'utf8');
  for (const { id } of rocoLegacyCharacterEntries) {
    expect(home).not.toContain(`id: '${id}'`);
    expect(shared).not.toContain(`'roco/${id}'`);
  }
});
