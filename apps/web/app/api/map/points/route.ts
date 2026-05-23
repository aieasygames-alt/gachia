import { NextResponse } from 'next/server';

const HOYOLAB_POINT_API = 'https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/point/list';

// Cache the response for 6 hours
let cachedData: { json: unknown; timestamp: number } | null = null;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('map_id') || '2';

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedData.json, {
      headers: { 'Cache-Control': 'public, s-maxage=21600' },
    });
  }

  try {
    const res = await fetch(
      `${HOYOLAB_POINT_API}?map_id=${mapId}&app_sn=ys_obc`,
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

    // Group points by label_id, only keeping important ones
    const categories: Record<string, { id: string; name: string; points: { id: number; x: number; y: number }[] }> = {};

    for (const p of pointList) {
      const labelId = p.label_id as number;
      if (!IMPORTANT_LABELS.has(labelId)) continue;

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

    cachedData = { json: result, timestamp: Date.now() };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=21600' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
