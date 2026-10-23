import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkSeaGuideContract, seaGuideOutputs, verifySeaGuideContract, writeSeaGuideOutputs } from '../scripts/sea-guide-contract.mjs';

const roots = [];
const source = 'packages/data/games/sea/raw-guides.json';
const mirror = 'apps/web/public/data/sea/raw-guides.json';
const summary = 'apps/web/public/data-client/sea/guides.json';
const detail = 'apps/web/public/data-client/sea/guides/one.json';
const guides = [{ id: 'one', title: 'Guide', content: 'Body', contentEn: 'English', contentJa: 'Japanese', faq: [{ question: 'Q' }], summary: 'Intro', updatedAt: '2026-10-23' }];

async function put(root, path, value) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(value));
}

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'sea-contract-'));
  roots.push(root);
  await put(root, source, guides);
  await writeSeaGuideOutputs(root);
  return root;
}

afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('Sea guide single-source contract', () => {
  it('derives raw fallback, light summaries and complete details from the same source', async () => {
    const root = await fixture();
    const result = await verifySeaGuideContract(root);
    expect(result).toMatchObject({ guides: 1, outputs: 3, issues: [] });
    expect(JSON.parse(await readFile(resolve(root, mirror), 'utf8'))).toEqual(guides);
    expect(JSON.parse(await readFile(resolve(root, detail), 'utf8'))).toEqual(guides[0]);
    const summaries = JSON.parse(await readFile(resolve(root, summary), 'utf8'));
    for (const field of ['content', 'contentEn', 'contentJa', 'faq']) expect(summaries[0]).not.toHaveProperty(field);
    expect(summaries[0].updatedAt).toBe(guides[0].updatedAt);
  });

  for (const path of [mirror, summary, detail]) {
    it(`blocks semantic drift without repairing ${path}`, async () => {
      const root = await fixture();
      await put(root, path, { drift: true });
      const before = await readFile(resolve(root, path), 'utf8');
      await expect(verifySeaGuideContract(root)).rejects.toThrow(`drift: ${path}`);
      expect(await readFile(resolve(root, path), 'utf8')).toBe(before);
    });
  }

  it('blocks source edits until the explicit generator is run', async () => {
    const root = await fixture();
    const before = await verifySeaGuideContract(root);
    await put(root, source, [{ ...guides[0], title: 'Reviewed edit' }]);
    await expect(verifySeaGuideContract(root)).rejects.toThrow('drift');
    await writeSeaGuideOutputs(root);
    expect((await verifySeaGuideContract(root)).sourceSha256).not.toBe(before.sourceSha256);
  });

  it('ignores JSON key order and formatting but not array order', async () => {
    const root = await fixture();
    const before = await verifySeaGuideContract(root);
    await put(root, source, [Object.fromEntries(Object.entries(guides[0]).reverse())]);
    expect((await verifySeaGuideContract(root)).sourceSha256).toBe(before.sourceSha256);
    await put(root, source, [...guides, { ...guides[0], id: 'two' }]);
    await writeSeaGuideOutputs(root);
    await put(root, mirror, [{ ...guides[0], id: 'two' }, ...guides]);
    await expect(verifySeaGuideContract(root)).rejects.toThrow('drift');
  });

  it('blocks missing and malformed outputs', async () => {
    const root = await fixture();
    await rm(resolve(root, mirror));
    await writeFile(resolve(root, summary), '{');
    const result = await checkSeaGuideContract(root);
    expect(result.issues).toHaveLength(2);
    await expect(verifySeaGuideContract(root)).rejects.toThrow('missing or invalid');
  });

  it('retains orphan details and requires a reviewed removal decision', async () => {
    const root = await fixture();
    const orphan = 'apps/web/public/data-client/sea/guides/old.json';
    await put(root, orphan, { id: 'old' });
    await writeSeaGuideOutputs(root);
    await expect(verifySeaGuideContract(root)).rejects.toThrow(`orphan: ${orphan}`);
    expect(JSON.parse(await readFile(resolve(root, orphan), 'utf8'))).toEqual({ id: 'old' });
  });

  it('rejects unsafe IDs, duplicates and invalid source before generating', () => {
    for (const id of ['../one', '/absolute', 'one.json', '', 'One']) expect(() => seaGuideOutputs([{ ...guides[0], id }])).toThrow();
    for (const raw of [null, [], [...guides, ...guides], [{ id: 'one', title: 'No body' }]]) expect(() => seaGuideOutputs(raw)).toThrow();
  });

  it('verifies the committed pilot artifacts', async () => {
    expect((await verifySeaGuideContract()).issues).toEqual([]);
  });
});
