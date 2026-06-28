import type { GameId } from '@gachia/core';
import type { MaterialCharacter } from './material-characters';
import { genshinCharacters, getGenshinCharacterImage } from './games/genshin/characters';
import { genshinWeapons } from './games/genshin/weapons';
import { starrailCharacters, getStarRailCharacterImage } from './games/starrail/characters';
import { starrailLightCones } from './games/starrail/weapons';
import { wuwaCharacters, getWuWaCharacterImage } from './games/wuwa/characters';
import { wuwaWeapons } from './games/wuwa/weapons';
import { nteCharacters, getNteCharacterImage } from './games/nte/characters';
import { nteWeapons } from './games/nte/weapons';
import { zzzCharacters, getZzzCharacterImage } from './games/zzz/characters';
import { zzzWeapons } from './games/zzz/weapons';
import { guihuanCharacters, getGuihuanCharacterImage } from './games/guihuan/characters';
import { guihuanWeapons } from './games/guihuan/weapons';
import { anantaCharacters, getAnantaCharacterImage } from './games/ananta/characters';
import { anantaWeapons } from './games/ananta/weapons';
import { endfieldCharacters, getEndfieldCharacterImage } from './games/endfield/characters';
import { endfieldWeapons } from './games/endfield/weapons';
import { seaCharacters, getSeaCharacterImage } from './games/sea/characters';
import { seaWeapons } from './games/sea/weapons';

function dedupeById(chars: MaterialCharacter[]): MaterialCharacter[] {
  const seen = new Set<string>();
  return chars.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/**
 * Find characters whose recommended build references this weapon.
 * Matches by weapon name (zh/en) against character build's bestWeapon/bestWeaponEn fields.
 * Also checks signatureCharacter on weapon data where available.
 */
export function getCharactersForWeapon(gameId: GameId, weaponId: string): MaterialCharacter[] {
  if (gameId === 'genshin') {
    const weapon = genshinWeapons.find(w => w.id === weaponId);
    if (!weapon) return [];
    const matches = genshinCharacters.filter(c => {
      const build = c.recommendedBuild;
      return build.bestWeapon === weapon.name
        || build.bestWeaponEn === weapon.nameEn
        || (build.alternativeWeapons as string[]).some(aw => aw === weapon.name);
    });
    // Also check signatureCharacter on weapon
    if (weapon.signatureCharacter) {
      const sigChar = genshinCharacters.find(c =>
        c.name === weapon.signatureCharacter || c.nameEn === weapon.signatureCharacter
      );
      if (sigChar && !matches.find(m => m.id === sigChar.id)) {
        matches.push(sigChar);
      }
    }
    return dedupeById(matches.map(c => ({ id: c.id, element: c.element, image: getGenshinCharacterImage(c) })));
  }

  if (gameId === 'starrail') {
    const weapon = starrailLightCones.find(w => w.id === weaponId);
    if (!weapon) return [];
    const matches = starrailCharacters.filter(c => {
      const build = c.recommendedBuild;
      return build.bestLightCone === weapon.name
        || build.bestLightConeEn === weapon.nameEn
        || (build.alternativeLightCones as string[]).some(aw => aw === weapon.name);
    });
    // Also check signatureCharacter on weapon (stores character ID)
    if (weapon.signatureCharacter) {
      const sigChar = starrailCharacters.find(c => c.id === weapon.signatureCharacter);
      if (sigChar && !matches.find(m => m.id === sigChar.id)) {
        matches.push(sigChar);
      }
    }
    return dedupeById(matches.map(c => ({ id: c.id, element: c.element, image: getStarRailCharacterImage(c) })));
  }

  if (gameId === 'wuwa') {
    // WuWa characters have no build weapon recommendations.
    // Use signatureCharacter on weapon (stores character ID).
    const weapon = wuwaWeapons.find(w => w.id === weaponId);
    if (!weapon || !weapon.signatureCharacter) return [];
    const c = wuwaCharacters.find(ch => ch.id === weapon.signatureCharacter);
    if (!c) return [];
    return [{ id: c.id, element: c.element, image: getWuWaCharacterImage(c) }];
  }

  if (gameId === 'nte') {
    const weapon = nteWeapons.find(w => w.id === weaponId);
    if (!weapon) return [];
    const matches = nteCharacters.filter(c => {
      const build = c.recommendedBuild;
      return build.bestWeapon === weapon.name
        || build.bestWeaponEn === weapon.nameEn;
    });
    // Also check signatureCharacter on weapon (stores character ID)
    if (weapon.signatureCharacter) {
      const sigChar = nteCharacters.find(c => c.id === weapon.signatureCharacter);
      if (sigChar && !matches.find(m => m.id === sigChar.id)) {
        matches.push(sigChar);
      }
    }
    return dedupeById(matches.map(c => ({ id: c.id, element: c.attribute, image: getNteCharacterImage(c) })));
  }

  if (gameId === 'zzz') {
    const weapon = zzzWeapons.find(w => w.id === weaponId);
    if (!weapon) return [];
    const matches = zzzCharacters.filter(c => {
      const build = c.recommendedBuild;
      return build.bestWeapon === weapon.name
        || build.bestWeaponEn === weapon.nameEn
        || (build.alternativeWeapons as string[]).some(aw => aw === weapon.name);
    });
    // Also check signatureCharacter on weapon (stores character ID)
    if (weapon.signatureCharacter) {
      const sigChar = zzzCharacters.find(c => c.id === weapon.signatureCharacter);
      if (sigChar && !matches.find(m => m.id === sigChar.id)) {
        matches.push(sigChar);
      }
    }
    return dedupeById(matches.map(c => ({ id: c.id, element: c.attribute, image: getZzzCharacterImage(c) })));
  }

  if (gameId === 'guihuan') {
    const weapon = guihuanWeapons.find(w => w.id === weaponId);
    if (!weapon) return [];
    const matches = guihuanCharacters.filter(c => {
      const build = c.recommendedBuild;
      return build.bestWeapon === weapon.name
        || build.bestWeaponEn === weapon.nameEn
        || (build.alternativeWeapons as string[]).some(aw => aw === weapon.name);
    });
    return dedupeById(matches.map(c => ({ id: c.id, element: c.element, image: getGuihuanCharacterImage(c) })));
  }

  if (gameId === 'ananta') {
    const weapon = anantaWeapons.find(w => w.id === weaponId);
    if (!weapon) return [];
    const matches = anantaCharacters.filter(c => {
      const build = c.recommendedBuild;
      return build.bestWeapon === weapon.name
        || build.bestWeaponEn === weapon.nameEn
        || (build.alternativeWeapons as string[]).some(aw => aw === weapon.name);
    });
    return dedupeById(matches.map(c => ({ id: c.id, element: c.element, image: getAnantaCharacterImage(c) })));
  }

  // CRITICAL FIX: Add missing endfield branch
  if (gameId === 'endfield') {
    const weapon = endfieldWeapons.find(w => w.id === weaponId);
    if (!weapon) return [];
    const matches = endfieldCharacters.filter(c => {
      const build = c.recommendedBuild;
      return build.bestWeapon === weapon.name
        || build.bestWeaponEn === weapon.nameEn
        || (build.alternativeWeapons as string[]).some(aw => aw === weapon.name);
    });
    return dedupeById(matches.map(c => ({ id: c.id, element: c.element, image: getEndfieldCharacterImage(c) })));
  }

  if (gameId === 'sea') {
    return []; // No weapons in Sea of Remnants
  }

  return [];
}

/**
 * Find weapons of the same type/rarity for "related weapons" section.
 */
export function getRelatedWeapons(gameId: GameId, weaponId: string): Array<{ id: string; name: string; nameEn: string; rarity: number | string; image?: string }> {
  const allWeapons = getWeaponList(gameId);
  const current = allWeapons.find(w => w.id === weaponId);
  if (!current) return [];

  return allWeapons
    .filter(w => w.id !== weaponId && w.weaponType === current.weaponType)
    .sort((a, b) => {
      const ra = typeof a.rarity === 'number' ? a.rarity : 0;
      const rb = typeof b.rarity === 'number' ? b.rarity : 0;
      return rb - ra;
    })
    .slice(0, 6);
}

interface WeaponLike {
  id: string;
  name: string;
  nameEn: string;
  rarity: number | string;
  weaponType?: string;
}

function getWeaponList(gameId: GameId): WeaponLike[] {
  switch (gameId) {
    case 'genshin': return genshinWeapons as WeaponLike[];
    case 'starrail': return starrailLightCones.map(w => ({ id: w.id, name: w.name, nameEn: w.nameEn, rarity: w.rarity, weaponType: w.path }));
    case 'wuwa': return wuwaWeapons as WeaponLike[];
    case 'nte': return nteWeapons.map(w => ({ id: w.id, name: w.name, nameEn: w.nameEn, rarity: w.rank === 'S' ? 5 : w.rank === 'A' ? 4 : 3, weaponType: w.type }));
    case 'zzz': return zzzWeapons.map(w => ({ id: w.id, name: w.name, nameEn: w.nameEn, rarity: w.rank === 'S' ? 5 : w.rank === 'A' ? 4 : 3, weaponType: w.specialty }));
    case 'guihuan': return guihuanWeapons as WeaponLike[];
    case 'ananta': return anantaWeapons as WeaponLike[];
    case 'sea': return seaWeapons as WeaponLike[];
    default: return [];
  }
}
