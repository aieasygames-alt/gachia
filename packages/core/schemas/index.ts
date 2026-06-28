import { z } from 'zod';

// ============================================================
// Gachia Core Zod Schemas
// ============================================================

// --- Locale ---

export const SupportedLocaleSchema = z.enum(['zh', 'en', 'ja']);

// --- Game ---

export const GameIdSchema = z.enum(['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea']);

export const GameThemeSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surface: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const ElementSchema = z.object({
  id: z.string(),
  name: z.record(SupportedLocaleSchema, z.string()),
  color: z.string(),
  icon: z.string().optional(),
});

export const RaritySchema = z.object({
  stars: z.number().int().min(1).max(5),
  color: z.string(),
  label: z.record(SupportedLocaleSchema, z.string()),
});

export const StatConfigSchema = z.object({
  baseStats: z.array(z.string()),
  subStats: z.array(z.string()),
  specialStats: z.array(z.string()),
});

export const GameRouteConfigSchema = z.object({
  characters: z.boolean(),
  weapons: z.boolean(),
  items: z.boolean(),
  'tier-list': z.boolean(), // CRITICAL FIX: Changed from tierList to tier-list (kebab-case)
  calculator: z.boolean(),
  map: z.boolean(),
  guides: z.boolean(),
  'disk-sets': z.boolean().optional(),
  'drive-discs': z.boolean().optional(),
  'redeem-codes': z.boolean().optional(),
  gacha: z.boolean().optional(),
  anomalies: z.boolean().optional(),
  artifacts: z.boolean().optional(),
  // CRITICAL FIX: Add missing fields that exist in types but not in schema
  build: z.boolean().optional(),
  compare: z.boolean().optional(),
  teams: z.boolean().optional(),
});

export const GameModuleSchema = z.object({
  id: GameIdSchema,
  name: z.record(SupportedLocaleSchema, z.string()),
  theme: GameThemeSchema,
  elements: z.array(ElementSchema),
  rarities: z.array(RaritySchema),
  stats: StatConfigSchema,
  routes: GameRouteConfigSchema,
});

// --- Character ---

export const AscensionMaterialSchema = z.object({
  itemId: z.string(),
  quantities: z.array(z.number()),
});

export const SkillSchema = z.object({
  id: z.string().optional(),
  name: z.any().optional(),
  description: z.any().optional(),
  type: z.any().optional(),
  icon: z.string().optional(),
}).passthrough(); // Allow additional properties

export const ConstellationSchema = z.object({
  level: z.number().int().min(1).max(6),
  name: z.record(SupportedLocaleSchema, z.string()),
  description: z.record(SupportedLocaleSchema, z.string()),
});

export const CharacterImagesSchema = z.object({
  icon: z.string(),
  card: z.string(),
  gachaSplash: z.string(),
});

export const CharacterSchema = z.object({
  id: z.string(),
  gameId: GameIdSchema,
  name: z.record(SupportedLocaleSchema, z.string()),
  rarity: z.number().int().min(1).max(6), // Support Endfield's 6-star system
  element: z.string(),
  weaponType: z.string(),
  description: z.record(SupportedLocaleSchema, z.string()),
  images: CharacterImagesSchema,
  // Support both array format (most games) and object format (Endfield)
  stats: z.union([
    z.record(z.string(), z.array(z.number())),
    z.object({ hp: z.union([z.array(z.number()), z.number()]), atk: z.union([z.array(z.number()), z.number()]), str: z.union([z.array(z.number()), z.number()]) })
  ]),
  materials: z.array(AscensionMaterialSchema),
  skills: z.array(SkillSchema).optional(), // Make skills optional for characters without skill data
  constellations: z.array(ConstellationSchema).optional(),
  releaseVersion: z.string(),
});

// --- Weapon ---

export const WeaponPassiveSchema = z.object({
  name: z.record(SupportedLocaleSchema, z.string()),
  description: z.record(SupportedLocaleSchema, z.string()),
});

export const WeaponSchema = z.object({
  id: z.string(),
  gameId: GameIdSchema,
  name: z.record(SupportedLocaleSchema, z.string()),
  rarity: z.number().int().min(1).max(6), // Support Endfield's 6-star system
  weaponType: z.string(),
  description: z.record(SupportedLocaleSchema, z.string()),
  images: z.object({ icon: z.string(), awakenIcon: z.string().optional() }),
  stats: z.object({
    baseAtk: z.array(z.number()),
    subStat: z.object({ name: z.string(), values: z.array(z.number()) }).optional(),
  }),
  passive: WeaponPassiveSchema.optional(),
  ascensionMaterials: z.array(AscensionMaterialSchema),
});

// --- Item ---

export const ItemSchema = z.object({
  id: z.string(),
  gameId: GameIdSchema,
  name: z.record(SupportedLocaleSchema, z.string()),
  type: z.string(),
  rarity: z.number().int().min(1).max(6), // Support Endfield's 6-star system
  description: z.record(SupportedLocaleSchema, z.string()),
  icon: z.string(),
  sources: z.array(z.record(SupportedLocaleSchema, z.string())),
});

// --- Tier List ---

export const TierRankSchema = z.enum(['SS', 'S', 'A', 'B', 'C', 'D']);

export const TierListSchema = z.object({
  gameId: GameIdSchema,
  category: z.string(),
  locale: SupportedLocaleSchema,
  entries: z.array(z.object({
    characterId: z.string(),
    tier: TierRankSchema,
    role: z.string().optional(),
  })),
  updatedAt: z.string(),
});

// --- Guide Frontmatter ---

export const GuideFrontmatterSchema = z.object({
  title: z.string(),
  gameId: GameIdSchema,
  slug: z.string(),
  locale: SupportedLocaleSchema,
  author: z.string(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  coverImage: z.string().optional(),
  description: z.string(),
});
