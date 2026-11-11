import type { GameId, SupportedLocale } from '@gachia/core';
import { hi3WeaponFieldLabels } from '../hi3-weapon-field-labels';

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
    case 'hi3': {
      const mod = await import('@gachia/data/games/hi3/weapons');
      return mod.hi3Weapons.map((weapon) => ({ id: weapon.id }));
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
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/weapons');
      return mod.rocoCnWeapons.map((weapon) => ({ id: weapon.id }));
    }
    case 'roco': {
      const mod = await import('@gachia/data/games/roco/weapons');
      return mod.rocoLegacyWeaponIds.map((id) => ({ id }));
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
    case 'hi3': {
      const mod = await import('@gachia/data/games/hi3/weapons');
      return mod.hi3Weapons.map((weapon) => {
        const effect = mod.getHi3WeaponEffect(weapon, locale);
        const labels = hi3WeaponFieldLabels(weapon.id, weapon.rank, weapon.weaponTypeEn, locale);
        return {
          id: weapon.id,
          name: mod.getHi3WeaponName(weapon, locale),
          rankGroup: weapon.rank,
          rankLabel: labels.rank,
          typeGroup: weapon.weaponTypeEn,
          typeLabel: labels.type,
          stats: [weapon.releaseVersion ? `v${weapon.releaseVersion}` : ''].filter(Boolean),
          effectName: effect.name,
          effectDescription: effect.description,
          source: mod.getHi3WeaponSource(weapon, locale),
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
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/weapons');
      return mod.rocoCnWeapons.map((weapon) => {
        const effect = mod.getRocoCnWeaponEffect(weapon, locale);
        const rank = rankFromRarity(weapon.rarity);
        return {
          id: weapon.id,
          name: mod.getRocoCnWeaponName(weapon, locale),
          rankGroup: rank,
          rankLabel: rank,
          typeGroup: weapon.weaponType,
          typeLabel: weapon.weaponType,
          stats: [],
          effectName: effect.name,
          effectDescription: effect.description,
          source: mod.getRocoCnWeaponSource(weapon, locale),
        };
      });
    }
    case 'roco':
      return [];
    default:
      return [];
  }
}

export async function getWeaponMetaData(gameId: GameId, id: string, locale: SupportedLocale) {
  switch (gameId) {
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
    case 'hi3': {
      const mod = await import('@gachia/data/games/hi3/weapons');
      const weapon = mod.getHi3WeaponById(id);
      if (!weapon) return null;
      const effect = mod.getHi3WeaponEffect(weapon, locale);
      return { weapon, name: mod.getHi3WeaponName(weapon, locale), effect };
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
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/weapons');
      const weapon = mod.getRocoCnWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getRocoCnWeaponEffect(weapon, locale);
      return { weapon, name: mod.getRocoCnWeaponName(weapon, locale), effect };
    }
    case 'roco':
      return null;
    default:
      return null;
  }
}

export interface WeaponInfoCard {
  label: string;
  value: string;
}

const ROCO_WEAPON_TYPE_LABELS: Record<string, Record<SupportedLocale, string>> = {
  staff: { zh: '法杖', en: 'Staff', ja: '杖' },
};

export interface WeaponDetailData {
  gameId: Exclude<GameId, 'sea'>;
  id: string;
  name: string;
  nameAlt: string;
  rarity: number;
  rank?: string;
  infoCards: WeaponInfoCard[];
  effectTitle: string;
  effectName?: string;
  effectDescription?: string;
  source?: string;
  statsLine?: string;
  titleStat?: string;
  hasPassive: boolean;
  showMissingEffect?: boolean;
}

const GENSHIN_WEAPON_TYPE: Record<string, Record<SupportedLocale, string>> = {
  Sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  Claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  Polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  Bow: { zh: '弓', en: 'Bow', ja: '弓' },
  Catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

const STARRAIL_PATH: Record<string, Record<SupportedLocale, string>> = {
  destruction: { zh: '毁灭', en: 'Destruction', ja: '壊滅' },
  hunt: { zh: '巡猎', en: 'Hunt', ja: '巡狩' },
  erudition: { zh: '智识', en: 'Erudition', ja: '知恵' },
  harmony: { zh: '同谐', en: 'Harmony', ja: '調和' },
  nihility: { zh: '虚无', en: 'Nihility', ja: '虚無' },
  preservation: { zh: '存护', en: 'Preservation', ja: '存護' },
  abundance: { zh: '丰饶', en: 'Abundance', ja: '豊穣' },
  remembrance: { zh: '记忆', en: 'Remembrance', ja: '記憶' },
  elation: { zh: '欢愉', en: 'Elation', ja: '愉悦' },
};

const WUWA_WEAPON_TYPE: Record<string, Record<SupportedLocale, string>> = {
  Broadblade: { zh: '宽刃', en: 'Broadblade', ja: '広刃刀' },
  Sword: { zh: '长刃', en: 'Sword', ja: '長刃' },
  Pistols: { zh: '佩枪', en: 'Pistols', ja: '拳銃' },
  Gauntlets: { zh: '臂铠', en: 'Gauntlets', ja: '臂鎧' },
  Rectifier: { zh: '音感仪', en: 'Rectifier', ja: '音感儀' },
};

const NTE_WEAPON_TYPE: Record<string, Record<SupportedLocale, string>> = {
  solid: { zh: '固体', en: 'Solid', ja: 'ソリッド' },
  gas: { zh: '气体', en: 'Gas', ja: 'ガス' },
  liquid: { zh: '液体', en: 'Liquid', ja: 'リキッド' },
  synthesis: { zh: '合成', en: 'Synthesis', ja: '合成' },
};

const SKJH_WEAPON_TYPE: Record<string, Record<SupportedLocale, string>> = {
  tool: { zh: '采集工具', en: 'Tool', ja: '採集道具' },
  melee: { zh: '近战武器', en: 'Melee', ja: '近接武器' },
  ranged: { zh: '远程武器', en: 'Ranged', ja: '遠距離武器' },
  skin: { zh: '外观奖励', en: 'Cosmetic', ja: '外観報酬' },
};

function statLabel(locale: SupportedLocale, zh: string, ja: string, en: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? ja : en;
}

function localizedWeaponType(locale: SupportedLocale, zh: string | undefined, en: string | undefined) {
  return locale === 'zh' ? zh ?? en ?? '' : en ?? zh ?? '';
}

function getWeaponEffectTitle(gameId: GameId, locale: SupportedLocale) {
  if (gameId === 'starrail') return statLabel(locale, '光锥技能', '光円錐スキル', 'Light Cone Skill');
  if (gameId === 'nte') return statLabel(locale, '技能效果', 'スキル効果', 'Skill Effect');
  if (gameId === 'zzz') return statLabel(locale, '音擎效果', 'Wエンジン効果', 'W-Engine Effect');
  if (gameId === 'skjh') return statLabel(locale, '用途说明', '用途', 'Use Case');
  return statLabel(locale, '武器技能', '武器スキル', 'Weapon Skill');
}

function substatText(locale: SupportedLocale, label: string | undefined, value: string | undefined) {
  if (!label) return '';
  return value ? (locale === 'zh' ? `${label}${value}` : `${label} ${value}`) : label;
}

function rarityStatsLine(locale: SupportedLocale, rarity: number, baseAtk: number, sub: string) {
  return locale === 'zh'
    ? `${rarity}★, 基础攻击力${baseAtk}${sub ? `, ${sub}` : ''}`
    : `★${rarity}, Base ATK ${baseAtk}${sub ? `, ${sub}` : ''}`;
}

export async function getWeaponDetailData(
  gameId: GameId,
  id: string,
  locale: SupportedLocale,
): Promise<WeaponDetailData | null> {
  switch (gameId) {
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/weapons');
      const weapon = mod.getStarRailLightConeById(id);
      if (!weapon) return null;
      const effect = mod.getStarRailLightConeEffect(weapon, locale);
      const source = mod.getStarRailLightConeSource(weapon, locale);
      const name = mod.getStarRailLightConeName(weapon, locale);
      const statsLine = locale === 'zh'
        ? `${weapon.rarity}★, 生命${weapon.baseHp} 攻击${weapon.baseAtk} 防御${weapon.baseDef}`
        : `★${weapon.rarity}, HP ${weapon.baseHp} / ATK ${weapon.baseAtk} / DEF ${weapon.baseDef}`;
      return {
        gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rarity,
        infoCards: [
          { label: statLabel(locale, '命途', '運命', 'Path'), value: STARRAIL_PATH[weapon.path]?.[locale] ?? weapon.path },
          { label: 'Base HP', value: String(weapon.baseHp) },
          { label: 'Base ATK', value: String(weapon.baseAtk) },
          { label: 'Base DEF', value: String(weapon.baseDef) },
        ],
        effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine, hasPassive: true,
      };
    }
    case 'hi3': {
      const mod = await import('@gachia/data/games/hi3/weapons');
      const weapon = mod.getHi3WeaponById(id);
      if (!weapon) return null;
      const effect = mod.getHi3WeaponEffect(weapon, locale);
      const source = mod.getHi3WeaponSource(weapon, locale);
      const name = mod.getHi3WeaponName(weapon, locale);
      const labels = hi3WeaponFieldLabels(weapon.id, weapon.rank, weapon.weaponTypeEn, locale);
      return {
        gameId,
        id: weapon.id,
        name,
        nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name,
        rarity: labels.rarity,
        rank: labels.rank,
        infoCards: [
          { label: statLabel(locale, '武器类型', '武器タイプ', 'Weapon Type'), value: labels.type },
          { label: statLabel(locale, '版本', 'バージョン', 'Version'), value: `v${weapon.releaseVersion}` },
        ],
        effectTitle: locale === 'zh' ? '版本公告摘要' : locale === 'ja' ? 'バージョン告知概要' : 'Version notice summary',
        effectName: name,
        effectDescription: effect.description,
        source,
        statsLine: `v${weapon.releaseVersion}`,
        hasPassive: true,
      };
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/weapons');
      const weapon = mod.getWuWaWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getWuWaWeaponEffect(weapon, locale);
      const source = mod.getWuWaWeaponSource(weapon, locale);
      const name = mod.getWuWaWeaponName(weapon, locale);
      const sub = weapon.subStat ? substatText(locale, weapon.subStat.name, weapon.subStat.value) : '';
      const infoCards = [
        { label: statLabel(locale, '武器类型', '武器タイプ', 'Weapon Type'), value: WUWA_WEAPON_TYPE[weapon.weaponType]?.[locale] ?? weapon.weaponType },
        { label: 'Base ATK', value: String(weapon.baseAtk) },
      ];
      if (sub) infoCards.push({ label: 'Sub Stat', value: sub });
      return { gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rarity, infoCards, effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine: rarityStatsLine(locale, weapon.rarity, weapon.baseAtk, sub), hasPassive: !!effect.name, showMissingEffect: !effect.name };
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/weapons');
      const weapon = mod.getNteWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getNteWeaponEffect(weapon, locale);
      const source = mod.getNteWeaponSource(weapon, locale);
      const name = mod.getNteWeaponName(weapon, locale);
      const sub = substatText(locale, weapon.substat, weapon.substatValue);
      const statsLine = locale === 'zh'
        ? `${weapon.rank}级, 基础攻击力${weapon.baseAtk}${sub ? `, ${sub}` : ''}`
        : `${weapon.rank}-Rank, Base ATK ${weapon.baseAtk}${sub ? `, ${sub}` : ''}`;
      const infoCards = [
        { label: statLabel(locale, '武器类型', '武器タイプ', 'Weapon Type'), value: NTE_WEAPON_TYPE[weapon.type]?.[locale] ?? weapon.type },
        { label: 'Base ATK', value: String(weapon.baseAtk) },
      ];
      if (sub) infoCards.push({ label: 'Sub Stat', value: sub });
      return { gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn ?? '' : weapon.name ?? '', rarity: 0, rank: weapon.rank, infoCards, effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine, hasPassive: true };
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/weapons');
      const weapon = mod.getZzzWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getZzzWeaponEffect(weapon, locale);
      const source = mod.getZzzWeaponSource(weapon, locale);
      const name = mod.getZzzWeaponName(weapon, locale);
      const sub = substatText(locale, locale === 'zh' ? weapon.substat : weapon.substatEn ?? weapon.substat, weapon.substatValue);
      const statsLine = locale === 'zh'
        ? `${weapon.rank}级, 基础攻击力${weapon.baseAtk}${sub ? `, ${sub}` : ''}`
        : `${weapon.rank}-Rank, Base ATK ${weapon.baseAtk}${sub ? `, ${sub}` : ''}`;
      return {
        gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rank === 'S' ? 5 : weapon.rank === 'A' ? 4 : 3, rank: weapon.rank,
        infoCards: [
          { label: statLabel(locale, '类型', 'タイプ', 'Specialty'), value: localizedWeaponType(locale, weapon.specialty, weapon.specialtyEn) },
          { label: 'Base ATK', value: String(weapon.baseAtk) },
        ],
        effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine, hasPassive: true,
      };
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/weapons');
      const weapon = mod.getGuihuanWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getGuihuanWeaponEffect(weapon, locale);
      const source = mod.getGuihuanWeaponSource(weapon, locale);
      const name = mod.getGuihuanWeaponName(weapon, locale);
      const sub = substatText(locale, locale === 'zh' ? weapon.substat : weapon.substatEn ?? weapon.substat, weapon.substatValue);
      const infoCards = [
        { label: statLabel(locale, '武器类型', '武器タイプ', 'Weapon Type'), value: localizedWeaponType(locale, weapon.weaponType, weapon.weaponTypeEn) },
        { label: 'Base ATK', value: String(weapon.baseAtk) },
      ];
      if (sub) infoCards.push({ label: 'Sub Stat', value: sub });
      return { gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rarity, infoCards, effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine: rarityStatsLine(locale, weapon.rarity, weapon.baseAtk, sub), hasPassive: true };
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/weapons');
      const weapon = mod.getAnantaWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getAnantaWeaponEffect(weapon, locale);
      const source = mod.getAnantaWeaponSource(weapon, locale);
      const name = mod.getAnantaWeaponName(weapon, locale);
      const sub = substatText(locale, locale === 'zh' ? weapon.substat : weapon.substatEn ?? weapon.substat, weapon.substatValue);
      const infoCards = [
        { label: statLabel(locale, '武器类型', '武器タイプ', 'Weapon Type'), value: localizedWeaponType(locale, weapon.weaponType, weapon.weaponTypeEn) },
        { label: 'Base ATK', value: String(weapon.baseAtk) },
      ];
      if (sub) infoCards.push({ label: 'Sub Stat', value: sub });
      return { gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rarity, infoCards, effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine: rarityStatsLine(locale, weapon.rarity, weapon.baseAtk, sub), hasPassive: true };
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/weapons');
      const weapon = mod.getEndfieldWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getEndfieldWeaponEffect(weapon, locale);
      const source = mod.getEndfieldWeaponSource(weapon, locale);
      const name = mod.getEndfieldWeaponName(weapon, locale);
      const sub = substatText(locale, locale === 'zh' ? weapon.substat : weapon.substatEn ?? weapon.substat, weapon.substatValue);
      const infoCards = [
        { label: statLabel(locale, '武器类型', '武器タイプ', 'Weapon Type'), value: localizedWeaponType(locale, weapon.weaponType, weapon.weaponTypeEn) },
        { label: 'Base ATK', value: String(weapon.baseAtk) },
      ];
      if (sub) infoCards.push({ label: 'Sub Stat', value: sub });
      return { gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rarity, infoCards, effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine: rarityStatsLine(locale, weapon.rarity, weapon.baseAtk, sub), hasPassive: true };
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/weapons');
      const weapon = mod.getSkjhWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getSkjhWeaponEffect(weapon, locale);
      const source = mod.getSkjhWeaponSource(weapon, locale);
      const name = mod.getSkjhWeaponName(weapon, locale);
      const type = SKJH_WEAPON_TYPE[weapon.weaponType]?.[locale] ?? weapon.weaponType;
      const statsLine = locale === 'zh' ? `${weapon.rarity}★, ${type}` : `★${weapon.rarity}, ${type}`;
      return {
        gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rarity, titleStat: type,
        infoCards: [
          { label: statLabel(locale, '类型', 'タイプ', 'Type'), value: type },
          { label: statLabel(locale, '定位', '役割', 'Role'), value: effect.name },
          { label: statLabel(locale, '稀有度', 'レア度', 'Rarity'), value: `${weapon.rarity}★` },
        ],
        effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine, hasPassive: true,
      };
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/weapons');
      const weapon = mod.getRocoCnWeaponById(id);
      if (!weapon) return null;
      const effect = mod.getRocoCnWeaponEffect(weapon, locale);
      const source = mod.getRocoCnWeaponSource(weapon, locale);
      const name = mod.getRocoCnWeaponName(weapon, locale);
      const type = ROCO_WEAPON_TYPE_LABELS[weapon.weaponType]?.[locale] ?? weapon.weaponType;
      const statsLine = locale === 'zh' ? `${weapon.rarity}★, ${type}` : `★${weapon.rarity}, ${type}`;
      return {
        gameId, id: weapon.id, name, nameAlt: locale === 'zh' ? weapon.nameEn : weapon.name, rarity: weapon.rarity, titleStat: type,
        infoCards: [
          { label: statLabel(locale, '类型', 'タイプ', 'Type'), value: type },
          { label: statLabel(locale, '定位', '役割', 'Role'), value: effect.name },
          { label: statLabel(locale, '稀有度', 'レア度', 'Rarity'), value: `${weapon.rarity}★` },
        ],
        effectTitle: getWeaponEffectTitle(gameId, locale), effectName: effect.name, effectDescription: effect.description, source, statsLine, hasPassive: true,
      };
    }
    case 'roco':
      return null;
    default:
      return null;
  }
}
