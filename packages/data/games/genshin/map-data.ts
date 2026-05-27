import type { SupportedLocale } from '@gachia/core';

// --- Map Configuration ---

export interface MapCategory {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  icon: string;
  color: string;
}

export interface MapMarker {
  id: string;
  categoryId: string;
  name: string;
  nameEn: string;
  nameJa: string;
  /** [x, y] in game coordinate space */
  position: [number, number];
  region?: string;
  description?: string;
  descriptionEn?: string;
  descriptionJa?: string;
}

export interface GameMapData {
  mapId: string;
  categories: MapCategory[];
  markers: MapMarker[];
}

export function getCategoryName(cat: MapCategory, locale: SupportedLocale): string {
  if (locale === 'zh') return cat.name;
  if (locale === 'ja') return cat.nameJa || cat.nameEn;
  return cat.nameEn;
}

export function getMarkerName(marker: MapMarker, locale: SupportedLocale): string {
  if (locale === 'zh') return marker.name;
  if (locale === 'ja') return marker.nameJa || marker.nameEn;
  return marker.nameEn;
}

export function getMarkerDescription(marker: MapMarker, locale: SupportedLocale): string | undefined {
  if (locale === 'zh') return marker.description;
  if (locale === 'ja') return marker.descriptionJa || marker.descriptionEn;
  return marker.descriptionEn;
}

// --- Genshin Map Data ---

const GENSHIN_CATEGORIES: MapCategory[] = [
  {
    id: 'teleporter',
    name: '传送锚点',
    nameEn: 'Teleport Waypoint',
    nameJa: 'ワープポイント',
    icon: '🚀',
    color: '#4fc3f7',
  },
  {
    id: 'statue',
    name: '七天神像',
    nameEn: 'Statue of The Seven',
    nameJa: '七天神像',
    icon: '⛩️',
    color: '#7e57c2',
  },
  {
    id: 'domain',
    name: '秘境',
    nameEn: 'Domain',
    nameJa: '秘境',
    icon: '🏛️',
    color: '#ff8a65',
  },
  {
    id: 'anemoculus',
    name: '风神瞳',
    nameEn: 'Anemoculus',
    nameJa: '風神の瞳',
    icon: '🌬️',
    color: '#81c784',
  },
  {
    id: 'geoculus',
    name: '岩神瞳',
    nameEn: 'Geoculus',
    nameJa: '岩神の瞳',
    icon: '🪨',
    color: '#ffb74d',
  },
  {
    id: 'electroculus',
    name: '雷神瞳',
    nameEn: 'Electroculus',
    nameJa: '雷神の瞳',
    icon: '⚡',
    color: '#ba68c8',
  },
  {
    id: 'dendroculus',
    name: '草神瞳',
    nameEn: 'Dendroculus',
    nameJa: '草神の瞳',
    icon: '🌿',
    color: '#4caf50',
  },
  {
    id: 'hydroculus',
    name: '水神瞳',
    nameEn: 'Hydroculus',
    nameJa: '水神の瞳',
    icon: '💧',
    color: '#42a5f5',
  },
  {
    id: 'pyroculus',
    name: '火神瞳',
    nameEn: 'Pyroculus',
    nameJa: '火神の瞳',
    icon: '🔥',
    color: '#ef5350',
  },
  {
    id: 'chest-common',
    name: '普通宝箱',
    nameEn: 'Common Chest',
    nameJa: '普通の宝箱',
    icon: '📦',
    color: '#9e9e9e',
  },
  {
    id: 'chest-exquisite',
    name: '精致宝箱',
    nameEn: 'Exquisite Chest',
    nameJa: '精緻な宝箱',
    icon: '✨',
    color: '#5c6bc0',
  },
  {
    id: 'chest-precious',
    name: '珍贵宝箱',
    nameEn: 'Precious Chest',
    nameJa: '珍贵な宝箱',
    icon: '💎',
    color: '#ab47bc',
  },
  {
    id: 'chest-luxurious',
    name: '华丽宝箱',
    nameEn: 'Luxurious Chest',
    nameJa: '華麗な宝箱',
    icon: '👑',
    color: '#ffd54f',
  },
  {
    id: 'boss',
    name: 'Boss',
    nameEn: 'Boss',
    nameJa: 'ボス',
    icon: '👹',
    color: '#f44336',
  },
  {
    id: 'material',
    name: '特产材料',
    nameEn: 'Local Specialty',
    nameJa: '特産素材',
    icon: '🌸',
    color: '#66bb6a',
  },
];

// Sample markers for Mondstadt region — real data will be much larger
const GENSHIN_MARKERS: MapMarker[] = [
  // --- Teleporters (Mondstadt) ---
  { id: 'tp_m_001', categoryId: 'teleporter', name: '蒙德城', nameEn: 'Mondstadt City', nameJa: 'モンド城', position: [2200, -1200], region: 'mondstadt' },
  { id: 'tp_m_002', categoryId: 'teleporter', name: '风起地', nameEn: 'Windrise', nameJa: '風立ちの地', position: [2400, -900], region: 'mondstadt' },
  { id: 'tp_m_003', categoryId: 'teleporter', name: '低语森林', nameEn: 'Whispering Woods', nameJa: '囁きの森', position: [2100, -1000], region: 'mondstadt' },
  { id: 'tp_m_004', categoryId: 'teleporter', name: '星落湖', nameEn: 'Starfell Lake', nameJa: '星落ちの湖', position: [2300, -800], region: 'mondstadt' },
  { id: 'tp_m_005', categoryId: 'teleporter', name: '千风神殿', nameEn: 'Thousand Winds Temple', nameJa: '千風神殿', position: [2600, -1100], region: 'mondstadt' },
  { id: 'tp_m_006', categoryId: 'teleporter', name: '摘星崖', nameEn: 'Starsnatch Cliff', nameJa: '星拾いの崖', position: [2700, -1000], region: 'mondstadt' },
  { id: 'tp_m_007', categoryId: 'teleporter', name: '望风山地', nameEn: 'Stormbearer Mountains', nameJa: '望風山地', position: [2800, -1100], region: 'mondstadt' },
  { id: 'tp_m_008', categoryId: 'teleporter', name: '望风角', nameEn: 'Stormbearer Point', nameJa: '望風角', position: [2900, -1200], region: 'mondstadt' },
  { id: 'tp_m_009', categoryId: 'teleporter', name: '果酒湖', nameEn: 'Cider Lake', nameJa: 'アップルサイダーの湖', position: [2000, -1100], region: 'mondstadt' },
  { id: 'tp_m_010', categoryId: 'teleporter', name: '晨曦酒庄', nameEn: 'Dawn Winery', nameJa: '朝日ワイナリー', position: [1900, -1200], region: 'mondstadt' },

  // --- Statues (Mondstadt) ---
  { id: 'st_m_001', categoryId: 'statue', name: '风神像 - 蒙德城', nameEn: 'Anemo Statue - Mondstadt', nameJa: '風神像 - モンド', position: [2200, -1250], region: 'mondstadt' },
  { id: 'st_m_002', categoryId: 'statue', name: '风神像 - 风起地', nameEn: 'Anemo Statue - Windrise', nameJa: '風神像 - 風立ちの地', position: [2450, -850], region: 'mondstadt' },
  { id: 'st_m_003', categoryId: 'statue', name: '风神像 - 星落湖', nameEn: 'Anemo Statue - Starfell Lake', nameJa: '風神像 - 星落ちの湖', position: [2350, -750], region: 'mondstadt' },
  { id: 'st_m_004', categoryId: 'statue', name: '风神像 - 摘星崖', nameEn: 'Anemo Statue - Starsnatch Cliff', nameJa: '風神像 - 星拾いの崖', position: [2750, -950], region: 'mondstadt' },
  { id: 'st_m_005', categoryId: 'statue', name: '风神像 - 晨曦酒庄', nameEn: 'Anemo Statue - Dawn Winery', nameJa: '風神像 - 朝日ワイナリー', position: [1850, -1150], region: 'mondstadt' },
  { id: 'st_m_006', categoryId: 'statue', name: '风神像 - 清泉镇', nameEn: 'Anemo Statue - Springvale', nameJa: '風神像 - 清泉町', position: [1800, -1300], region: 'mondstadt' },
  { id: 'st_m_007', categoryId: 'statue', name: '风神像 - 奔狼岭', nameEn: 'Anemo Statue - Wolvendom', nameJa: '風神像 - ウルフエンド', position: [1700, -1400], region: 'mondstadt' },

  // --- Domains (Mondstadt) ---
  { id: 'dm_m_001', categoryId: 'domain', name: '忘记之峡', nameEn: 'Forsaken Rift', nameJa: '忘れられた峡谷', position: [2050, -1350], region: 'mondstadt' },
  { id: 'dm_m_002', categoryId: 'domain', name: '仲夏庭园', nameEn: 'Midsummer Courtyard', nameJa: '仲夏の庭園', position: [2500, -950], region: 'mondstadt' },
  { id: 'dm_m_003', categoryId: 'domain', name: '铭记之谷', nameEn: 'Valley of Remembrance', nameJa: '記銘の谷', position: [2150, -850], region: 'mondstadt' },
  { id: 'dm_m_004', categoryId: 'domain', name: '孤云凌霄之处', nameEn: 'Hidden Palace of Zhou Formula', nameJa: '孤雲凌霄の処', position: [2650, -1250], region: 'mondstadt' },

  // --- Anemoculi (Mondstadt sample) ---
  { id: 'an_m_001', categoryId: 'anemoculus', name: '风神瞳 #1', nameEn: 'Anemoculus #1', nameJa: '風神の瞳 #1', position: [2250, -1050], region: 'mondstadt', description: '低语森林上方高台', descriptionEn: 'On the high platform above Whispering Woods' },
  { id: 'an_m_002', categoryId: 'anemoculus', name: '风神瞳 #2', nameEn: 'Anemoculus #2', nameJa: '風神の瞳 #2', position: [2350, -1100], region: 'mondstadt', description: '星落湖中心小岛', descriptionEn: 'Small island at the center of Starfell Lake' },
  { id: 'an_m_003', categoryId: 'anemoculus', name: '风神瞳 #3', nameEn: 'Anemoculus #3', nameJa: '風神の瞳 #3', position: [2500, -1050], region: 'mondstadt', description: '千风神殿东侧', descriptionEn: 'East side of Thousand Winds Temple' },
  { id: 'an_m_004', categoryId: 'anemoculus', name: '风神瞳 #4', nameEn: 'Anemoculus #4', nameJa: '風神の瞳 #4', position: [2650, -900], region: 'mondstadt', description: '摘星崖顶端', descriptionEn: 'Top of Starsnatch Cliff' },
  { id: 'an_m_005', categoryId: 'anemoculus', name: '风神瞳 #5', nameEn: 'Anemoculus #5', nameJa: '風神の瞳 #5', position: [1950, -1250], region: 'mondstadt', description: '晨曦酒庄屋顶', descriptionEn: 'On the roof of Dawn Winery' },
  { id: 'an_m_006', categoryId: 'anemoculus', name: '风神瞳 #6', nameEn: 'Anemoculus #6', nameJa: '風神の瞳 #6', position: [1750, -1350], region: 'mondstadt', description: '清泉镇西侧山崖', descriptionEn: 'West cliff of Springvale' },
  { id: 'an_m_007', categoryId: 'anemoculus', name: '风神瞳 #7', nameEn: 'Anemoculus #7', nameJa: '風神の瞳 #7', position: [1650, -1450], region: 'mondstadt', description: '奔狼岭深处', descriptionEn: 'Deep in Wolvendom' },
  { id: 'an_m_008', categoryId: 'anemoculus', name: '风神瞳 #8', nameEn: 'Anemoculus #8', nameJa: '風神の瞳 #8', position: [2100, -900], region: 'mondstadt', description: '低语森林北部树顶', descriptionEn: 'Treetop north of Whispering Woods' },

  // --- Bosses (Mondstadt) ---
  { id: 'bs_m_001', categoryId: 'boss', name: '无相之风', nameEn: 'Anemo Hypostasis', nameJa: '無相の風', position: [2150, -1400], region: 'mondstadt' },
  { id: 'bs_m_002', categoryId: 'boss', name: '急冻树', nameEn: 'Cryo Regisvine', nameJa: '急凍樹', position: [1950, -1350], region: 'mondstadt' },
  { id: 'bs_m_003', categoryId: 'boss', name: '纯水精灵', nameEn: 'Oceanid', nameJa: '純水精霊', position: [1900, -1450], region: 'mondstadt' },
  { id: 'bs_m_004', categoryId: 'boss', name: '风魔龙·特瓦林', nameEn: 'Stormterror', nameJa: 'ストームテラー', position: [2300, -1500], region: 'mondstadt' },

  // --- Liyue Teleporters ---
  { id: 'tp_l_001', categoryId: 'teleporter', name: '璃月港', nameEn: 'Liyue Harbor', nameJa: '璃月港', position: [1400, -2000], region: 'liyue' },
  { id: 'tp_l_002', categoryId: 'teleporter', name: '玉京台', nameEn: 'Mt. Tianheng', nameJa: '玉京台', position: [1350, -2100], region: 'liyue' },
  { id: 'tp_l_003', categoryId: 'teleporter', name: '绝云间', nameEn: 'Qingyun Peak', nameJa: '絶雲間', position: [1100, -1900], region: 'liyue' },
  { id: 'tp_l_004', categoryId: 'teleporter', name: '轻策庄', nameEn: 'Qingce Village', nameJa: '軽策荘', position: [1200, -1700], region: 'liyue' },
  { id: 'tp_l_005', categoryId: 'teleporter', name: '望舒客栈', nameEn: 'Wangshu Inn', nameJa: '望舒客栈', position: [1500, -1800], region: 'liyue' },

  // --- Liyue Statues ---
  { id: 'st_l_001', categoryId: 'statue', name: '岩神像 - 璃月港', nameEn: 'Geo Statue - Liyue Harbor', nameJa: '岩神像 - 璃月港', position: [1450, -2050], region: 'liyue' },
  { id: 'st_l_002', categoryId: 'statue', name: '岩神像 - 绝云间', nameEn: 'Geo Statue - Qingyun Peak', nameJa: '岩神像 - 絶雲間', position: [1050, -1850], region: 'liyue' },
  { id: 'st_l_003', categoryId: 'statue', name: '岩神像 - 轻策庄', nameEn: 'Geo Statue - Qingce Village', nameJa: '岩神像 - 軽策荘', position: [1150, -1650], region: 'liyue' },

  // --- Liyue Geoculi (sample) ---
  { id: 'ge_l_001', categoryId: 'geoculus', name: '岩神瞳 #1', nameEn: 'Geoculus #1', nameJa: '岩神の瞳 #1', position: [1300, -1950], region: 'liyue' },
  { id: 'ge_l_002', categoryId: 'geoculus', name: '岩神瞳 #2', nameEn: 'Geoculus #2', nameJa: '岩神の瞳 #2', position: [1150, -1800], region: 'liyue' },
  { id: 'ge_l_003', categoryId: 'geoculus', name: '岩神瞳 #3', nameEn: 'Geoculus #3', nameJa: '岩神の瞳 #3', position: [1250, -2100], region: 'liyue' },
  { id: 'ge_l_004', categoryId: 'geoculus', name: '岩神瞳 #4', nameEn: 'Geoculus #4', nameJa: '岩神の瞳 #4', position: [1050, -1950], region: 'liyue' },
  { id: 'ge_l_005', categoryId: 'geoculus', name: '岩神瞳 #5', nameEn: 'Geoculus #5', nameJa: '岩神の瞳 #5', position: [1400, -1850], region: 'liyue' },

  // --- Liyue Bosses ---
  { id: 'bs_l_001', categoryId: 'boss', name: '无相之岩', nameEn: 'Geo Hypostasis', nameJa: '無相の岩', position: [1100, -2050], region: 'liyue' },
  { id: 'bs_l_002', categoryId: 'boss', name: '古岩龙蜥', nameEn: 'Primo Geovishap', nameJa: 'エンシェントガイアヴィシャップ', position: [1000, -1950], region: 'liyue' },

  // --- Chests (sample) ---
  { id: 'ch_m_001', categoryId: 'chest-common', name: '普通宝箱 #1', nameEn: 'Common Chest #1', nameJa: '普通の宝箱 #1', position: [2220, -1180], region: 'mondstadt' },
  { id: 'ch_m_002', categoryId: 'chest-common', name: '普通宝箱 #2', nameEn: 'Common Chest #2', nameJa: '普通の宝箱 #2', position: [2380, -980], region: 'mondstadt' },
  { id: 'ch_m_003', categoryId: 'chest-exquisite', name: '精致宝箱 #1', nameEn: 'Exquisite Chest #1', nameJa: '精緻な宝箱 #1', position: [2050, -1100], region: 'mondstadt' },
  { id: 'ch_m_004', categoryId: 'chest-precious', name: '珍贵宝箱 #1', nameEn: 'Precious Chest #1', nameJa: '珍贵な宝箱 #1', position: [1700, -1500], region: 'mondstadt' },
  { id: 'ch_m_005', categoryId: 'chest-luxurious', name: '华丽宝箱 #1', nameEn: 'Luxurious Chest #1', nameJa: '華麗な宝箱 #1', position: [2300, -1450], region: 'mondstadt' },

  // --- Materials (Mondstadt specialties) ---
  { id: 'mt_m_001', categoryId: 'material', name: '蒲公英籽', nameEn: 'Dandelion Seed', nameJa: '蒲公英の種', position: [2180, -1220], region: 'mondstadt' },
  { id: 'mt_m_002', categoryId: 'material', name: '塞西莉亚花', nameEn: 'Cecilia', nameJa: 'セシリアの花', position: [2400, -1400], region: 'mondstadt' },
  { id: 'mt_m_003', categoryId: 'material', name: '小灯草', nameEn: 'Small Lamp Grass', nameJa: 'リンドウ', position: [2050, -1050], region: 'mondstadt' },
  { id: 'mt_m_004', categoryId: 'material', name: '风车菊', nameEn: 'Windwheel Aster', nameJa: '風車アスター', position: [2350, -920], region: 'mondstadt' },
  { id: 'mt_m_005', categoryId: 'material', name: '落落莓', nameEn: 'Valberry', nameJa: 'ヴァルベリー', position: [2800, -1150], region: 'mondstadt' },
  { id: 'mt_m_006', categoryId: 'material', name: '钩钩果', nameEn: 'Wolfhook', nameJa: 'ウルフフック', position: [1680, -1420], region: 'mondstadt' },
];

export const genshinMapData: GameMapData = {
  mapId: 'teyvat',
  categories: GENSHIN_CATEGORIES,
  markers: GENSHIN_MARKERS,
};

// --- Sub-map configuration ---

export interface SubMapConfig {
  hoyolabMapId: number;
  id: string;
  nameZh: string;
  nameEn: string;
  nameJa: string;
  /** Game coordinate min X (from HoYoLAB point data) */
  coordMinX: number;
  /** Game coordinate min Y */
  coordMinY: number;
  /** Game coordinate X range */
  coordRangeX: number;
  /** Game coordinate Y range */
  coordRangeY: number;
  /** HoYoLAB label IDs to show for this sub-map */
  labelIds: number[];
}

export const GENSHIN_SUB_MAPS: SubMapConfig[] = [
  {
    hoyolabMapId: 2,
    id: 'teyvat',
    nameZh: '提瓦特',
    nameEn: 'Teyvat',
    nameJa: 'テイワット',
    coordMinX: -16119,
    coordMinY: -4105,
    coordRangeX: 20346,
    coordRangeY: 13220,
    labelIds: [
      3, 2, 154, // Teleporters, Statues, Domains
      5, 6, 194, 403, 508, 626, 694, // Oculi
      17, 44, 45, 46, 269, // Chests
      132, 133, 134, 135, 136, 137, 138, 157, 181, 183, 203, 204,
      262, 263, 318, 390, 391, 432, 433, 452, 455, 457, 497, 498,
      539, 540, 553, 608, 609, 610, 629, 660, 687, // Bosses
      29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
      185, 196, 197, 198, 199, 200, 227, 228,
      384, 385, 386, 387, 400, 401, 402, 413,
      492, 500, 501, 502, 503, 519,
      611, 613, 614, 615, 616, 617, 620, 621, // Specialties
    ],
  },
  {
    hoyolabMapId: 7,
    id: 'enkanomiya',
    nameZh: '渊下宫',
    nameEn: 'Enkanomiya',
    nameJa: '淵下宮',
    coordMinX: -1439,
    coordMinY: -1245,
    coordRangeX: 2428,
    coordRangeY: 2369,
    labelIds: [
      3, // Teleport Waypoint
      17, 44, 45, 46, // Chests
      18, // Seelie
      64, // Time Trial Challenge
      320, 325, 326, 327, 328, // Key Sigils I-V
    ],
  },
  {
    hoyolabMapId: 9,
    id: 'chasm',
    nameZh: '地下矿区',
    nameEn: 'The Chasm: Underground',
    nameJa: '地下鉱区',
    coordMinX: -886,
    coordMinY: -590,
    coordRangeX: 1347,
    coordRangeY: 1149,
    labelIds: [
      3, // Teleport Waypoint
      17, 44, 45, 46, // Chests
      18, // Seelie
      64, // Time Trial Challenge
      357, // Lumenspar
      358, // Lumenlamp
    ],
  },
];
