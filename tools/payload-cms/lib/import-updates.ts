import type { Payload } from 'payload';
import { parseStarRailUpdate } from '../../../packages/data/cms/starrail-updates';

export async function importUpdates(payload: Payload, candidates: unknown[], publish = false) {
  const results: { key: string; action: 'preserved' | 'created'; status?: string }[] = [];
  for (const candidate of candidates) {
    const update = parseStarRailUpdate(candidate);
    if (!update) throw new Error('Invalid Star Rail seed. Nothing is inferred from an incomplete record.');
    const key = `${update.gameId}:${update.locale}:${update.slug}`;
    const existing = await payload.find({ collection: 'game-updates', where: { contentKey: { equals: key } }, limit: 1, draft: true });
    if (existing.docs.length) {
      results.push({ key, action: 'preserved' });
      continue;
    }
    const status = publish ? 'published' : 'draft';
    await payload.create({ collection: 'game-updates', data: { ...update, _status: status }, draft: !publish });
    results.push({ key, action: 'created', status });
  }
  return results;
}
