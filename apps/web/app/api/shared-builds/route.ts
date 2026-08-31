import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sharedBuilds, eq } from '@gachia/db';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';
import { GAME_IDS } from '@gachia/core';

const gameIds = new Set<string>(GAME_IDS);

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, { limit: 10, windowSeconds: 60, prefix: '/api/shared-builds' });
  if (limited) return limited;

  // CRITICAL FIX: Add authentication check
  const auth = createAuth();
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();

  // CRITICAL FIX: Ignore user-provided userId, use session userId instead
  const userId = session.user.id;

  const parsedBody = parseCreateBuild(body);
  if (!parsedBody) {
    return NextResponse.json({
      error: 'Invalid input',
      details: { formErrors: ['Invalid gameId, characterId, or buildData'] },
    }, { status: 400 });
  }
  const { gameId, characterId, buildData } = parsedBody;

  // Generate a short ID (8 chars, URL-friendly)
  const id = generateId();

  const db = getDb();
  await db.insert(sharedBuilds).values({
    id,
    userId, // Use authenticated userId, not user-provided
    gameId,
    characterId,
    buildData,
  });

  return NextResponse.json({ id });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const db = getDb();
  const builds = await db
    .select()
    .from(sharedBuilds)
    .where(eq(sharedBuilds.id, id))
    .limit(1);

  if (builds.length === 0) {
    return NextResponse.json({ error: 'Build not found' }, { status: 404 });
  }

  return NextResponse.json(builds[0], {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}

function generateId(): string {
  // CRITICAL FIX: Use crypto.randomUUID() instead of Math.random()
  return randomUUID().replaceAll('-', '').substring(0, 16);
}

function parseCreateBuild(value: unknown): { gameId: string; characterId: string; buildData: string } | null {
  if (!value || typeof value !== 'object') return null;

  const payload = value as { gameId?: unknown; characterId?: unknown; buildData?: unknown };
  if (typeof payload.gameId !== 'string' || !gameIds.has(payload.gameId)) return null;
  if (typeof payload.characterId !== 'string' || payload.characterId.length < 1 || payload.characterId.length > 50) {
    return null;
  }
  if (typeof payload.buildData !== 'string' || payload.buildData.length > 10000) return null;

  return {
    gameId: payload.gameId,
    characterId: payload.characterId,
    buildData: payload.buildData,
  };
}
