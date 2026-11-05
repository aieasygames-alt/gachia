import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { capturePublishedBaseline, recoveryBaselineSHA256, verifyPublishedBaseline, validatePublishedGuideUpdate, verifyPublishedGuideUpdate } from './desktop-published-baseline.mjs';
import { SERVICES } from './desktop-cloud-release.mjs';
import { digest } from './desktop-release-assets.mjs';
import { newGuideSource } from './desktop-guide-contract.mjs';

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

const encode = rows => JSON.stringify(rows);

test('successive additions and edits preserve public CMS-born records without requiring fake import provenance', () => {
  const original = [{ id: 'legacy', title: 'O' }];
  const one = newGuideSource('genshin', { id: 'cms-one', title: 'New guide', summary: 'Fixture', body: 'Isolated content. '.repeat(8) }).guide;
  const another = { ...one, id: 'cms-another' }, published = [...original, one];
  const candidate = [...original, another, { ...one, title: 'Updated guide' }];
  assert.deepEqual(validatePublishedGuideUpdate(encode(original), encode(published), encode(candidate)).added, ['cms-another']);
  assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode([...original, another])), /identity\/order/);
  assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode([...original, { ...one, summary: 'Changed metadata' }])), /metadata/);
  assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode(published)), /unchanged/);
});
const fields = ['title', 'titleEn', 'titleJa', 'content', 'contentEn', 'contentJa'];
for (const field of fields) test(`published ${field} cannot revert to O while a different field or guide changes`, () => {
  const original = [{ id: 'one', [field]: 'O' }, { id: 'two', title: 'Other O' }];
  const published = [{ ...original[0], [field]: 'Published A' }, original[1]];
  const otherGuide = [original[0], { ...original[1], title: 'Candidate B' }];
  const otherField = [{ ...original[0], [field === 'content' ? 'title' : 'content']: 'Candidate B' }, original[1]];
  for (const candidate of [otherGuide, otherField]) {
    assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode(candidate)), /Implicit reset to import O/);
  }
});

test('published missing/null/empty original fields and added translations are not implicitly restored', () => {
  for (const originalField of [{}, { titleJa: null }, { titleJa: '' }]) {
    const original = [{ id: 'one', title: 'O', ...originalField }];
    const published = [{ ...original[0], titleJa: 'Published Japanese A' }];
    const candidate = [{ ...original[0], title: 'Candidate B' }];
    assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode(candidate)));
  }
});

test('normal O to A to B updates and explicit empty text preserve other public fields', () => {
  const original = [{ id: 'one', title: 'O', content: 'Original', image: '/keep.webp' }, { id: 'two', title: 'Other O' }];
  const published = [{ ...original[0], title: 'Published A' }, original[1]];
  const candidate = [{ ...published[0], content: '' }, { ...original[1], title: 'Candidate B' }];
  assert.deepEqual(validatePublishedGuideUpdate(encode(original), encode(published), encode(candidate)).changed, ['one', 'two']);
  assert.equal(validatePublishedGuideUpdate(encode(original), encode(original), encode(published)).changed.length, 1);
  assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode(published)), /unchanged from current published A/);
  assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode([...candidate].reverse())), /identity\/order\/media\/metadata/);
});

test('deliberate reset to O also fails closed until a separate reset-intent contract exists', () => {
  const original = [{ id: 'one', title: 'O', content: 'Original' }];
  const published = [{ ...original[0], title: 'Published A' }];
  assert.throws(() => validatePublishedGuideUpdate(encode(original), encode(published), encode(original)), /Implicit reset to import O/);
});

test('disk update gate binds A to old UUIDs and B to frozen candidate SHA without changing recovery readers', async t => {
  const f = fixture(t), published = Buffer.from(encode([{ id: 'one', title: 'A', content: 'Original' }]));
  const captured = await capturePublishedBaseline({ plan: f.plan, importBytes: f.original, directory: join(f.root, 'update-baseline'),
    observe: async () => structuredClone(f.snapshot), request: async () => new Response(published, { headers: { 'content-type': 'application/json' } }) });
  const candidate = Buffer.from(encode([{ id: 'one', title: 'B', content: 'Original' }]));
  const candidatePath = join(f.root, 'candidate.json'); writeFileSync(candidatePath, candidate);
  f.plan.candidateSHA256 = digest(candidate);
  const verified = { plan: f.plan, receipt: { owners: Object.fromEntries(Object.entries(captured.versions).map(([owner, version]) => [owner, { previousVersion: version }])) } };
  assert.equal(verifyPublishedGuideUpdate({ ...captured, candidatePath, verified }).changed.length, 1);
  writeFileSync(candidatePath, f.original);
  assert.throws(() => verifyPublishedGuideUpdate({ ...captured, candidatePath, verified }), /Candidate digest mismatch/);
  f.plan.candidateSHA256 = digest(f.original);
  assert.throws(() => verifyPublishedGuideUpdate({ ...captured, candidatePath, verified }), /Implicit reset to import O/);
  assert.equal(recoveryBaselineSHA256(captured, verified), digest(published), 'Recovery must still be able to restore public A');
  verified.receipt.owners.main.previousVersion = uuid(999);
  assert.throws(() => verifyPublishedGuideUpdate({ ...captured, candidatePath, verified }), /another deployed version/);
});
