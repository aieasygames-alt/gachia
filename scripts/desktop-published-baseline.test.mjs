import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { capturePublishedBaseline, recoveryBaselineSHA256, verifyPublishedBaseline } from './desktop-published-baseline.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';

const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cms-baseline-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const original = Buffer.from(JSON.stringify([{ id: 'one', title: 'O', content: 'Original' }]));
  const snapshot = { services: Object.fromEntries(SERVICES.map((s, i) => [s, { id: uuid(i + 10), versions: [{ version_id: uuid(i + 20), percentage: 100 }] }])),
    settings: {}, bindings: {}, routes: [], domains: [], subdomains: {}, scripts: SERVICES };
  const plan = { preview: false, game: 'genshin', owners: ['genshin', 'main'], sourceSHA256: digest(original) };
  return { root, original, snapshot, plan };
}
test('O import survives A then B publication; recovery for B is A, not O', async t => {
  const f = fixture(t);
  const content = title => Buffer.from(JSON.stringify([{ id: 'one', title, content: 'Original' }]));
  for (const [i, title] of ['O', 'A', 'B'].entries()) {
    f.snapshot.services.gachia.versions[0].version_id = uuid(100 + i);
    const capture = await capturePublishedBaseline({ plan: f.plan, importBytes: f.original, directory: join(f.root, title),
      observe: async () => structuredClone(f.snapshot), request: async (url, options) => {
        assert(url.includes(uuid(100 + i).slice(0, 8) + '-gachia.')); assert.equal(options.method, 'GET'); assert(!options.headers);
        return new Response(content(title), { headers: { 'content-type': 'application/json' } });
      } });
    const verified = { plan: f.plan, receipt: { owners: Object.fromEntries(Object.entries(capture.versions).map(([owner, version]) => [owner, { previousVersion: version }])) } };
    assert.equal(recoveryBaselineSHA256(capture, verified), digest(content(title)));
    assert.equal(verifyPublishedBaseline(capture.baselinePath, capture.baselinePin, f.plan, capture.versions).importSHA256, digest(f.original));
    if (title === 'A') assert.notEqual(recoveryBaselineSHA256(capture, verified), f.plan.sourceSHA256);
  }
});
for (const failure of ['topology', 'identity', 'cookie', 'status']) test(`published capture rejects ${failure}`, async t => {
  const f = fixture(t); let n = 0;
  await assert.rejects(capturePublishedBaseline({ plan: f.plan, importBytes: f.original, directory: join(f.root, 'capture'),
    observe: async () => { const s = structuredClone(f.snapshot); if (++n === 2 && failure === 'topology') s.routes.push('changed'); return s; },
    request: async () => new Response(failure === 'identity' ? '[{"id":"different"}]' : f.original, {
      status: failure === 'status' ? 404 : 200, headers: { 'content-type': 'application/json', ...(failure === 'cookie' ? { 'set-cookie': 'session' } : {}) },
    }),
  }));
});
test('baseline is bound to prior versions and saved bodies; real releases cannot use legacy fallback', async t => {
  const f = fixture(t), captured = await capturePublishedBaseline({ plan: f.plan, importBytes: f.original, directory: join(f.root, 'captured'),
    observe: async () => structuredClone(f.snapshot), request: async () => new Response(f.original, { headers: { 'content-type': 'application/json' } }) });
  assert.throws(() => verifyPublishedBaseline(captured.baselinePath, captured.baselinePin, f.plan, { ...captured.versions, main: uuid(999) }), /another deployed/);
  assert.throws(() => recoveryBaselineSHA256({}, { plan: f.plan }), /Real recovery requires/);
  writeFileSync(join(f.root, 'captured/published.body'), 'changed');
  assert.throws(() => verifyPublishedBaseline(captured.baselinePath, captured.baselinePin, f.plan, captured.versions));
  assert.equal(JSON.parse(readFileSync(captured.baselinePath)).contentSHA256, f.plan.sourceSHA256);
});
