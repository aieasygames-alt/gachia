import assert from 'node:assert/strict';
import test from 'node:test';
import { createArtifactVerificationSession, sessionHTMLFingerprints } from './artifact-verification-session.mjs';
import { unifiedPageFingerprints } from './unified-version-preview.mjs';

test('HTML parse reuse binds actual bytes, status and parser source, isolating returned values', async () => {
  const session = createArtifactVerificationSession(); let parsed = 0;
  const rows = [{ html: '<p>A</p>', status: 200 }, { html: '<p>B</p>', status: 404 }];
  const parser = input => { parsed += input.length; return input.map(row => ({ text: row.html, status: row.status })); };
  const run = (input = rows, pin = 'a'.repeat(64)) => session.run(() => sessionHTMLFingerprints(input, pin, parser));
  const first = await run(); assert.equal(parsed, 2); first[0].text = 'tampered';
  assert.deepEqual(await run(), parser(rows)); assert.equal(parsed, 4);
  await run([{ ...rows[0], html: '<p>C</p>' }, rows[1]]); assert.equal(parsed, 5);
  await run([{ ...rows[0], status: 404 }]); assert.equal(parsed, 6);
  await run(rows, 'b'.repeat(64)); assert.equal(parsed, 8);
  sessionHTMLFingerprints(rows, 'a'.repeat(64), parser); assert.equal(parsed, 10, 'Outside sessions must parse');
  await createArtifactVerificationSession().run(() => sessionHTMLFingerprints(rows, 'a'.repeat(64), parser)); assert.equal(parsed, 12);
});

test('real versioned parser output is identical and changed invalid HTML still fails after a hit', async () => {
  const rows = [{ html: '<html><head><title>Missing</title></head><body><h1>Not found</h1></body></html>', status: 404 }];
  for (const version of ['legacy-v1', 'streaming-v2']) {
    const expected = unifiedPageFingerprints(rows, version), session = createArtifactVerificationSession();
    assert.deepEqual(await session.run(() => unifiedPageFingerprints(rows, version)), expected);
    assert.deepEqual(await session.run(() => unifiedPageFingerprints(rows, version)), expected);
    await assert.rejects(session.run(() => unifiedPageFingerprints([{ ...rows[0], status: 200 }], version)), /parsing failed/);
    await assert.rejects(session.run(() => unifiedPageFingerprints(rows, version)), /failed/);
  }
});
