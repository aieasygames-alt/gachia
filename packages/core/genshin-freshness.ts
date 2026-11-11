import { z } from 'zod';

const text = z.string().max(256 * 1024).optional();
export const genshinFreshnessGuidesSchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  title: text, titleEn: text, summary: text, summaryEn: text, currentVersion: text,
  content: text, contentEn: text,
}).strip()).max(1000).superRefine((guides, ctx) => {
  if (new Set(guides.map(guide => guide.id)).size !== guides.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate guide IDs' });
  }
});
