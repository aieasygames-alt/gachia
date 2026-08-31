import { NextRequest, NextResponse } from 'next/server';
import { getDb, getD1 } from '@/lib/db';
import { mapProgress, eq, and } from '@gachia/db';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { BatchSchema, MapIdSchema, MarkerIdSchema } from '@/lib/map-validation';

const RL = { limit: 60, windowSeconds: 60, prefix: '/api/map/progress' };

async function getSession(request: NextRequest) {
  const auth = createAuth();
  return auth.api.getSession({ headers: request.headers });
}

// GET /api/map/progress?map_id=teyvat — Get all collected markers for a map
export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(request, RL);
  if (limited) return limited;

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedMapId = MapIdSchema.safeParse(searchParams.get('map_id'));
  if (!parsedMapId.success) {
    return NextResponse.json({ error: 'map_id is required' }, { status: 400 });
  }

  const mapId = parsedMapId.data;
  const db = getDb();
  const rows = await db
    .select({ markerId: mapProgress.markerId })
    .from(mapProgress)
    .where(and(eq(mapProgress.userId, session.user.id), eq(mapProgress.mapId, mapId)));

  return NextResponse.json({
    mapId,
    markers: rows.map((r) => r.markerId),
  });
}

// POST /api/map/progress — Toggle a single marker
export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, RL);
  if (limited) return limited;

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsedBody = parseMarkerToggle(await request.json());
  if (!parsedBody) {
    return NextResponse.json({ error: 'mapId and markerId are required' }, { status: 400 });
  }

  const { mapId, markerId } = parsedBody;
  const db = getDb();
  const d1 = getD1();

  // Check if exists
  const existing = await db
    .select({ id: mapProgress.id })
    .from(mapProgress)
    .where(and(eq(mapProgress.userId, session.user.id), eq(mapProgress.mapId, mapId), eq(mapProgress.markerId, markerId)))
    .limit(1);

  if (existing.length > 0) {
    // Remove
    await d1.prepare('DELETE FROM map_progress WHERE id = ?').bind(existing[0]!.id).run();
    return NextResponse.json({ collected: false });
  } else {
    // Add
    try {
      await db.insert(mapProgress).values({
        userId: session.user.id,
        mapId,
        markerId,
      });
    } catch {
      // Duplicate — ignore
    }
    return NextResponse.json({ collected: true });
  }
}

// PUT /api/map/progress — Batch sync
export async function PUT(request: NextRequest) {
  const limited = await checkRateLimit(request, RL);
  if (limited) return limited;

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsedBody = BatchSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid marker batch' }, { status: 400 });
  }

  const { mapId, collected, removed } = parsedBody.data;
  const d1 = getD1();

  const statements = [
    ...collected.map((markerId) => d1
      .prepare('INSERT OR IGNORE INTO map_progress (user_id, map_id, marker_id, created_at) VALUES (?, ?, ?, unixepoch())')
      .bind(session.user.id, mapId, markerId)),
    ...removed.map((markerId) => d1
      .prepare('DELETE FROM map_progress WHERE user_id = ? AND map_id = ? AND marker_id = ?')
      .bind(session.user.id, mapId, markerId)),
  ];
  if (statements.length > 0) {
    await d1.batch(statements);
  }

  return NextResponse.json({ success: true, added: collected.length, removed: removed.length });
}

function parseMarkerToggle(value: unknown): { mapId: string; markerId: string } | null {
  if (!value || typeof value !== 'object') return null;

  const payload = value as { mapId?: unknown; markerId?: unknown };
  const parsedMapId = MapIdSchema.safeParse(payload.mapId);
  const parsedMarkerId = MarkerIdSchema.safeParse(payload.markerId);

  if (!parsedMapId.success || !parsedMarkerId.success) return null;

  return {
    mapId: parsedMapId.data,
    markerId: parsedMarkerId.data,
  };
}
