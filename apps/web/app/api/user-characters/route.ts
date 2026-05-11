import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { userCharacters, eq, and } from '@gachia/db';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const RL = { limit: 100, windowSeconds: 60, prefix: '/api/user-characters' };

async function getSession(request: NextRequest) {
  const auth = createAuth();
  return auth.api.getSession({ headers: request.headers });
}

interface CharacterBody {
  gameId?: string;
  characterId?: string;
  level?: number;
  constellation?: number;
  notes?: string;
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
  const conditions = [eq(userCharacters.userId, session.user.id)];
  if (gameId) {
    conditions.push(eq(userCharacters.gameId, gameId));
  }

  const characters = await db
    .select()
    .from(userCharacters)
    .where(and(...conditions));

  return NextResponse.json(characters);
}

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, RL);
  if (limited) return limited;

  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: CharacterBody = await request.json();
  const { gameId, characterId, level, constellation, notes } = body;

  if (!gameId || !characterId) {
    return NextResponse.json({ error: 'gameId and characterId are required' }, { status: 400 });
  }

  const db = getDb();

  try {
    await db.insert(userCharacters).values({
      userId: session.user.id,
      gameId,
      characterId,
      level: level ?? 1,
      constellation: constellation ?? 0,
      notes: notes ?? null,
    });
  } catch {
    await db
      .update(userCharacters)
      .set({
        level: level ?? 1,
        constellation: constellation ?? 0,
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userCharacters.userId, session.user.id),
          eq(userCharacters.gameId, gameId),
          eq(userCharacters.characterId, characterId),
        ),
      );
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

  const body: CharacterBody = await request.json();
  const { gameId, characterId } = body;

  if (!gameId || !characterId) {
    return NextResponse.json({ error: 'gameId and characterId are required' }, { status: 400 });
  }

  const db = getDb();
  await db
    .delete(userCharacters)
    .where(
      and(
        eq(userCharacters.userId, session.user.id),
        eq(userCharacters.gameId, gameId),
        eq(userCharacters.characterId, characterId),
      ),
    );

  return NextResponse.json({ success: true });
}
