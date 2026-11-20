import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const report = import.meta.dirname, repo = resolve(report, '../..');
const require = createRequire(resolve(repo, 'apps/web/package.json'));
const sharp = createRequire(require.resolve('next'))('sharp');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = JSON.parse(readFileSync(resolve(report, 'image-sources.json')));
const parentBytes = readFileSync(resolve(repo, 'reports/genshin-specialty-characters-2026-11-20-r137/delivery.json'));
assert.equal(sha(parentBytes), sources.parentDeliveryPin);
const parent = JSON.parse(parentBytes);
const fixtureBytes = readFileSync(parent.fixture.path);
assert.equal(sha(fixtureBytes), parent.fixture.pin);
const fixture = JSON.parse(gunzipSync(fixtureBytes));
assert.deepEqual(sources.entries.map(row => row.localId), ['mualani', 'ororon']);
const save = (file, bytes) => {
  if (existsSync(file)) assert.equal(sha(readFileSync(file)), sha(bytes), `Refuse to replace different media: ${file}`);
  else writeFileSync(file, bytes, { flag: 'wx' });
};
const entries = [];
for (const row of sources.entries) {
  const profile = fixture.evidence.find(ref => ref.sourcePath === row.profile.sourcePath);
  assert(profile && sha(profile.text) === row.profile.sha256);
  const avatar = JSON.parse(profile.text).data;
  assert.equal(avatar.id, row.avatarId); assert.equal(avatar.icon, row.sourceIcon);
  assert.equal(row.source.url, `https://gi.yatta.moe/assets/UI/${avatar.icon}.png`);
  const source = readFileSync(resolve(report, `source/${row.localId}.png`));
  assert.equal(sha(source), row.source.sha256); assert.equal(source.length, row.source.bytes);
  const input = await sharp(source).metadata();
  assert.equal(input.format, 'png'); assert.equal(input.width, 256); assert.equal(input.height, 256);
  // WebP normalizes hidden RGB under fully transparent pixels. Compare every
  // visible RGB value and alpha byte, without formatting large Buffer diffs.
  const bytes = await sharp(source).webp({ lossless: true, effort: 6 }).toBuffer();
  const visible = rgba => {
    for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] === 0) rgba.fill(0, i, i + 3);
    return rgba;
  };
  assert.equal(sha(visible(await sharp(bytes).ensureAlpha().raw().toBuffer())),
    sha(visible(await sharp(source).ensureAlpha().raw().toBuffer())));
  const pathname = `/images/genshin/characters/${row.localId}.webp`;
  const ownerPath = `apps/game-genshin/public${pathname}`;
  assert(bytes.length < 512 * 1024);
  save(resolve(repo, ownerPath), bytes);
  entries.push({ localId: row.localId, avatarId: row.avatarId, sourceIcon: row.sourceIcon,
    profile: row.profile, source: { ...row.source, path: `source/${row.localId}.png` },
    pathname, url: `https://img.gachia.com${pathname}`, ownerPath,
    object: { bucket: 'gachia-images', key: pathname.slice(1) },
    sha256: sha(bytes), bytes: bytes.length, mime: 'image/webp', width: 256, height: 256,
    transform: { tool: 'sharp', version: sharp.versions.sharp, lossless: true, effort: 6,
      visiblePixelsAndAlphaIdentical: true, transparentRGB: 'encoder-normalized' },
    rights: 'game artwork reference; no ownership or license certification asserted' });
}
const result = { kind: 'genshin-character-media-r138', parentDeliveryPin: sources.parentDeliveryPin,
  entries, workerDeploymentRequiredForCDN: false, cmsWrites: false, publishable: false };
save(resolve(report, 'media-manifest.json'), Buffer.from(JSON.stringify(result, null, 2) + '\n'));
console.log(JSON.stringify({ entries: entries.map(({ localId, sha256, bytes, url }) => ({ localId, sha256, bytes, url })), visiblePixelsAndAlphaPreserved: true }, null, 2));
