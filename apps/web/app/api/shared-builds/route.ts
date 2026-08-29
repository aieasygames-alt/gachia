import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sharedBuilds, eq } from '@gachia/db';
import { createAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { GAME_IDS } from '@gachia/core';

// Validation schema with Zod
const CreateBuildSchema = z.object({
  gameId: z.enum(GAME_IDS as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid game ID' })
  }),
  characterId: z.string().min(1).max(50),
  buildData: z.string().max(10000), // Limit to 10KB to prevent DoS
});

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

  const body: { gameId?: string; characterId?: string; buildData?: string; userId?: string } = await request.json();

  // CRITICAL FIX: Ignore user-provided userId, use session userId instead
  const userId = session.user.id;

  // CRITICAL FIX: Validate input with Zod schema
  const validationResult = CreateBuildSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid input',
      details: validationResult.error.flatten()
    }, { status: 400 });
  }
  const { gameId, characterId, buildData } = validationResult.data;

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
