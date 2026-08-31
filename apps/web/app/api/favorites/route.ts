import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { userFavorites, eq, and } from '@gachia/db';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { GAME_IDS } from '@gachia/core';

const RL = { limit: 100, windowSeconds: 60, prefix: '/api/favorites' };
const gameIds = new Set<string>(GAME_IDS);
const characterIdPattern = /^[a-zA-Z0-9_-]+$/;

async function getSession(request: NextRequest) {
  const auth = createAuth();
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(request, RL);
  if (limited) return limited;

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  const db = getDb();
  const conditions = [eq(userFavorites.userId, session.user.id)];
  if (gameId) {
    conditions.push(eq(userFavorites.gameId, gameId));
  }

  const favorites = await db
    .select()
    .from(userFavorites)
    .where(and(...conditions));

  return NextResponse.json(favorites);
}

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, RL);
  if (limited) return limited;

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsedBody = parseFavorite(await request.json());
  if (!parsedBody) {
    return NextResponse.json({ error: 'Invalid favorite' }, { status: 400 });
  }
  const { gameId, characterId } = parsedBody;

  const db = getDb();

  try {
    await db.insert(userFavorites).values({
      userId: session.user.id,
      gameId,
      characterId,
    });
  } catch {
    return NextResponse.json({ error: 'Already favorited' }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const limited = await checkRateLimit(request, RL);
  if (limited) return limited;

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsedBody = parseFavorite(await request.json());
  if (!parsedBody) {
    return NextResponse.json({ error: 'Invalid favorite' }, { status: 400 });
  }
  const { gameId, characterId } = parsedBody;

  const db = getDb();
  await db
    .delete(userFavorites)
    .where(
      and(
        eq(userFavorites.userId, session.user.id),
        eq(userFavorites.gameId, gameId),
        eq(userFavorites.characterId, characterId),
      ),
    );

  return NextResponse.json({ success: true });
}

function parseFavorite(value: unknown): { gameId: string; characterId: string } | null {
  if (!value || typeof value !== 'object') return null;

  const payload = value as { gameId?: unknown; characterId?: unknown };
  if (typeof payload.gameId !== 'string' || !gameIds.has(payload.gameId)) return null;
  if (typeof payload.characterId !== 'string') return null;

  const characterId = payload.characterId.trim();
  if (characterId.length < 1 || characterId.length > 100 || !characterIdPattern.test(characterId)) return null;

  return {
    gameId: payload.gameId,
    characterId,
  };
}
