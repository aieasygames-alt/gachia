import { timingSafeEqual } from 'node:crypto';
import { getD1 } from '@/lib/db';
import { getStarRailPublication } from '@/lib/starrail-publication';
import { parseStarRailPublication } from '@gachia/data/cms/starrail-publication';
import { STARRAIL_PUBLICATION_BYTES } from '@gachia/data/cms/starrail-limits';

export const dynamic = 'force-dynamic';
const headers = { 'cache-control': 'no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
const limit = STARRAIL_PUBLICATION_BYTES;

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get('locale') || 'zh';
  if (!['zh', 'en', 'ja'].includes(locale)) return reply({ error: 'Invalid locale' }, 400);
  try {
    const publication = await getStarRailPublication();
    if (!publication) return reply({ error: 'Not published' }, 503);
    return reply({ revision: publication.revision, docs: publication.docs.filter(doc => doc.locale === locale), hasNextPage: false });
  } catch { return reply({ error: 'Publication unavailable' }, 503); }
}

export async function PUT(request: Request) {
  const secret = process.env.STARRAIL_PUBLISH_TOKEN;
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from('Bearer ' + (secret || ''));
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply({ error: 'Unauthorized' }, 401);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSON required' }, 415);
  // Bound the actual stream, including chunked requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: 'Body required' }, 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); return reply({ error: 'Publication too large' }, 413); }
    chunks.push(value);
  }
  let publication;
  try { publication = parseStarRailPublication(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch { return reply({ error: 'Invalid JSON' }, 400); }
  if (!publication) return reply({ error: 'Invalid published content' }, 400);
  const payload = JSON.stringify(publication);
  try {
    const db = getD1();
    // A late response/retry cannot overwrite a newer complete publication.
    await db.prepare(`INSERT INTO cms_starrail_publication (id, revision, payload) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET revision = excluded.revision, payload = excluded.payload
      WHERE excluded.revision > cms_starrail_publication.revision`).bind(publication.revision, payload).run();
    const current = await db.prepare('SELECT revision, payload FROM cms_starrail_publication WHERE id = 1').first<{ revision: number; payload: string }>();
    if (current?.revision !== publication.revision || current.payload !== payload) return reply({ error: 'Newer publication already exists' }, 409);
    return reply({ ok: true, revision: publication.revision, count: publication.docs.length });
  } catch { return reply({ error: 'Publication storage unavailable' }, 503); }
}
