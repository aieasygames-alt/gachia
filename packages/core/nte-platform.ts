import { z } from 'zod';

const text = z.string().min(1).max(4000);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const localized = z.object({ zh: text, en: text, ja: text }).strict();
export const ntePlatformSchema = z.object({
  schemaVersion: z.literal(1), owner: z.literal('nte'), version: z.string().regex(/^[a-f0-9]{64}$/),
  data: z.object({
    characters: z.array(z.object({ id, name: localized, attribute: text, rank: text,
      imageUrl: z.url().refine(value => {
        const url = new URL(value);
        return url.origin === 'https://img.gachia.com' && /^\/images\/characters\/[a-z0-9-]+\.webp$/.test(url.pathname)
          && !url.username && !url.password && !url.search && !url.hash;
      }).nullable(), imageAlt: text,
    }).strict()).max(2000),
    guides: z.array(z.object({ id, title: localized, summary: localized, updatedAt: z.string().optional() }).strict()).max(1000),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  for (const key of ['characters', 'guides'] as const) if (new Set(value.data[key].map(row => row.id)).size !== value.data[key].length)
    ctx.addIssue({ code: 'custom', message: `Duplicate ${key}`, path: ['data', key] });
});
export type NtePlatformContent = z.infer<typeof ntePlatformSchema>;
