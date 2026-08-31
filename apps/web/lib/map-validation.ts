type ParseResult<T> = { success: true; data: T } | { success: false };

export type MarkerBatch = {
  mapId: string;
  collected: string[];
  removed: string[];
};

const keyPattern = /^[a-zA-Z0-9_-]+$/;

export const MapIdSchema = {
  safeParse(value: unknown): ParseResult<string> {
    const mapId = parseKey(value, 64);
    return mapId ? { success: true, data: mapId } : { success: false };
  },
};

export const MarkerIdSchema = {
  safeParse(value: unknown): ParseResult<string> {
    const markerId = parseKey(value, 100);
    return markerId ? { success: true, data: markerId } : { success: false };
  },
};

export const BatchSchema = {
  safeParse(value: unknown): ParseResult<MarkerBatch> {
    if (!value || typeof value !== 'object') return { success: false };

    const payload = value as { mapId?: unknown; collected?: unknown; removed?: unknown };
    const mapId = parseKey(payload.mapId, 64);
    const collected = parseMarkerArray(payload.collected ?? []);
    const removed = parseMarkerArray(payload.removed ?? []);

    if (!mapId || !collected || !removed || collected.length + removed.length > 500) {
      return { success: false };
    }

    return { success: true, data: { mapId, collected, removed } };
  },
};

function parseMarkerArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;

  const markers = value.map((item) => parseKey(item, 100));
  return markers.every((item): item is string => Boolean(item)) ? markers : null;
}

function parseKey(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= maxLength && keyPattern.test(trimmed) ? trimmed : null;
}
