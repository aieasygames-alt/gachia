import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sharedBuilds, eq, sql } from '@gachia/db';
import { createAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body: { gameId?: string; characterId?: string; buildData?: string; userId?: string } = await request.json();
  const { gameId, characterId, buildData, userId } = body;

  if (!gameId || !characterId || !buildData) {
    return NextResponse.json({ error: 'gameId, characterId, and buildData are required' }, { status: 400 });
  }

  // Generate a short ID (8 chars, URL-friendly)
  const id = generateId();

  const db = getDb();
  await db.insert(sharedBuilds).values({
    id,
    userId: userId || null,
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

  // Increment view count
  await db
    .update(sharedBuilds)
    .set({ viewCount: sql`${sharedBuilds.viewCount} + 1` })
    .where(eq(sharedBuilds.id, id));

  return NextResponse.json(builds[0]);
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
