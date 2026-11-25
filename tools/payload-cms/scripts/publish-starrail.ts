import { parseStarRailPublication } from '../../../packages/data/cms/starrail-publication';
import { STARRAIL_EXPORT_LIMIT, STARRAIL_PUBLICATION_BYTES } from '../../../packages/data/cms/starrail-limits';

export async function publishStarRail() {
  const origin = process.env.STARRAIL_PUBLISH_ORIGIN;
  const token = process.env.STARRAIL_PUBLISH_TOKEN;
  if (!origin || !token) throw new Error('Configure STARRAIL_PUBLISH_ORIGIN and STARRAIL_PUBLISH_TOKEN.');
  const url = new URL('/api/cms/starrail', origin);
  if (url.origin !== origin || !(url.protocol === 'https:' || url.hostname === '127.0.0.1')) throw new Error('Invalid publication origin');
  const cms = new URL(process.env.CMS_SERVER_URL || 'http://127.0.0.1:4320');
  if (cms.hostname !== '127.0.0.1' || cms.protocol !== 'http:' || cms.username || cms.password) throw new Error('Use the local Payload public API.');
  const source = new URL('/api/game-updates', cms);
  source.search = new URLSearchParams({ 'where[gameId][equals]': 'starrail', draft: 'false', limit: String(STARRAIL_EXPORT_LIMIT), depth: '0', sort: 'contentKey' }).toString();
  const exported = await fetch(source, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!exported.ok) throw new Error(`Payload public export failed (${exported.status}).`);
  const rows = await exported.json();
  if (rows.hasNextPage || !Array.isArray(rows.docs)) throw new Error('Incomplete Payload export.');
  const publication = parseStarRailPublication({ revision: Date.now(), docs: rows.docs });
  if (!publication) throw new Error('Invalid complete published collection; nothing sent.');
  const body = JSON.stringify(publication);
  if (Buffer.byteLength(body, 'utf8') > STARRAIL_PUBLICATION_BYTES) throw new Error('Complete publication exceeds 512 KiB; nothing sent.');
  const response = await fetch(url, { method: 'PUT', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', 'user-agent': 'GachiaCMS/1.0' },
    body, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Main site publication failed (${response.status}); CMS content remains saved. Retry npm run publish:starrail.`);
  const receipt = await response.json();
  const check = await fetch(new URL('/api/cms/starrail?locale=zh', origin), { cache: 'no-store', headers: { 'user-agent': 'GachiaCMS/1.0' }, signal: AbortSignal.timeout(20000) });
  if (!check.ok || (await check.json()).revision !== publication.revision) throw new Error('Publication saved but public revision verification failed.');
  return receipt;
}

if (process.argv[1]?.endsWith('/publish-starrail.ts')) {
  console.log(JSON.stringify(await publishStarRail()));
}
