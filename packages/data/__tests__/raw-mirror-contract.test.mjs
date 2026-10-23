import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { MANAGED_MIRRORS, verifyRawMirrors, writeRawMirrors } from '../scripts/raw-mirror-contract.mjs';

const roots = [];
const source = (item) => `packages/data/games/${item.game}/${item.file}`;
const mirror = (item) => `apps/web/public/data/${item.game}/${item.file}`;
async function put(root, path, value) {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), JSON.stringify(value));
}
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'raw-mirrors-'));
  roots.push(root);
  for (const item of MANAGED_MIRRORS) await put(root, source(item), [{ [item.key]: 'one', content: 'Existing copy' }]);
  await writeRawMirrors(root);
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

it('checks committed managed pairs', async () => {
  expect(await verifyRawMirrors()).toEqual({ contract: 'managed-raw-mirrors-v1', pairs: 5, entries: 75 });
});
it.each(MANAGED_MIRRORS)('blocks $game drift without repairing it', async (item) => {
  const root = await fixture();
  await put(root, mirror(item), [{ [item.key]: 'one', content: 'Mirror-only edit' }]);
  const before = await readFile(resolve(root, mirror(item)), 'utf8');
  await expect(verifyRawMirrors(root)).rejects.toThrow(`drift: ${mirror(item)}`);
  expect(await readFile(resolve(root, mirror(item)), 'utf8')).toBe(before);
});
it('requires explicit generation after a source edit and keeps nonmanaged files intact', async () => {
  const root = await fixture();
  const item = MANAGED_MIRRORS[0];
  const other = 'apps/web/public/data/wuwa/raw-materials.json';
  await put(root, other, ['Unreviewed content']);
  await put(root, source(item), [{ code: 'one', status: 'expired' }]);
  await expect(verifyRawMirrors(root)).rejects.toThrow('drift');
  await writeRawMirrors(root);
  await expect(verifyRawMirrors(root)).resolves.toHaveProperty('pairs', 5);
  expect(JSON.parse(await readFile(resolve(root, other), 'utf8'))).toEqual(['Unreviewed content']);
});
it('fails on missing or malformed output', async () => {
  const root = await fixture();
  await rm(resolve(root, mirror(MANAGED_MIRRORS[0])));
  await writeFile(resolve(root, mirror(MANAGED_MIRRORS[1])), '{');
  await expect(verifyRawMirrors(root)).rejects.toThrow('missing or invalid');
});
it('validates all inputs before writing any output', async () => {
  const root = await fixture();
  const first = MANAGED_MIRRORS[0];
  const last = MANAGED_MIRRORS.at(-1);
  const before = await readFile(resolve(root, mirror(first)), 'utf8');
  await put(root, source(first), [{ code: 'two' }]);
  for (const value of [[], {}, [{ id: '' }], [{ id: 'same' }, { id: 'same' }]]) {
    await put(root, source(last), value);
    await expect(writeRawMirrors(root)).rejects.toThrow();
    expect(await readFile(resolve(root, mirror(first)), 'utf8')).toBe(before);
  }
});
it('ignores object key order and preserves source dates on repeated generation', async () => {
  const root = await fixture();
  const item = MANAGED_MIRRORS[0];
  await put(root, source(item), [{ content: 'Existing copy', code: 'one' }]);
  await expect(verifyRawMirrors(root)).resolves.toHaveProperty('pairs', 5);
  await writeRawMirrors(root);
  const before = await readFile(resolve(root, mirror(item)), 'utf8');
  await writeRawMirrors(root);
  expect(await readFile(resolve(root, mirror(item)), 'utf8')).toBe(before);
});
