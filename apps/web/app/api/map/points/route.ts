import { NextResponse } from 'next/server';

const HOYOLAB_POINT_API = 'https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/point/list';

// Cache responses per map_id for 6 hours
const pointsCache = new Map<string, { json: unknown; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000;

// Label IDs for the most important categories we want to show
const IMPORTANT_LABELS = new Set([
  // Teleporters & Statues
  3,    // Teleport Waypoint
  2,    // Statue of The Seven
  154,  // Domain
  // Oculi
  5,    // Anemoculus
  6,    // Geoculus
  194,  // Electroculus
  403,  // Dendroculus
  508,  // Hydroculus
  626,  // Pyroculus
  694,  // Lunoculus
  // Chests
  17,   // Common Chest
  44,   // Exquisite Chest
  45,   // Precious Chest
  46,   // Luxurious Chest
  269,  // Remarkable Chest
  // World Bosses (only 1 each but important)
  132, 133, 134, 135, 136, 137, 138, // Original bosses
  157, 181, 183, 203, 204, // Later bosses
  262, 263, 318, 390, 391, // More bosses
  432, 433, 452, 455, 457, // Sumeru bosses
  497, 498, 539, 540, 553, // Fontaine bosses
  608, 609, 610, 629, 660, 687, // Natlan bosses
  // Local Specialties (key ones per region)
  29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, // Mondstadt + Liyue
  185, 196, 197, 198, 199, 200, 227, 228, // Inazuma
  384, 385, 386, 387, 400, 401, 402, 413, // Sumeru
  492, 500, 501, 502, 503, 519, // Fontaine
  611, 613, 614, 615, 616, 617, 620, 621, // Natlan
]);

// Known valid map IDs for Genshin Impact maps
const VALID_MAP_IDS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('map_id') || '2';
  const labelsParam = searchParams.get('labels');

  // P1-29: Validate map_id to prevent SSRF and injection attacks
  if (!VALID_MAP_IDS.has(mapId)) {
    return NextResponse.json({ error: 'Invalid map_id' }, { status: 400 });
  }

  // Validate labels parameter format
  if (labelsParam && !labelsParam.split(',').every(id => /^\d+$/.test(id.trim()))) {
    return NextResponse.json({ error: 'Invalid labels format' }, { status: 400 });
  }

  // Build label filter: use custom labels if provided, otherwise use IMPORTANT_LABELS
  const labelFilter = labelsParam
    ? new Set(labelsParam.split(',').map(Number).filter((n) => !isNaN(n)))
    : IMPORTANT_LABELS;

  const cacheKey = `points:${mapId}:${labelsParam ?? 'default'}`;
  const cached = pointsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.json, {
      headers: { 'Cache-Control': 'public, s-maxage=21600' },
    });
  }

  try {
    // P1-29: Use encodeURIComponent to prevent injection via map_id
    const res = await fetch(
      `${HOYOLAB_POINT_API}?map_id=${encodeURIComponent(mapId)}&app_sn=ys_obc`,
      { next: { revalidate: 21600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch points' }, { status: 502 });
    }

    const raw: any = await res.json();
    const pointList = raw?.data?.point_list ?? [];
    const labelList = raw?.data?.label_list ?? [];

    // Build label lookup
    const labelMap = new Map<number, { id: number; name: string }>();
    for (const l of labelList) {
      labelMap.set(l.id, { id: l.id, name: l.name });
    }

    // Group points by label_id, only keeping filtered ones
    const categories: Record<string, { id: string; name: string; points: { id: number; x: number; y: number }[] }> = {};

    for (const p of pointList) {
      const labelId = p.label_id as number;
      if (!labelFilter.has(labelId)) continue;

      const label = labelMap.get(labelId);
      if (!label) continue;

      const key = String(labelId);
      if (!categories[key]) {
        categories[key] = { id: key, name: label.name, points: [] };
      }
      categories[key].points.push({
        id: p.id,
        x: p.x_pos,
        y: p.y_pos,
      });
    }

    const result = {
      mapId: Number(mapId),
      categories: Object.values(categories),
      totalPoints: Object.values(categories).reduce((s, c) => s + c.points.length, 0),
    };

    pointsCache.set(cacheKey, { json: result, timestamp: Date.now() });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=21600' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
