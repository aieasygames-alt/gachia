import { sharedBuilds, eq } from '@gachia/db';
import { getDb } from '@/lib/db';

export async function getPublicSharedBuild(id: string) {
  const [build] = await getDb().select({
    id: sharedBuilds.id,
    gameId: sharedBuilds.gameId,
    characterId: sharedBuilds.characterId,
    buildData: sharedBuilds.buildData,
    createdAt: sharedBuilds.createdAt,
    expiresAt: sharedBuilds.expiresAt,
  }).from(sharedBuilds).where(eq(sharedBuilds.id, id)).limit(1);

  // Check after the read; equality and invalid dates fail closed. Null is permanent.
  if (!build || (build.expiresAt !== null && !(build.expiresAt.getTime() > Date.now()))) return null;

  // Keep internal expiry and any future database fields out of the public DTO.
  return {
    id: build.id,
    gameId: build.gameId,
    characterId: build.characterId,
    buildData: build.buildData,
    createdAt: build.createdAt,
  };
}
