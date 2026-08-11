import type { GameId, SupportedLocale } from '@gachia/core';

export interface WeaponListEntry {
  id: string;
  name: string;
  rankGroup: string;
  rankLabel: string;
  typeGroup: string;
  typeLabel: string;
  stats: string[];
  effectName?: string;
  effectDescription?: string;
  signatureCharacter?: string;
  source?: string;
}

function rankFromRarity(rarity: number) {
  return `${rarity}★`;
}

function rankSortValue(rank: string) {
  if (rank === 'S' || rank === 'SSR' || rank === '6★') return 6;
  if (rank === 'A' || rank === 'SR' || rank === '5★') return 5;
  if (rank === 'B' || rank === '4★') return 4;
  if (rank === '3★') return 3;
  if (rank === '2★') return 2;
  if (rank === '1★') return 1;
  return 0;
}

export function sortWeaponRanks(a: string, b: string) {
  return rankSortValue(b) - rankSortValue(a);
}

export async function getWeaponsForStaticParams(gameId: GameId): Promise<Array<{ id: string }>> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/weapons');
      return mod.genshinWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/weapons');
      return mod.starrailLightCones.map((weapon) => ({ id: weapon.id }));
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/weapons');
      return mod.wuwaWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/weapons');
      return mod.nteWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/weapons');
      return mod.zzzWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/weapons');
      return mod.guihuanWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/weapons');
      return mod.anantaWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/weapons');
      return mod.endfieldWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/weapons');
      return mod.skjhWeapons.map((weapon) => ({ id: weapon.id }));
    }
    default:
      return [];
  }
}

export async function getWeaponListData(
  gameId: GameId,
  locale: SupportedLocale,
): Promise<WeaponListEntry[]> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/weapons');
      return mod.genshinWeapons.map((weapon) => {
        const effect = mod.getGenshinWeaponEffect(weapon, locale);
        const rank = rankFromRarity(weapon.rarity);
        return {
          id: weapon.id,
          name: mod.getGenshinWeaponName(weapon, locale),
          rankGroup: rank,
          rankLabel: rank,
          typeGroup: weapon.weaponType,
          typeLabel: weapon.weaponType,
          stats: [`ATK ${weapon.baseAtk}`, `${weapon.subStatValue} ${weapon.subStat}`],
          effectDescription: effect.description,
          signatureCharacter: weapon.signatureCharacter,
        };
      });
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/weapons');
      return mod.starrailLightCones.map((weapon) => {
        const effect = mod.getStarRailLightConeEffect(weapon, locale);
        const rank = rankFromRarity(weapon.rarity);
        return {
          id: weapon.id,
          name: mod.getStarRailLightConeName(weapon, locale),
          rankGroup: rank,
          rankLabel: rank,
          typeGroup: weapon.path,
          typeLabel: weapon.path,
          stats: [`HP ${weapon.baseHp}`, `ATK ${weapon.baseAtk}`, `DEF ${weapon.baseDef}`],
          effectDescription: effect.description,
          signatureCharacter: weapon.signatureCharacter,
        };
      });
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/weapons');
      return mod.wuwaWeapons.map((weapon) => {
        const effect = mod.getWuWaWeaponEffect(weapon, locale);
        const rank = rankFromRarity(weapon.rarity);
        return {
          id: weapon.id,
          name: mod.getWuWaWeaponName(weapon, locale),
          rankGroup: rank,
          rankLabel: rank,
          typeGroup: weapon.weaponType,
          typeLabel: weapon.weaponType,
          stats: [`ATK ${weapon.baseAtk}`, weapon.subStat ? `${weapon.subStat.value} ${weapon.subStat.name}` : ''].filter(Boolean),
          effectDescription: effect.description,
          signatureCharacter: weapon.signatureCharacter,
        };
      });
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/weapons');
      return mod.nteWeapons.map((weapon) => {
        const effect = mod.getNteWeaponEffect(weapon, locale);
        return {
          id: weapon.id,
          name: mod.getNteWeaponName(weapon, locale),
          rankGroup: weapon.rank,
          rankLabel: weapon.rank,
          typeGroup: weapon.type,
          typeLabel: weapon.type,
          stats: [`ATK ${weapon.baseAtk}`, `${weapon.substatValue} ${weapon.substat}`],
          effectDescription: effect.description,
          signatureCharacter: weapon.signatureCharacter,
        };
      });
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/weapons');
      return mod.zzzWeapons.map((weapon) => {
        const effect = mod.getZzzWeaponEffect(weapon, locale);
        return {
          id: weapon.id,
          name: mod.getZzzWeaponName(weapon, locale),
          rankGroup: weapon.rank,
          rankLabel: weapon.rank,
          typeGroup: weapon.specialtyEn,
          typeLabel: weapon.specialtyEn,
          stats: [`ATK ${weapon.baseAtk}`, `${weapon.substatValue} ${weapon.substat}`],
          effectDescription: effect.description,
          signatureCharacter: weapon.signatureCharacter,
        };
      });
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/weapons');
      return mod.anantaWeapons.map((weapon) => {
        const effect = mod.getAnantaWeaponEffect(weapon, locale);
        const rank = rankFromRarity(weapon.rarity);
        return {
          id: weapon.id,
          name: mod.getAnantaWeaponName(weapon, locale),
          rankGroup: rank,
          rankLabel: rank,
          typeGroup: weapon.weaponTypeEn,
          typeLabel: weapon.weaponTypeEn,
          stats: [`ATK ${weapon.baseAtk}`, `${weapon.substatValue} ${weapon.substat}`],
          effectDescription: effect.description,
        };
      });
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/weapons');
      return mod.guihuanWeapons.map((weapon) => {
        const effect = mod.getGuihuanWeaponEffect(weapon, locale);
        const rank = rankFromRarity(weapon.rarity);
        return {
          id: weapon.id,
          name: mod.getGuihuanWeaponName(weapon, locale),
          rankGroup: rank,
          rankLabel: rank,
          typeGroup: weapon.weaponTypeEn,
          typeLabel: weapon.weaponTypeEn,
          stats: [`ATK ${weapon.baseAtk}`, `${weapon.substatValue} ${weapon.substatEn}`],
          effectDescription: effect.description,
        };
      });
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/weapons');
      return mod.endfieldWeapons.map((weapon) => {
        const effect = mod.getEndfieldWeaponEffect(weapon, locale);
        const rank = rankFromRarity(weapon.rarity);
        return {
          id: weapon.id,
          name: mod.getEndfieldWeaponName(weapon, locale),
          rankGroup: rank,
          rankLabel: rank,
          typeGroup: weapon.weaponTypeEn,
          typeLabel: weapon.weaponTypeEn,
          stats: [`ATK ${weapon.baseAtk}`, `${weapon.substatValue} ${weapon.substatEn}`],
          effectDescription: effect.description,
        };
      });
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/weapons');
      return mod.skjhWeapons.map((weapon) => {
        const effect = mod.getSkjhWeaponEffect(weapon, locale);
        return {
          id: weapon.id,
          name: mod.getSkjhWeaponName(weapon, locale),
          rankGroup: weapon.weaponType,
          rankLabel: rankFromRarity(weapon.rarity),
          typeGroup: weapon.weaponType,
          typeLabel: weapon.weaponType,
          stats: [],
          effectName: effect.name,
          effectDescription: effect.description,
          source: mod.getSkjhWeaponSource(weapon, locale),
        };
      });
    }
    default:
      return [];
  }
}

export async function getWeaponMetaData(gameId: GameId, id: string, locale: SupportedLocale) {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/weapons');
      const weapon = mod.getGenshinWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getGenshinWeaponEffect(weapon, locale);
      return { weapon, name: mod.getGenshinWeaponName(weapon, locale), effect };
    }
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/weapons');
      const weapon = mod.getStarRailLightConeById(id);
      if (!weapon) return null;
      const effect = mod.getStarRailLightConeEffect(weapon, locale);
      return { weapon, name: mod.getStarRailLightConeName(weapon, locale), effect };
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/weapons');
      const weapon = mod.getWuWaWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getWuWaWeaponEffect(weapon, locale);
      return { weapon, name: mod.getWuWaWeaponName(weapon, locale), effect };
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/weapons');
      const weapon = mod.getNteWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getNteWeaponEffect(weapon, locale);
      return { weapon, name: mod.getNteWeaponName(weapon, locale), effect };
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/weapons');
      const weapon = mod.getZzzWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getZzzWeaponEffect(weapon, locale);
      return { weapon, name: mod.getZzzWeaponName(weapon, locale), effect };
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/weapons');
      const weapon = mod.getGuihuanWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getGuihuanWeaponEffect(weapon, locale);
      return { weapon, name: mod.getGuihuanWeaponName(weapon, locale), effect };
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/weapons');
      const weapon = mod.getAnantaWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getAnantaWeaponEffect(weapon, locale);
      return { weapon, name: mod.getAnantaWeaponName(weapon, locale), effect };
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/weapons');
      const weapon = mod.getEndfieldWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getEndfieldWeaponEffect(weapon, locale);
      return { weapon, name: mod.getEndfieldWeaponName(weapon, locale), effect };
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/weapons');
      const weapon = mod.getSkjhWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getSkjhWeaponEffect(weapon, locale);
      return { weapon, name: mod.getSkjhWeaponName(weapon, locale), effect };
    }
    default:
      return null;
  }
}
