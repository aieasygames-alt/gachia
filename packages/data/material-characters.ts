import type { GameId } from '@gachia/core';
import { characterMaterials as genshinCharacterMaterials } from './games/genshin/extras';
import { genshinCharacters, getGenshinCharacterImage } from './games/genshin/characters';
import { characterMaterials as starrailCharacterMaterials } from './games/starrail/extras';
import { starrailCharacters, getStarRailCharacterImage } from './games/starrail/characters';
import { wuwaCharacters, getWuWaCharacterImage } from './games/wuwa/characters';
import { nteCharacters, getNteCharacterImage } from './games/nte/characters';
import { characterMaterials as nteCharacterMaterials } from './games/nte/extras';
import { characterMaterials as guihuanCharacterMaterials } from './games/guihuan/extras';
import { guihuanCharacters, getGuihuanCharacterImage } from './games/guihuan/characters';
import { characterMaterials as anantaCharacterMaterials } from './games/ananta/extras';
import { anantaCharacters, getAnantaCharacterImage } from './games/ananta/characters';
import { characterMaterials as endfieldCharacterMaterials } from './games/endfield/extras';
import { endfieldCharacters, getEndfieldCharacterImage } from './games/endfield/characters';

export interface MaterialCharacter {
  id: string;
  element: string;
  image: string;
}

function dedupeById(chars: MaterialCharacter[]): MaterialCharacter[] {
  const seen = new Set<string>();
  return chars.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export function getCharactersNeedingMaterial(gameId: GameId, materialId: string): MaterialCharacter[] {
  if (gameId === 'genshin') {
    const charIds = new Set<string>();
    for (const cm of genshinCharacterMaterials) {
      if (cm.ascensionMaterials.some(a => a.materials.some(m => m.id === materialId))
        || cm.talentMaterials.some(t => t.materials.some(m => m.id === materialId))) {
        charIds.add(cm.characterId);
      }
    }
    return dedupeById([...charIds].map(id => {
      const c = genshinCharacters.find(ch => ch.id === id);
      return c ? { id: c.id, element: c.element, image: getGenshinCharacterImage(c) } : null;
    }).filter(Boolean) as MaterialCharacter[]);
  }

  if (gameId === 'starrail') {
    const charIds = new Set<string>();
    for (const cm of starrailCharacterMaterials) {
      if (cm.ascensionMaterials.some(a => a.materials.some(m => m.id === materialId))
        || cm.traceMaterials.some(t => t.materials.some(m => m.id === materialId))) {
        charIds.add(cm.characterId);
      }
    }
    return dedupeById([...charIds].map(id => {
      const c = starrailCharacters.find(ch => ch.id === id);
      return c ? { id: c.id, element: c.element, image: getStarRailCharacterImage(c) } : null;
    }).filter(Boolean) as MaterialCharacter[]);
  }

  if (gameId === 'wuwa') {
    return dedupeById(wuwaCharacters
      .filter(c => {
        const asc = c.ascensionMaterials;
        const skill = c.skillMaterials;
        return asc?.commonDrop === materialId
          || asc?.boss === materialId
          || asc?.localSpecialty === materialId
          || skill?.commonDrop === materialId
          || skill?.weeklyBoss === materialId;
      })
      .map(c => ({ id: c.id, element: c.element, image: getWuWaCharacterImage(c) })));
  }

  if (gameId === 'nte') {
    const charIds = new Set<string>();
    for (const cm of nteCharacterMaterials) {
      if (cm.levelingMaterials.some(lv => lv.materials.some(m => m.id === materialId))
        || cm.skillMaterials.some(m => m.id === materialId)) {
        charIds.add(cm.characterId);
      }
    }
    return dedupeById([...charIds].map(id => {
      const c = nteCharacters.find(ch => ch.id === id);
      return c ? { id: c.id, element: c.attribute, image: getNteCharacterImage(c) } : null;
    }).filter(Boolean) as MaterialCharacter[]);
  }

  if (gameId === 'guihuan') {
    const charIds = new Set<string>();
    for (const cm of guihuanCharacterMaterials) {
      if (cm.ascensionMaterials.some(a => a.materials.some(m => m.id === materialId))
        || cm.talentMaterials.some(t => t.materials.some(m => m.id === materialId))) {
        charIds.add(cm.characterId);
      }
    }
    return dedupeById([...charIds].map(id => {
      const c = guihuanCharacters.find(ch => ch.id === id);
      return c ? { id: c.id, element: c.element, image: getGuihuanCharacterImage(c) } : null;
    }).filter(Boolean) as MaterialCharacter[]);
  }

  if (gameId === 'ananta') {
    const charIds = new Set<string>();
    for (const cm of anantaCharacterMaterials) {
      if (cm.ascensionMaterials.some(a => a.materials.some(m => m.id === materialId))
        || cm.talentMaterials.some(t => t.materials.some(m => m.id === materialId))) {
        charIds.add(cm.characterId);
      }
    }
    return dedupeById([...charIds].map(id => {
      const c = anantaCharacters.find(ch => ch.id === id);
      return c ? { id: c.id, element: c.element, image: getAnantaCharacterImage(c) } : null;
    }).filter(Boolean) as MaterialCharacter[]);
  }

  if (gameId === 'endfield') {
    const charIds = new Set<string>();
    for (const cm of endfieldCharacterMaterials) {
      if (cm.ascensionMaterials.some(a => a.materials.some(m => m.materialId === materialId))
        || cm.talentMaterials.some(t => t.materials.some(m => m.materialId === materialId))) {
        charIds.add(cm.characterId);
      }
    }
    return dedupeById([...charIds].map(id => {
      const c = endfieldCharacters.find(ch => ch.id === id);
      return c ? { id: c.id, element: c.element, image: getEndfieldCharacterImage(c) } : null;
    }).filter(Boolean) as MaterialCharacter[]);
  }

  return [];
}
