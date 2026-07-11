import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { userFavorites, eq, and } from '@gachia/db';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const RL = { limit: 100, windowSeconds: 60, prefix: '/api/favorites' };
const FavoriteSchema = z.object({
  gameId: z.enum(['genshin', 'starrail', 'wuwa', 'nte', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'skjh']),
  characterId: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
});

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

  const parsedBody = FavoriteSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid favorite' }, { status: 400 });
  }
  const { gameId, characterId } = parsedBody.data;

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

  const parsedBody = FavoriteSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid favorite' }, { status: 400 });
  }
  const { gameId, characterId } = parsedBody.data;

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
