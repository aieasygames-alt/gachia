import { describe, expect, it } from 'vitest';
import {
  ElementSchema, RaritySchema, SkillSchema, CharacterSchema, ItemSchema,
  WeaponSchema, TierListSchema, GuideFrontmatterSchema,
} from '@gachia/core';

describe('core schema compatibility across the Zod upgrade', () => {
  it('allows missing translations without inventing them', () => {
    const element = { id: 'fire', name: { zh: 'Fire' }, color: '#ffffff' };
    expect(ElementSchema.parse(element)).toEqual(element);
    expect(ElementSchema.parse({ ...element, name: {} }).name).toEqual({});
    expect(ElementSchema.safeParse({ ...element, name: { fr: 'Fire' } }).success).toBe(false);
    expect(ElementSchema.safeParse({ ...element, name: { en: 123 } }).success).toBe(false);
  });
  it('strips ordinary unknown fields but preserves extensible skill payloads', () => {
    expect(RaritySchema.parse({ stars: 5, color: 'gold', label: { en: 'Rare' }, extra: true }))
      .toEqual({ stars: 5, color: 'gold', label: { en: 'Rare' } });
    expect(SkillSchema.parse({ name: { en: 'Skill' }, multiplier: [1, 2] }))
      .toEqual({ name: { en: 'Skill' }, multiplier: [1, 2] });
    expect(SkillSchema.parse({})).toEqual({});
  });
  it('retains both character stat formats and optional skills', () => {
    const character = { id: 'fixture', gameId: 'endfield', name: { en: 'Fixture' }, rarity: 6,
      element: 'fire', weaponType: 'sword', description: {},
      images: { icon: '/i', card: '/c', gachaSplash: '/g' }, materials: [], releaseVersion: '1.0' };
    for (const stats of [{ hp: [1, 2], atk: [3] }, { hp: 1, atk: 2, str: 3 }]) {
      expect(CharacterSchema.parse({ ...character, stats })).toEqual({ ...character, stats });
    }
    expect(CharacterSchema.safeParse({ ...character, stats: { hp: 'wrong' } }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...character, stats: {}, rarity: 7 }).success).toBe(false);
  });
  it('retains optional weapon fields and nested partial translations', () => {
    const weapon = { id: 'fixture', gameId: 'genshin', name: {}, rarity: 5, weaponType: 'sword',
      description: { en: 'Fixture' }, images: { icon: '/i' }, stats: { baseAtk: [1, 2] }, ascensionMaterials: [] };
    expect(WeaponSchema.parse(weapon)).toEqual(weapon);
    const item = { id: 'item', gameId: 'genshin', name: { zh: 'Item' }, type: 'material', rarity: 1,
      description: {}, icon: '/i', sources: [{ en: 'Source' }] };
    expect(ItemSchema.parse(item)).toEqual(item);
  });
  it('retains tier enums and flattened diagnostics without depending on error prose', () => {
    const tier = { gameId: 'genshin', category: 'all', locale: 'en', entries: [{ characterId: 'fixture', tier: 'SS' }], updatedAt: '2026-10-25' };
    expect(TierListSchema.parse(tier)).toEqual(tier);
    const result = TierListSchema.safeParse({ ...tier, locale: 'fr' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['locale']);
      expect(result.error.flatten().fieldErrors.locale?.length).toBeGreaterThan(0);
    }
  });
  it('does not populate absent optional frontmatter fields', () => {
    const guide = { title: 'Fixture', gameId: 'genshin', slug: 'fixture', locale: 'en', author: 'Fixture',
      publishedAt: '2026-10-25', updatedAt: '2026-10-25', tags: [], description: 'Fixture' };
    expect(GuideFrontmatterSchema.parse(guide)).toEqual(guide);
    expect(GuideFrontmatterSchema.safeParse({ ...guide, tags: [1] }).success).toBe(false);
  });
});
