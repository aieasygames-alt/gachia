import { describe, it, expect } from 'vitest';
import { genshinCharacters, getGenshinCharacterById, getGenshinCharacterImage } from '../games/genshin/characters';
import { starrailCharacters, getStarRailCharacterById, getStarRailCharacterImage } from '../games/starrail/characters';
import { wuwaCharacters, getWuWaCharacterById, getWuWaCharacterImage } from '../games/wuwa/characters';
import { nteCharacters, getNteCharacterById, getNteCharacterImage } from '../games/nte/characters';
import { zzzCharacters, getZzzCharacterById, getZzzCharacterImage } from '../games/zzz/characters';
import { guihuanCharacters, getGuihuanCharacterById, getGuihuanCharacterImage } from '../games/guihuan/characters';

describe('Genshin Impact', () => {
  it('all characters have required fields', () => {
    genshinCharacters.forEach((c) => {
      expect(c.id, `character missing id`).toBeTruthy();
      expect(c.name, `${c.id} missing name`).toBeTruthy();
      expect(c.element, `${c.id} missing element`).toBeTruthy();
      expect(c.rarity, `${c.id} missing rarity`).toBeGreaterThanOrEqual(4);
      expect(c.weaponType, `${c.id} missing weaponType`).toBeTruthy();
    });
  });

  it('all characters are findable by id', () => {
    genshinCharacters.forEach((c) => {
      expect(getGenshinCharacterById(c.id)).toBeDefined();
    });
  });

  it('all characters have image paths', () => {
    genshinCharacters.forEach((c) => {
      expect(getGenshinCharacterImage(c)).toContain('.webp');
    });
  });

  it('no duplicate ids', () => {
    const ids = genshinCharacters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Honkai: Star Rail', () => {
  it('all characters have required fields', () => {
    starrailCharacters.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.element || c.combatType).toBeTruthy();
      expect(c.rarity).toBeGreaterThanOrEqual(4);
    });
  });

  it('all characters are findable by id', () => {
    starrailCharacters.forEach((c) => {
      expect(getStarRailCharacterById(c.id)).toBeDefined();
    });
  });

  it('all characters have image paths', () => {
    starrailCharacters.forEach((c) => {
      expect(getStarRailCharacterImage(c)).toContain('.webp');
    });
  });

  it('no duplicate ids', () => {
    const ids = starrailCharacters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Wuthering Waves', () => {
  it('all characters have required fields', () => {
    wuwaCharacters.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.element).toBeTruthy();
      expect(c.rarity).toBeGreaterThanOrEqual(4);
    });
  });

  it('all characters are findable by id', () => {
    wuwaCharacters.forEach((c) => {
      expect(getWuWaCharacterById(c.id)).toBeDefined();
    });
  });

  it('all characters have image paths', () => {
    wuwaCharacters.forEach((c) => {
      expect(getWuWaCharacterImage(c)).toContain('.webp');
    });
  });

  it('no duplicate ids', () => {
    const ids = wuwaCharacters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Infinity Nikki (NTE)', () => {
  it('all characters have required fields', () => {
    nteCharacters.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.attribute).toBeTruthy();
    });
  });

  it('all characters are findable by id', () => {
    nteCharacters.forEach((c) => {
      expect(getNteCharacterById(c.id)).toBeDefined();
    });
  });

  it('all characters have image paths', () => {
    nteCharacters.forEach((c) => {
      expect(getNteCharacterImage(c)).toContain('.webp');
    });
  });

  it('no duplicate ids', () => {
    const ids = nteCharacters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Zenless Zone Zero', () => {
  it('all characters have required fields', () => {
    zzzCharacters.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.attribute).toBeTruthy();
      expect(c.rank).toMatch(/^[SA]$/);
    });
  });

  it('all characters are findable by id', () => {
    zzzCharacters.forEach((c) => {
      expect(getZzzCharacterById(c.id)).toBeDefined();
    });
  });

  it('all characters have image paths', () => {
    zzzCharacters.forEach((c) => {
      expect(getZzzCharacterImage(c)).toContain('.webp');
    });
  });

  it('no duplicate ids', () => {
    const ids = zzzCharacters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Guihun (归环)', () => {
  it('all characters have required fields', () => {
    guihuanCharacters.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.element).toBeTruthy();
      expect(c.rarity).toBeGreaterThanOrEqual(3);
      expect(c.role).toBeTruthy();
    });
  });

  it('all characters have skills', () => {
    guihuanCharacters.forEach((c) => {
      expect(c.skills.normalAttack).toBeTruthy();
      expect(c.skills.skill).toBeTruthy();
      expect(c.skills.ultimate).toBeTruthy();
    });
  });

  it('all characters have recommended builds', () => {
    guihuanCharacters.forEach((c) => {
      expect(c.recommendedBuild.bestWeapon).toBeTruthy();
      expect(c.recommendedBuild.bestWeaponEn).toBeTruthy();
    });
  });

  it('all characters are findable by id', () => {
    guihuanCharacters.forEach((c) => {
      expect(getGuihuanCharacterById(c.id)).toBeDefined();
    });
  });

  it('all characters have image paths', () => {
    guihuanCharacters.forEach((c) => {
      expect(getGuihuanCharacterImage(c)).toContain('.webp');
    });
  });

  it('no duplicate ids', () => {
    const ids = guihuanCharacters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Cross-game', () => {
  it('no duplicate ids across all games', () => {
    const allIds = [
      ...genshinCharacters.map((c) => `genshin_${c.id}`),
      ...starrailCharacters.map((c) => `starrail_${c.id}`),
      ...wuwaCharacters.map((c) => `wuwa_${c.id}`),
      ...nteCharacters.map((c) => `nte_${c.id}`),
      ...zzzCharacters.map((c) => `zzz_${c.id}`),
      ...guihuanCharacters.map((c) => `guihuan_${c.id}`),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('image base URL is set', async () => {
    const { IMAGE_BASE } = await import('../image-base');
    expect(IMAGE_BASE).toBeTruthy();
    expect(IMAGE_BASE).toMatch(/^https?:\/\//);
  });
});
