import { z } from 'zod';

export const MapIdSchema = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
export const MarkerIdSchema = z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);

export const BatchSchema = z.object({
  mapId: MapIdSchema,
  collected: z.array(MarkerIdSchema).max(500).default([]),
  removed: z.array(MarkerIdSchema).max(500).default([]),
}).refine(({ collected, removed }) => collected.length + removed.length <= 500, {
  message: 'A maximum of 500 marker changes is allowed',
});
