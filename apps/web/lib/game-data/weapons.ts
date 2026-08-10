import type { GameId, SupportedLocale } from '@gachia/core';

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
