import type { GameId, SupportedLocale } from '@gachia/core';

export interface ItemData {
  id: string;
  name: string;
  nameAlt: string;
  rarity: number;
  type: string;
  source: string;
  raw?: unknown;
}

export interface ItemListEntry {
  id: string;
  name: string;
  rarity: number;
  type: string;
  source: string;
  raw?: unknown;
}

export interface GearSetListEntry {
  id: string;
  name: string;
  effect: string;
  tierRank: string;
  mainStat: string;
  rarity: number;
  recommendedFor: string[];
}

export interface MaterialCharacter {
  id: string;
  element: string;
  image: string;
}

type MaterialEntry = {
  id: string;
  name?: string;
  nameEn?: string;
  nameJa?: string;
  rarity: number;
  type: string;
  source: string;
  sourceEn?: string;
  sourceJa?: string;
};

function sourceFor(material: MaterialEntry, locale: SupportedLocale) {
  if (locale === 'ja') return material.sourceJa ?? material.sourceEn ?? material.source;
  if (locale === 'en') return material.sourceEn ?? material.source;
  return material.source;
}

function nameAltFor(material: MaterialEntry, locale: SupportedLocale) {
  if (locale === 'zh') return material.nameEn ?? '';
  return material.name ?? '';
}

function toItemData<T extends MaterialEntry>(
  material: T,
  locale: SupportedLocale,
  getName: (material: T, locale: SupportedLocale) => string,
): ItemData {
  return {
    id: material.id,
    name: getName(material, locale),
    nameAlt: nameAltFor(material, locale),
    rarity: material.rarity,
    type: material.type,
    source: sourceFor(material, locale),
    raw: material,
  };
}

function toItemListEntry<T extends MaterialEntry>(
  material: T,
  locale: SupportedLocale,
  getName: (material: T, locale: SupportedLocale) => string,
): ItemListEntry {
  return {
    id: material.id,
    name: getName(material, locale),
    rarity: material.rarity,
    type: material.type,
    source: sourceFor(material, locale),
    raw: material,
  };
}

export async function getItemsForStaticParams(gameId: GameId): Promise<Array<{ id: string }>> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/items');
      return mod.genshinMaterials.map((m) => ({ id: m.id }));
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/items');
      return mod.starrailMaterials.map((m) => ({ id: m.id }));
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/items');
      return mod.wuwaMaterials.map((m) => ({ id: m.id }));
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/items');
      return mod.nteMaterials.map((m) => ({ id: m.id }));
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/items');
      return mod.zzzMaterials.map((m) => ({ id: m.id }));
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/items');
      return mod.guihuanMaterials.map((m) => ({ id: m.id }));
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/items');
      return mod.anantaMaterials.map((m) => ({ id: m.id }));
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/items');
      return mod.endfieldMaterials.map((m) => ({ id: m.id }));
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/items');
      return mod.seaMaterials.map((m) => ({ id: m.id }));
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/items');
      return mod.skjhMaterials.map((m) => ({ id: m.id }));
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/items');
      return mod.rocoCnMaterials.map((m) => ({ id: m.id }));
    }
    default:
      return [];
  }
}

export async function getItemData(
  gameId: GameId,
  id: string,
  locale: SupportedLocale,
): Promise<ItemData | null> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/items');
      const material = mod.getGenshinMaterialById(id);
      return material ? toItemData(material, locale, mod.getGenshinMaterialName) : null;
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/items');
      const material = mod.getStarRailMaterialById(id);
      return material ? toItemData(material, locale, mod.getStarRailMaterialName) : null;
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/items');
      const material = mod.getWuWaMaterialById(id);
      return material ? toItemData(material, locale, mod.getWuWaMaterialName) : null;
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/items');
      const material = mod.getNteMaterialById(id);
      return material ? toItemData(material, locale, mod.getNteMaterialName) : null;
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/items');
      const material = mod.getZzzMaterialById(id);
      return material ? toItemData(material, locale, mod.getZzzMaterialName) : null;
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/items');
      const material = mod.getGuihuanMaterialById(id);
      return material ? toItemData(material, locale, mod.getGuihuanMaterialName) : null;
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/items');
      const material = mod.getAnantaMaterialById(id);
      return material ? toItemData(material, locale, mod.getAnantaMaterialName) : null;
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/items');
      const material = mod.getEndfieldMaterialById(id);
      return material ? toItemData(material, locale, mod.getEndfieldMaterialName) : null;
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/items');
      const material = mod.getSeaMaterialById(id);
      return material ? toItemData(material, locale, mod.getSeaMaterialName) : null;
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/items');
      const material = mod.getSkjhMaterialById(id);
      return material ? toItemData(material, locale, mod.getSkjhMaterialName) : null;
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/items');
      const material = mod.getRocoCnMaterialById(id);
      return material ? toItemData(material, locale, mod.getRocoCnMaterialName) : null;
    }
    default:
      return null;
  }
}

export async function getItemListData(
  gameId: GameId,
  locale: SupportedLocale,
): Promise<ItemListEntry[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/items');
      return mod.genshinMaterials.map((material) => toItemListEntry(material, locale, mod.getGenshinMaterialName));
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/items');
      return mod.starrailMaterials.map((material) => toItemListEntry(material, locale, mod.getStarRailMaterialName));
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/items');
      return mod.wuwaMaterials.map((material) => toItemListEntry(material, locale, mod.getWuWaMaterialName));
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/items');
      return mod.nteMaterials.map((material) => toItemListEntry(material, locale, mod.getNteMaterialName));
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/items');
      return mod.zzzMaterials.map((material) => toItemListEntry(material, locale, mod.getZzzMaterialName));
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/items');
      return mod.guihuanMaterials.map((material) => toItemListEntry(material, locale, mod.getGuihuanMaterialName));
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/items');
      return mod.anantaMaterials.map((material) => toItemListEntry(material, locale, mod.getAnantaMaterialName));
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/items');
      return mod.endfieldMaterials.map((material) => toItemListEntry(material, locale, mod.getEndfieldMaterialName));
    }
    case 'sea': {
      const mod = await import('@gachia/data/games/sea/items');
      return mod.seaMaterials.map((material) => toItemListEntry(material, locale, mod.getSeaMaterialName));
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/items');
      return mod.skjhMaterials.map((material) => toItemListEntry(material, locale, mod.getSkjhMaterialName));
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/items');
      return mod.rocoCnMaterials.map((material) => toItemListEntry(material, locale, mod.getRocoCnMaterialName));
    }
    default:
      return [];
  }
}

export async function getEndfieldGearSetListData(locale: SupportedLocale): Promise<GearSetListEntry[]> {
  const mod = await import('@gachia/data/games/endfield/gear-sets');
  return mod.gearSets.map((set) => ({
    id: set.id,
    name: mod.getGearSetName(set, locale),
    effect: mod.getGearSetEffect(set, locale),
    tierRank: set.tierRank,
    mainStat: set.mainStat,
    rarity: set.rarity,
    recommendedFor: set.recommendedFor,
  }));
}

function dedupeById(chars: MaterialCharacter[]): MaterialCharacter[] {
  const seen = new Set<string>();
  return chars.filter((char) => {
    if (seen.has(char.id)) return false;
    seen.add(char.id);
    return true;
  });
}

export async function getCharactersNeedingMaterial(
  gameId: GameId,
  materialId: string,
): Promise<MaterialCharacter[]> {
  switch (gameId) {
    case 'genshin': {
      const [{ characterMaterials }, { genshinCharacters, getGenshinCharacterImage }] = await Promise.all([
        import('@gachia/data/games/genshin/extras'),
        import('@gachia/data/games/genshin/characters'),
      ]);
      const charIds = new Set<string>();
      for (const cm of characterMaterials) {
        if (cm.ascensionMaterials.some((a) => a.materials.some((m) => m.id === materialId))
          || cm.talentMaterials.some((t) => t.materials.some((m) => m.id === materialId))) {
          charIds.add(cm.characterId);
        }
      }
      return dedupeById([...charIds].map((id) => {
        const char = genshinCharacters.find((c) => c.id === id);
        return char ? { id: char.id, element: char.element, image: getGenshinCharacterImage(char) } : null;
      }).filter(Boolean) as MaterialCharacter[]);
    }
    case 'starrail': {
      const [{ characterMaterials }, { starrailCharacters, getStarRailCharacterImage }] = await Promise.all([
        import('@gachia/data/games/starrail/extras'),
        import('@gachia/data/games/starrail/characters'),
      ]);
      const charIds = new Set<string>();
      for (const cm of characterMaterials) {
        if (cm.ascensionMaterials.some((a) => a.materials.some((m) => m.id === materialId))
          || cm.traceMaterials.some((t) => t.materials.some((m) => m.id === materialId))) {
          charIds.add(cm.characterId);
        }
      }
      return dedupeById([...charIds].map((id) => {
        const char = starrailCharacters.find((c) => c.id === id);
        return char ? { id: char.id, element: char.element, image: getStarRailCharacterImage(char) } : null;
      }).filter(Boolean) as MaterialCharacter[]);
    }
    case 'wuwa': {
      const { wuwaCharacters, getWuWaCharacterImage } = await import('@gachia/data/games/wuwa/characters');
      return dedupeById(wuwaCharacters
        .filter((char) => {
          const asc = char.ascensionMaterials;
          const skill = char.skillMaterials;
          return asc?.commonDrop === materialId
            || asc?.boss === materialId
            || asc?.localSpecialty === materialId
            || skill?.commonDrop === materialId
            || skill?.weeklyBoss === materialId;
        })
        .map((char) => ({ id: char.id, element: char.element, image: getWuWaCharacterImage(char) })));
    }
    case 'nte': {
      const [{ characterMaterials }, { nteCharacters, getNteCharacterImage }] = await Promise.all([
        import('@gachia/data/games/nte/extras'),
        import('@gachia/data/games/nte/characters'),
      ]);
      const charIds = new Set<string>();
      for (const cm of characterMaterials) {
        if (cm.levelingMaterials.some((lv) => lv.materials.some((m) => m.id === materialId))
          || cm.skillMaterials.some((m) => m.id === materialId)) {
          charIds.add(cm.characterId);
        }
      }
      return dedupeById([...charIds].map((id) => {
        const char = nteCharacters.find((c) => c.id === id);
        return char ? { id: char.id, element: char.attribute, image: getNteCharacterImage(char) } : null;
      }).filter(Boolean) as MaterialCharacter[]);
    }
    case 'guihuan': {
      const [{ characterMaterials }, { guihuanCharacters, getGuihuanCharacterImage }] = await Promise.all([
        import('@gachia/data/games/guihuan/extras'),
        import('@gachia/data/games/guihuan/characters'),
      ]);
      const charIds = new Set<string>();
      for (const cm of characterMaterials) {
        if (cm.ascensionMaterials.some((a) => a.materials.some((m) => m.id === materialId))
          || cm.talentMaterials.some((t) => t.materials.some((m) => m.id === materialId))) {
          charIds.add(cm.characterId);
        }
      }
      return dedupeById([...charIds].map((id) => {
        const char = guihuanCharacters.find((c) => c.id === id);
        return char ? { id: char.id, element: char.element, image: getGuihuanCharacterImage(char) } : null;
      }).filter(Boolean) as MaterialCharacter[]);
    }
    case 'ananta': {
      const [{ characterMaterials }, { anantaCharacters, getAnantaCharacterImage }] = await Promise.all([
        import('@gachia/data/games/ananta/extras'),
        import('@gachia/data/games/ananta/characters'),
      ]);
      const charIds = new Set<string>();
      for (const cm of characterMaterials) {
        if (cm.ascensionMaterials.some((a) => a.materials.some((m) => m.id === materialId))
          || cm.talentMaterials.some((t) => t.materials.some((m) => m.id === materialId))) {
          charIds.add(cm.characterId);
        }
      }
      return dedupeById([...charIds].map((id) => {
        const char = anantaCharacters.find((c) => c.id === id);
        return char ? { id: char.id, element: char.element, image: getAnantaCharacterImage(char) } : null;
      }).filter(Boolean) as MaterialCharacter[]);
    }
    case 'endfield': {
      const [{ characterMaterials }, { endfieldCharacters, getEndfieldCharacterImage }] = await Promise.all([
        import('@gachia/data/games/endfield/extras'),
        import('@gachia/data/games/endfield/characters'),
      ]);
      const charIds = new Set<string>();
      for (const cm of characterMaterials) {
        if (cm.ascensionMaterials.some((a) => a.materials.some((m) => m.materialId === materialId))
          || cm.talentMaterials.some((t) => t.materials.some((m) => m.materialId === materialId))) {
          charIds.add(cm.characterId);
        }
      }
      return dedupeById([...charIds].map((id) => {
        const char = endfieldCharacters.find((c) => c.id === id);
        return char ? { id: char.id, element: char.element, image: getEndfieldCharacterImage(char) } : null;
      }).filter(Boolean) as MaterialCharacter[]);
    }
    case 'sea': {
      const [{ characterMaterials }, { seaCharacters, getSeaCharacterImage }] = await Promise.all([
        import('@gachia/data/games/sea/extras'),
        import('@gachia/data/games/sea/characters'),
      ]);
      const charIds = new Set<string>();
      for (const cm of characterMaterials) {
        if (cm.materials?.some((m: { materialId: string }) => m.materialId === materialId)) {
          charIds.add(cm.characterId);
        }
      }
      return dedupeById([...charIds].map((id) => {
        const char = seaCharacters.find((c) => c.id === id);
        return char ? { id: char.id, element: char.attribute, image: getSeaCharacterImage(char) } : null;
      }).filter(Boolean) as MaterialCharacter[]);
    }
    default:
      return [];
  }
}
