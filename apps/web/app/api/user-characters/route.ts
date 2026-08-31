import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { userCharacters, eq, and } from '@gachia/db';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { GAME_IDS } from '@gachia/core';

const RL = { limit: 100, windowSeconds: 60, prefix: '/api/user-characters' };
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

  const parsedBody = parseCharacterBody(await request.json());
  if (!parsedBody) {
    return NextResponse.json({ error: 'Invalid character data' }, { status: 400 });
  }
  const { gameId, characterId, level, constellation, notes } = parsedBody;

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

  const parsedBody = parseCharacterKey(await request.json());
  if (!parsedBody) {
    return NextResponse.json({ error: 'Invalid character data' }, { status: 400 });
  }
  const { gameId, characterId } = parsedBody;

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

function parseCharacterBody(value: unknown): {
  gameId: string;
  characterId: string;
  level?: number;
  constellation?: number;
  notes?: string;
} | null {
  const key = parseCharacterKey(value);
  if (!key || !value || typeof value !== 'object') return null;

  const payload = value as { level?: unknown; constellation?: unknown; notes?: unknown };
  const level = parseOptionalInteger(payload.level, 1, 100);
  const constellation = parseOptionalInteger(payload.constellation, 0, 6);
  const notes = parseOptionalString(payload.notes, 1000);

  if (level === null || constellation === null || notes === null) return null;

  return {
    ...key,
    ...(level === undefined ? {} : { level }),
    ...(constellation === undefined ? {} : { constellation }),
    ...(notes === undefined ? {} : { notes }),
  };
}

function parseCharacterKey(value: unknown): { gameId: string; characterId: string } | null {
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

function parseOptionalInteger(value: unknown, min: number, max: number): number | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function parseOptionalString(value: unknown, maxLength: number): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : null;
}
