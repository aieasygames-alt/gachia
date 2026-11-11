import { z } from 'zod';

const text = z.string().trim().min(1).max(4000);
const localized = z.object({ zh: text, en: text, ja: text }).strict();
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().startsWith(value);
});

export const genshinPlatformSchema = z.object({
  schemaVersion: z.literal(1),
  owner: z.literal('genshin'),
  version: z.string().regex(/^[a-f0-9]{64}$/),
  data: z.object({
    characters: z.array(z.object({
      id, name: localized, imageUrl: z.url().refine(value => {
        if (!URL.canParse(value)) return false;
        const url = new URL(value);
        return url.origin === 'https://img.gachia.com' && url.pathname.startsWith('/images/')
          && !url.username && !url.password && !url.search && !url.hash;
      }),
      imageAlt: text, element: text, rarity: z.number().int().min(1).max(5),
    }).strict()).max(2000),
    guides: z.array(z.object({ id, title: localized, summary: localized, updatedAt: date.optional() }).strict()).max(1000),
    codes: z.array(z.object({ code: text, status: text, expiresAt: date, revealedAt: date }).strict()).max(5000),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  for (const [key, ids] of [
    ['characters', value.data.characters.map(row => row.id)],
    ['guides', value.data.guides.map(row => row.id)],
    ['codes', value.data.codes.map(row => row.code)],
  ] as const) {
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: `Duplicate ${key}`, path: ['data', key] });
  }
});

export type GenshinPlatformContent = z.infer<typeof genshinPlatformSchema>;
