import { NextResponse } from 'next/server';

const HOYOLAB_MAP_API = 'https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/info';

interface MapSlice {
  url: string;
}

interface MapDetail {
  slices: MapSlice[][];
}

interface MapInfo {
  id: number;
  name: string;
  detail: string;
}

interface MapData {
  data: {
    info: MapInfo;
  };
}

// Cache the response for 24 hours
let cachedResponse: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mapId = searchParams.get('map_id') || '2';

  // Return cached data if fresh
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedResponse.data);
  }

  try {
    const res = await fetch(
      `${HOYOLAB_MAP_API}?map_id=${mapId}&app_sn=ys_obc&lang=en-us`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch map data' }, { status: 502 });
    }

    const raw: MapData = await res.json();

    // Parse the detail and extract tile grid info
    const detail: MapDetail = JSON.parse(raw.data.info.detail);
    const slices = detail.slices;
    const rows = slices.length;
    const cols = slices[0]?.length ?? 0;

    // Build a clean response with tile grid
    const tileGrid: string[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < cols; c++) {
        row.push(slices[r]?.[c]?.url ?? '');
      }
      tileGrid.push(row);
    }

    const result = {
      mapId: raw.data.info.id,
      name: raw.data.info.name,
      rows,
      cols,
      tileSize: 2048,
      totalWidth: cols * 2048,
      totalHeight: rows * 2048,
      tiles: tileGrid,
    };

    cachedResponse = { data: result, timestamp: Date.now() };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
